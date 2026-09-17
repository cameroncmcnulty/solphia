import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import {
  buyCoin,
  createCoin,
  launchError,
  publicCoin,
  quotePreview,
  sellCoin,
  setOwnerWallet,
  withdrawDev,
  withdrawOwner,
  withdrawReferral,
} from "@/lib/launch/engine";
import { lastPairPrices } from "@/lib/tick";
import { liveBoosts, publicLiveBoost, tickBoosts } from "@/lib/launch/boost";
import { IMAGE_DATA_MAX, storedImage, validateLaunchCreate } from "@/lib/launch/validate";
import { pinDataUrl, pinJson } from "@/lib/pinata";
import { creditRank } from "@/lib/rank/engine";
import { SITE_URL } from "@/lib/config";
import { connection } from "@/lib/solana/connection";
import { buildPadMintTxs, padMintReady } from "@/lib/launch/onchain";
import { encodeTx } from "@/lib/token/mint";
import { tokenMetadataJson } from "@/lib/token/metadata";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum([
    "prepare",
    "confirm",
    "create",
    "buy",
    "sell",
    "quote",
    "withdraw_dev",
    "withdraw_owner",
    "withdraw_referral",
    "set_owner",
  ]),
  pubkey: z.string(),
  id: z.string().optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  blurb: z.string().optional(),
  image: z.string().max(IMAGE_DATA_MAX).optional(),
  website: z.string().optional(),
  x: z.string().optional(),
  telegram: z.string().optional(),
  discord: z.string().optional(),
  launchBuySol: z.number().optional(),
  sol: z.number().optional(),
  tokens: z.number().optional(),
  ownerWallet: z.string().optional(),
  adminSecret: z.string().optional(),
  mint: z.string().optional(),
  sigs: z.array(z.string().min(32).max(128)).max(8).optional(),
  uri: z.string().max(400).optional(),
});

function bookOf(s: { launch?: ReturnType<typeof emptyLaunchBook>; ownerWallet?: string }) {
  if (!s.launch) s.launch = emptyLaunchBook();
  if (s.ownerWallet && !s.launch.ownerWallet) s.launch.ownerWallet = s.ownerWallet;
  return s.launch;
}

function fail(code: string, status = 400) {
  return NextResponse.json({ error: code, message: launchError(code) }, { status });
}

type LaunchBody = z.infer<typeof Body>;

async function resolveArt(opts: { image?: string; name: string; symbol: string; blurb: string; website?: string; mint: string }) {
  let image = storedImage(opts.image);
  if (opts.image?.startsWith("data:")) {
    const pinned = await pinDataUrl(opts.image, opts.symbol);
    image = pinned?.url || "";
  }
  const json = tokenMetadataJson({
    name: opts.name,
    symbol: opts.symbol,
    description: opts.blurb || opts.name,
    image: image.startsWith("https://") ? image : "",
    website: opts.website,
  });
  const meta = await pinJson(json, `${opts.symbol}-meta`);
  const uri = meta?.url || `${SITE_URL.replace(/\/$/, "")}/api/launch/meta?mint=${encodeURIComponent(opts.mint)}`;
  return { image: image || storedImage(opts.image), uri };
}

async function prepareMint(b: LaunchBody) {
  const name = sanitizeText(b.name || "", 24);
  const symbol = sanitizeText(b.symbol || "", 10).toUpperCase();
  const blurb = sanitizeText(b.blurb || "", 280);
  const website = sanitizeText(b.website || "", 160);
  const issues = validateLaunchCreate({
    creator: b.pubkey,
    name,
    symbol,
    blurb,
    image: b.image,
    website,
    x: b.x,
    telegram: b.telegram,
    discord: b.discord,
    launchBuySol: Number(b.launchBuySol) || 0,
  });
  if (issues.wallet) return fail("bad_wallet");
  if (issues.name) return fail("bad_name");
  if (issues.symbol) return fail("bad_ticker");
  if (issues.image) return fail("bad_image");
  if (issues.launchBuySol) return fail("dev_buy_cap");
  if (issues.website || issues.x || issues.telegram || issues.discord) return fail("bad_link");
  if (!b.mint || !isSolanaAddress(b.mint)) return fail("bad_mint");
  const s = await withLaunch((st) => st, false);
  const book = bookOf(s);
  if (book.coins.some((c) => c.symbol === symbol && c.status === "curve")) return fail("ticker_taken");
  if (book.coins.some((c) => c.mint === b.mint)) return fail("mint_taken");
  let art: { image: string; uri: string };
  try {
    art = await resolveArt({ image: b.image, name, symbol, blurb, website, mint: b.mint });
  } catch {
    return fail("chain_failed");
  }
  try {
    const set = await buildPadMintTxs({
      conn: connection(),
      payer: b.pubkey,
      mint: new PublicKey(b.mint),
      name,
      symbol,
      uri: art.uri,
    });
    return NextResponse.json({
      ok: true,
      mint: set.mint,
      txs: set.txs.map(encodeTx),
      uri: art.uri,
      image: art.image,
    });
  } catch {
    return fail("chain_failed");
  }
}

