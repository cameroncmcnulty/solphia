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
import { storedImage, validateLaunchCreate } from "@/lib/launch/validate";
import { ipfsMetadataUrl, pinDataUrl, pinJson } from "@/lib/pinata";
import { creditRank } from "@/lib/rank/engine";
import { tokenMetadataJson } from "@/lib/token/metadata";
import {
  buildPadLaunchTx,
  buildPadTradeTx,
  hydratePadCoins,
  padCurveReady,
  waitForPadCurve,
  quotePadTrade,
} from "@/lib/launch/program";
import { mintPda, nonceFromB64 } from "@/lib/launch/pda";
import { dbcEnabled, LEGACY_DBC_CONFIG } from "@/lib/launch/dbcIds";
import { connection, waitForSignature } from "@/lib/solana/connection";
import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function dbcApi() {
  return import("@/lib/launch/dbc");
}

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
    "withdraw_partner",
    "withdraw_owner",
    "withdraw_referral",
    "set_owner",
    "dbc_config",
    "confirm_dbc_config",
  ]),
  pubkey: z.string(),
  id: z.string().optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  blurb: z.string().optional(),
  image: z.string().max(400_000).optional(),
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
  nonce: z.string().max(24).optional(),
  sigs: z.array(z.string().max(128)).max(8).optional(),
  sig: z.string().max(128).optional(),
  uri: z.string().max(512).optional(),
  side: z.enum(["buy", "sell"]).optional(),
  feeSol: z.number().optional(),
  referrer: z.string().max(64).optional(),
  config: z.string().optional(),
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

function dataMime(dataUrl?: string): string | undefined {
  const s = (dataUrl || "").slice(5, (dataUrl || "").indexOf(","));
  const mime = (s.split(";")[0] || "").trim();
  return mime.startsWith("image/") ? mime : undefined;
}

