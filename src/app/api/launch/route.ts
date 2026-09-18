import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import {
  applyCurveState,
  buyCoin,
  createCoin,
  launchError,
  publicCoin,
  quotePreview,
  recordOnchainFill,
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
import { tokenMetadataJson } from "@/lib/token/metadata";
import {
  buildPadLaunchTx,
  buildPadTradeTx,
  hydratePadCoins,
  waitForPadCurve,
  quotePadTrade,
} from "@/lib/launch/program";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  action: z.enum([
    "prepare",
    "confirm",
    "create",
    "buy",
    "sell",
    "trade_confirm",
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
  sig: z.string().min(32).max(128).optional(),
  uri: z.string().max(400).optional(),
  side: z.enum(["buy", "sell"]).optional(),
  feeSol: z.number().optional(),
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
    const built = await buildPadLaunchTx({
      payer: b.pubkey,
      mint: b.mint,
      name,
      symbol,
      uri: art.uri,
      buySol: Number(b.launchBuySol) || 0,
      referrer: book.accounts?.[b.pubkey]?.referrer,
    });
    return NextResponse.json({
      ok: true,
      mint: built.mint,
      tx: built.transaction,
      txs: [built.transaction],
      uri: art.uri,
      image: art.image,
      tokensOut: built.tokensOut,
    });
  } catch {
    return fail("chain_failed");
  }
}

async function confirmMint(b: LaunchBody, solUsd: number) {
  const name = sanitizeText(b.name || "", 24);
  const symbol = sanitizeText(b.symbol || "", 10).toUpperCase();
  if (!b.mint || !isSolanaAddress(b.mint)) return fail("bad_mint");
  const ready = await waitForPadCurve(b.mint, b.sigs?.[0] || b.sig);
  if (!ready.ok) return fail(ready.error);
  const liveCurve = ready.curve;
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
      venue: "solphia",
    });
    if (made.ok) {
      applyCurveState(made.coin, liveCurve);
      const buySol = Number(b.launchBuySol) || 0;
      const tokensOut = Number(b.tokens) || 0;
      if (buySol > 0 && tokensOut > 0) {
        recordOnchainFill(book, {
          id: made.coin.id,
          owner: b.pubkey,
          side: "buy",
          sol: buySol,
          tokens: tokensOut,
        });
      }
      creditRank(book, b.pubkey, "launch");
    }
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
  await hydratePadCoins(book.coins);
  const solUsd = lastPairPrices().solUsd || 0;
  if (id) {
    const coin = book.coins.find((c) => c.id === id || c.mint === id);
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
    if (coin.venue === "solphia" || coin.venue === "pump") {
      const q = await quotePadTrade({
        mint: coin.mint,
        owner: b.pubkey,
        side: b.tokens ? "sell" : "buy",
        sol: b.sol,
        tokens: b.tokens,
      });
      if (!q.ok) return fail(q.error);
      return NextResponse.json({ quote: q, coin: publicCoin(coin, solUsd, b.pubkey, bookOf(s)) });
    }
    const q = quotePreview(coin, b.tokens ? "sell" : "buy", b.tokens || b.sol || 0);
    return NextResponse.json({ quote: q, coin: publicCoin(coin, solUsd, b.pubkey, bookOf(s)) });
  }

  if (b.action === "buy" || b.action === "sell") {
    const snap = await withLaunch((st) => st, false);
    const coin = bookOf(snap).coins.find((c) => c.id === b.id);
    if (!coin) return fail("not_found", 404);
    if (coin.venue === "solphia" || coin.venue === "pump") {
      const built = await buildPadTradeTx({
        mint: coin.mint,
        owner: b.pubkey,
        creator: coin.creator,
        side: b.action,
        sol: b.sol,
        tokens: b.tokens,
        referrer: coin.referrer,
      });
      if (!built.ok) return fail(built.error);
      return NextResponse.json({
        ok: true,
        needsSign: true,
        transaction: built.transaction,
        tokensOut: built.tokensOut,
        solOut: built.solOut,
        sol: built.sol,
        tokens: built.tokens,
        feeSol: built.feeSol,
        coin: publicCoin(coin, solUsd, b.pubkey, bookOf(snap)),
      });
    }
  }

  if (b.action === "trade_confirm") {
    const mint = b.mint || "";
    const out = await withLaunch(async (s) => {
      const book = bookOf(s);
      const coin = book.coins.find((c) => c.id === b.id || (mint && c.mint === mint));
      if (!coin) return { ok: false as const, error: "not_found" };
      const side = b.side || (b.tokens ? "sell" : "buy");
      const sol = Number(b.sol) || 0;
      const tokens = Number(b.tokens) || 0;
      const rec = recordOnchainFill(book, {
        id: coin.id,
        owner: b.pubkey,
        side,
        sol,
        tokens,
        feeSol: Number(b.feeSol) || undefined,
      });
      if (rec.ok) {
        creditRank(book, b.pubkey, "swap", { sol: side === "buy" ? sol : 0 });
        await hydratePadCoins([rec.coin]);
      }
      return rec;
    }, true);
    if (!out || !("ok" in out) || !out.ok) return fail((out as { error?: string })?.error || "failed");
    const bookSnap = await withLaunch((st) => bookOf(st), false);
    const coin = bookSnap.coins.find((c) => c.id === b.id || (mint && c.mint === mint));
    return NextResponse.json({
      ok: true,
      coin: coin ? publicCoin(coin, solUsd, b.pubkey, bookSnap) : undefined,
      fill: "fill" in out ? out.fill : undefined,
      sig: b.sig,
    });
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