async function confirmMint(b: LaunchBody, solUsd: number) {
  const name = sanitizeText(b.name || "", 24);
  const symbol = sanitizeText(b.symbol || "", 10).toUpperCase();
  if (!b.mint || !isSolanaAddress(b.mint)) return fail("bad_mint");
  let ready = await padMintReady(connection(), b.mint);
  for (let i = 0; i < 6 && !ready.ok; i++) {
    await new Promise((r) => setTimeout(r, 800));
    ready = await padMintReady(connection(), b.mint);
  }
  if (!ready.ok) return fail(ready.error);
  let image = storedImage(b.image);
  if (b.image?.startsWith("data:")) {
    const pinned = await pinDataUrl(b.image, symbol);
    if (pinned) image = pinned.url;
  }
  let bookSnap: ReturnType<typeof emptyLaunchBook> | undefined;
  const out = await withLaunch((s) => {
    const book = bookOf(s);
    bookSnap = book;
    const made = createCoin(book, {
      creator: b.pubkey,
      name,
      symbol,
      blurb: sanitizeText(b.blurb || "", 280),
      image,
      website: sanitizeText(b.website || "", 160),
      x: sanitizeText(b.x || "", 80),
      telegram: sanitizeText(b.telegram || "", 80),
      discord: sanitizeText(b.discord || "", 120),
      launchBuySol: Number(b.launchBuySol) || 0,
      mint: b.mint,
    });
    if (made.ok) creditRank(book, b.pubkey, "launch");
    return made;
  }, true);
  if (!out || !("ok" in out) || !out.ok) {
    return fail((out as { error?: string })?.error || "failed");
  }
  if ("coin" in out && out.coin) {
    return NextResponse.json({
      ok: true,
      coin: publicCoin(out.coin, solUsd, b.pubkey, bookSnap),
      mint: b.mint,
      sigs: b.sigs || [],
    });
  }
  return NextResponse.json(out);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  const viewer = req.nextUrl.searchParams.get("pubkey") || "";
  const s = await withLaunch((st) => st, false);
  const book = bookOf(s);
  const solUsd = lastPairPrices().solUsd || 0;
  if (id) {
    const coin = book.coins.find((c) => c.id === id);
    if (!coin) return fail("not_found", 404);
    return NextResponse.json({ coin: publicCoin(coin, solUsd, viewer, book), solUsd });
  }
  tickBoosts(book);
  return NextResponse.json({
    coins: book.coins.slice(0, 80).map((c) => publicCoin(c, solUsd, viewer, book)),
    solUsd,
    ownerWallet: book.ownerWallet || null,
    ownerEarningsSol: book.ownerEarningsSol,
    boosts: liveBoosts(book).map((b) => publicLiveBoost(b)),
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":launch", 20, 60_000)) {
    return fail("rate_limited", 429);
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const img = parsed.error.issues.some((i) => i.path.includes("image"));
    return fail(img ? "bad_image" : "bad_request");
  }
  if (!isSolanaAddress(parsed.data.pubkey)) {
    return fail("bad_wallet");
  }
  const b = parsed.data;
  const solUsd = lastPairPrices().solUsd || 0;

  if (b.action === "prepare") {
    return prepareMint(b);
  }
  if (b.action === "confirm") {
    return confirmMint(b, solUsd);
  }
  if (b.action === "create") {
    return fail("onchain_required");
  }

  if (b.action === "quote") {
    const s = await withLaunch((st) => st, false);
    const coin = bookOf(s).coins.find((c) => c.id === b.id);
    if (!coin) return fail("not_found", 404);
    const q = quotePreview(coin, b.tokens ? "sell" : "buy", b.tokens || b.sol || 0);
    return NextResponse.json({ quote: q, coin: publicCoin(coin, solUsd, b.pubkey, bookOf(s)) });
  }

  let bookSnap: ReturnType<typeof emptyLaunchBook> | undefined;
  const out = await withLaunch((s) => {
    const book = bookOf(s);
    bookSnap = book;
    if (b.action === "buy") {
      const bought = buyCoin(book, { id: b.id || "", owner: b.pubkey, sol: Number(b.sol) || 0 });
      if (bought.ok) creditRank(book, b.pubkey, "swap", { sol: Number(b.sol) || 0 });
      return bought;
    }
    if (b.action === "sell") {
      const sold = sellCoin(book, { id: b.id || "", owner: b.pubkey, tokens: Number(b.tokens) || 0 });
      if (sold.ok) creditRank(book, b.pubkey, "swap");
      return sold;
    }
    if (b.action === "withdraw_dev") return withdrawDev(book, { id: b.id || "", owner: b.pubkey });
    if (b.action === "withdraw_owner") return withdrawOwner(book, { owner: b.pubkey });
    if (b.action === "withdraw_referral") return withdrawReferral(book, { owner: b.pubkey });
    if (b.action === "set_owner") {
      const secret = process.env.ADMIN_SECRET || "";
      if (!secret || b.adminSecret !== secret) return { ok: false as const, error: "admin_only" };
      const r = setOwnerWallet(book, b.ownerWallet || "");
      if (r.ok) s.ownerWallet = book.ownerWallet;
      return r;
    }
    return { ok: false as const, error: "bad_action" };
  }, true);

  if (!out || !("ok" in out) || !out.ok) {
    return fail((out as { error?: string })?.error || "failed");
  }
  if ("coin" in out && out.coin) {
    return NextResponse.json({
      ok: true,
      coin: publicCoin(out.coin, solUsd, b.pubkey, bookSnap),
      fill: "fill" in out ? out.fill : undefined,
    });
  }
  return NextResponse.json(out);
}