async function resolveArt(opts: { image?: string; name: string; symbol: string; blurb: string; website?: string; mint: string }) {
  let image = storedImage(opts.image);
  const mime = dataMime(opts.image);
  if (opts.image?.startsWith("data:")) {
    const pinned = await pinDataUrl(opts.image, opts.symbol);
    if (!pinned?.url) throw new Error("pin_failed");
    const ext = mime?.includes("jpeg") || mime?.includes("jpg") ? "jpg" : mime?.includes("webp") ? "webp" : "png";
    image = ipfsMetadataUrl(pinned.cid, ext);
  }
  if (!image.startsWith("https://")) throw new Error("pin_failed");
  const json = tokenMetadataJson({
    name: opts.name,
    symbol: opts.symbol,
    description: opts.blurb || opts.name,
    image,
    website: opts.website,
    mime,
  });
  const meta = await pinJson(json, `${opts.symbol}-meta`);
  if (!meta?.cid) throw new Error("pin_failed");
  return { image, uri: ipfsMetadataUrl(meta.cid, "json") };
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
  const useDbc = dbcEnabled();
  let mint = "";
  let nonce = nonceFromB64(b.nonce || "");
  if (useDbc) {
    if (!b.mint || !isSolanaAddress(b.mint)) return fail("bad_mint");
    mint = b.mint;
  } else {
    if (!nonce) return fail("bad_mint");
    mint = mintPda(b.pubkey, nonce).toBase58();
    if (b.mint && b.mint !== mint) return fail("bad_mint");
  }
  const s = await withLaunch((st) => st, false);
  const book = bookOf(s);
  if (book.coins.some((c) => c.symbol === symbol && c.status === "curve")) return fail("ticker_taken");
  if (book.coins.some((c) => c.mint === mint)) return fail("mint_taken");
  try {
    const dbcMod = await dbcApi();
    if (useDbc && !dbcMod.liveDbcConfig(book.dbcConfig || b.config)) {
      const cfg = await dbcMod.buildDbcCreateConfigTx({ owner: b.pubkey });
      return NextResponse.json({
        ok: true,
        step: "config",
        mint,
        tx: cfg.transaction,
        txs: [cfg.transaction],
        config: cfg.config,
        configSecret: cfg.configSecret,
      });
    }
    let art: { image: string; uri: string };
    try {
      art = await resolveArt({ image: b.image, name, symbol, blurb, website, mint });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "pin_failed") return fail("pin_failed");
      return fail("chain_failed");
    }
    const built = useDbc
      ? await dbcMod.buildDbcLaunchTx({
          payer: b.pubkey,
          mint,
          name,
          symbol,
          uri: art.uri,
          buySol: Number(b.launchBuySol) || 0,
          config: book.dbcConfig || b.config,
        })
      : await buildPadLaunchTx({
          payer: b.pubkey,
          nonce: nonce!,
          name,
          symbol,
          uri: art.uri,
          buySol: Number(b.launchBuySol) || 0,
          referrer: book.accounts?.[b.pubkey]?.referrer,
        });
    if (typeof built.transaction !== "string" || built.transaction.length < 32) {
      return NextResponse.json({ error: "chain_failed", message: "Launch builder did not encode a transaction." }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      mint: built.mint,
      tx: built.transaction,
      txs: [built.transaction],
      uri: art.uri,
      image: art.image,
      tokensOut: built.tokensOut,
      config: "config" in built ? built.config : undefined,
      configSecret: "configSecret" in built ? built.configSecret : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the launch.";
    return NextResponse.json({ error: "chain_failed", message }, { status: 400 });
  }
}

async function confirmMint(b: LaunchBody, solUsd: number) {
  const name = sanitizeText(b.name || "", 24);
  const symbol = sanitizeText(b.symbol || "", 10).toUpperCase();
  if (!b.mint || !isSolanaAddress(b.mint)) return fail("bad_mint");
  let liveCurve: import("@/lib/launch/curve").CurveState | undefined;
  if (dbcEnabled()) {
    const sig = b.sigs?.[0] || b.sig || "";
    if (sig) {
      const landed = await waitForSignature(sig, 45);
      if (landed.err && landed.err !== "timeout" && landed.err !== "missing") {
        return NextResponse.json({ error: "chain_failed", message: "The launch transaction failed on Solana." }, { status: 400 });
      }
    }
    const pool = await (await dbcApi()).waitForDbcPool(b.mint, 32);
    if (!pool) {
      const info = await connection().getAccountInfo(new PublicKey(b.mint));
      if (!info) return fail("curve_missing");
    }
  } else {
    const ready = await waitForPadCurve(b.mint, b.sigs?.[0] || b.sig);
    if (!ready.ok) return fail(ready.error);
    liveCurve = ready.curve;
  }
  let image = storedImage(b.image);
  if (b.image?.startsWith("data:")) {
    const pinned = await pinDataUrl(b.image, symbol);
    if (pinned) image = pinned.url;
  }
  let bookSnap: ReturnType<typeof emptyLaunchBook> | undefined;
  const out = await withLaunch((s) => {
    const book = bookOf(s);
    bookSnap = book;
    const cfg = (b.config || "").trim();
    if (cfg && isSolanaAddress(cfg) && cfg !== LEGACY_DBC_CONFIG) {
      book.dbcConfig = cfg;
    }
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
      referrer: b.referrer,
    });
    if (made.ok) {
      if (liveCurve) applyCurveState(made.coin, liveCurve);
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
  try {
    return await getLaunch(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "launch get failed";
    return NextResponse.json({ error: "failed", message }, { status: 500 });
  }
}

async function getLaunch(req: NextRequest) {
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
  const listed = viewer
    ? book.coins.filter((c) => c.creator === viewer)
    : book.coins;
  const rows = listed.slice(0, 80).map((c) => publicCoin(c, solUsd, viewer, book));
  if (dbcEnabled()) {
    try {
      const fees = await (await dbcApi()).dbcFeesForMints(rows.map((c) => c.mint || "").filter(Boolean));
      for (const row of rows) {
        const f = row.mint ? fees[row.mint] : undefined;
        if (!f) continue;
        Object.assign(row, f);
      }
    } catch {
      /* tape still useful */
    }
  }
  const dbc = await dbcApi();
  return NextResponse.json({
    coins: rows,
    solUsd,
    ownerWallet: book.ownerWallet || null,
    ownerEarningsSol: book.ownerEarningsSol,
    boosts: liveBoosts(book).map((b) => publicLiveBoost(b)),
    dbcConfig: dbc.liveDbcConfig(book.dbcConfig),
    needsNewCurve: dbcEnabled() && dbc.curveNeedsInstall(book.dbcConfig),
  });
}

export async function POST(req: NextRequest) {
  try {
    return await postLaunch(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "launch post failed";
    return NextResponse.json({ error: "failed", message }, { status: 500 });
  }
}

async function postLaunch(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":launch", 20, 60_000)) {
    return fail("rate_limited", 429);
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const img = parsed.error.issues.some((i) => i.path.includes("image"));
    const first = parsed.error.issues[0];
    const message = first?.message && first.message !== "Required" ? first.message : undefined;
    if (img) return fail("bad_image");
    if (message) return NextResponse.json({ error: "bad_request", message }, { status: 400 });
    return fail("bad_request");
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
    const book = bookOf(s);
    const coin = book.coins.find((c) => c.id === b.id || (b.mint && c.mint === b.mint));
    const mint = coin?.mint || b.mint || "";
    const dbc = mint && isSolanaAddress(mint) ? await (await dbcApi()).quoteDbcTrade({ mint, side: b.tokens ? "sell" : "buy", sol: b.sol, tokens: b.tokens }) : { ok: false as const, error: "curve_missing" };
    if (dbc.ok) {
      return NextResponse.json({
        quote: dbc,
        coin: coin ? publicCoin(coin, solUsd, b.pubkey, book) : undefined,
      });
    }
    const live = mint && isSolanaAddress(mint) ? await padCurveReady(mint) : { ok: false as const, error: "curve_missing" };
    if (coin?.venue === "solphia" || coin?.venue === "pump" || live.ok) {
      const q = await quotePadTrade({
        mint,
        owner: b.pubkey,
        side: b.tokens ? "sell" : "buy",
        sol: b.sol,
        tokens: b.tokens,
      });
      if (!q.ok) return fail(q.error);
      return NextResponse.json({
        quote: q,
        coin: coin ? publicCoin(coin, solUsd, b.pubkey, book) : undefined,
      });
    }
    if (!coin) return fail("not_found", 404);
    const q = quotePreview(coin, b.tokens ? "sell" : "buy", b.tokens || b.sol || 0);
    return NextResponse.json({ quote: q, coin: publicCoin(coin, solUsd, b.pubkey, book) });
  }

  if (b.action === "buy" || b.action === "sell") {
    const snap = await withLaunch((st) => st, false);
    const coin = bookOf(snap).coins.find((c) => c.id === b.id || (b.mint && c.mint === b.mint));
    const mint = coin?.mint || b.mint || "";
    if (mint && isSolanaAddress(mint) && dbcEnabled()) {
      const built = await (await dbcApi()).buildDbcTradeTx({
        mint,
        owner: b.pubkey,
        side: b.action,
        sol: b.sol,
        tokens: b.tokens,
      });
      if (built.ok) {
        return NextResponse.json({
          ok: true,
          needsSign: true,
          transaction: built.transaction,
          tokensOut: built.tokensOut,
          solOut: built.solOut,
          sol: b.sol,
          tokens: b.tokens,
          feeSol: built.feeSol,
          coin: coin ? publicCoin(coin, solUsd, b.pubkey, bookOf(snap)) : undefined,
        });
      }
    }
    const live = mint && isSolanaAddress(mint) ? await padCurveReady(mint) : { ok: false as const, error: "curve_missing" };
    if (coin?.venue === "solphia" || coin?.venue === "pump" || live.ok) {
      const built = await buildPadTradeTx({
        mint,
        owner: b.pubkey,
        creator: coin?.creator || (live.ok ? live.creator : b.pubkey),
        side: b.action,
        sol: b.sol,
        tokens: b.tokens,
        referrer: coin?.referrer,
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
        coin: coin ? publicCoin(coin, solUsd, b.pubkey, bookOf(snap)) : undefined,
      });
    }
    if (!coin) return fail("not_found", 404);
  }

  if (b.action === "confirm_dbc_config") {
    const cfg = (b.config || b.mint || "").trim();
    if (!isSolanaAddress(cfg)) return fail("bad_mint");
    await withLaunch((st) => {
      const book = bookOf(st);
      if (book.ownerWallet && book.ownerWallet !== b.pubkey) return;
      book.dbcConfig = cfg;
    }, true);
    return NextResponse.json({ ok: true, dbcConfig: cfg });
  }

  if (b.action === "withdraw_dev") {
    const snap = await withLaunch((st) => st, false);
    const coin = bookOf(snap).coins.find((c) => c.id === b.id || (b.mint && c.mint === b.mint));
    if (!coin) return fail("not_found", 404);
    if (coin.creator !== b.pubkey) return fail("not_creator");
    if (dbcEnabled() && coin.mint && isSolanaAddress(coin.mint)) {
      const built = await (await dbcApi()).buildDbcClaimCreatorTx({ mint: coin.mint, owner: b.pubkey });
      if (!built.ok) return fail(built.error);
      return NextResponse.json({
        ok: true,
        needsSign: true,
        claim: true,
        transaction: built.transaction,
        coin: publicCoin(coin, solUsd, b.pubkey, bookOf(snap)),
      });
    }
  }

  if (b.action === "withdraw_partner") {
    const snap = await withLaunch((st) => st, false);
    const book = bookOf(snap);
    const coin = book.coins.find((c) => c.id === b.id || (b.mint && c.mint === b.mint));
    if (!coin) return fail("not_found", 404);
    if (book.ownerWallet && book.ownerWallet !== b.pubkey) return fail("not_owner");
    if (dbcEnabled() && coin.mint && isSolanaAddress(coin.mint)) {
      const built = await (await dbcApi()).buildDbcClaimPartnerTx({ mint: coin.mint, owner: b.pubkey });
      if (!built.ok) return fail(built.error);
      return NextResponse.json({
        ok: true,
        needsSign: true,
        claim: true,
        partner: true,
        transaction: built.transaction,
        coin: publicCoin(coin, solUsd, b.pubkey, book),
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
