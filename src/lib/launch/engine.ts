import { isSolanaAddress } from "../security";
import {
  ANTI_SNIPE_MS,
  ANTI_SNIPE_SOL,
  CURVE_SALE,
  emptyCurve,
  graduatePool,
  launchDevBuyCap,
  marketCapSol,
  maxBuySol,
  MAX_WALLET_BPS,
  MIN_TRADE_SOL,
  progressPct,
  quoteBuy,
  quoteSell,
  spotPriceSol,
  TOKEN_SUPPLY,
  type CurveState,
} from "./curve";
import { socialHref } from "./links";
import { imageOk, validateLaunchCreate } from "./validate";

export { launchError, LAUNCH_ERRORS } from "./errors";
export { imageOk, nameOk, tickerOk, validateLaunchCreate } from "./validate";

export type LaunchStatus = "curve" | "graduated";

export type LaunchHolder = {
  owner: string;
  tokens: number;
  spentSol: number;
  receivedSol: number;
};

export type LaunchFill = {
  id: string;
  at: number;
  owner: string;
  side: "buy" | "sell";
  sol: number;
  tokens: number;
  feeSol: number;
  priceSol: number;
};

export type LaunchLinks = {
  website?: string;
  x?: string;
  telegram?: string;
  discord?: string;
};

export type LaunchCoin = {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  blurb: string;
  links: LaunchLinks;
  mintAuthority: "revoked";
  freezeAuthority: "revoked";
  creator: string;
  createdAt: number;
  curve: CurveState;
  status: LaunchStatus;
  holders: Record<string, LaunchHolder>;
  fills: LaunchFill[];
  devRewardsSol: number;
  ownerFeesSol: number;
  treasuryFeesSol: number;
  graduatedAt?: number;
  pool?: { sol: number; tokens: number };
};

export type LaunchBook = {
  coins: LaunchCoin[];
  ownerWallet: string;
  ownerEarningsSol: number;
  treasuryFeesSol: number;
};

export function emptyLaunchBook(): LaunchBook {
  return { coins: [], ownerWallet: "", ownerEarningsSol: 0, treasuryFeesSol: 0 };
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanLink(raw?: string, kind?: "website" | "x" | "telegram" | "discord"): string {
  return socialHref(kind || "website", raw);
}

export type SparkCandle = { t: number; o: number; h: number; l: number; c: number; v: number };

export function sparkCandles(fills: LaunchFill[], createdAt: number, startPx: number, now = Date.now()): SparkCandle[] {
  const span = Math.max(60_000, now - createdAt);
  const buckets = 24;
  const w = span / buckets;
  const start = now - w * buckets;
  const out: SparkCandle[] = [];
  let last = startPx;
  for (let i = 0; i < buckets; i++) {
    const a = start + i * w;
    const b = a + w;
    const xs = fills.filter((f) => f.at >= a && f.at < b);
    if (!xs.length) {
      out.push({ t: a, o: last, h: last, l: last, c: last, v: 0 });
      continue;
    }
    const o = last;
    const close = xs[xs.length - 1].priceSol;
    const h = Math.max(o, ...xs.map((f) => f.priceSol));
    const l = Math.min(o, ...xs.map((f) => f.priceSol));
    const v = xs.reduce((s, f) => s + f.sol, 0);
    out.push({ t: a, o, h, l, c: close, v });
    last = close;
  }
  return out;
}

function pxAt(fills: LaunchFill[], before: number, fallback: number): number {
  for (let i = fills.length - 1; i >= 0; i--) {
    if (fills[i].at <= before) return fills[i].priceSol;
  }
  return fills[0]?.priceSol || fallback;
}

export function slimLaunch(book: LaunchBook): LaunchBook {
  return {
    ...book,
    coins: (book.coins || []).slice(0, 120).map((c) => ({
      ...c,
      image: (c.image || "").length > 90_000 ? "" : c.image,
      fills: (c.fills || []).slice(-200),
    })),
  };
}

export function mergeLaunch(local: LaunchBook, remote: LaunchBook): LaunchBook {
  const map = new Map<string, LaunchCoin>();
  for (const c of remote.coins || []) map.set(c.id, c);
  for (const c of local.coins || []) {
    const r = map.get(c.id);
    if (!r) {
      map.set(c.id, c);
      continue;
    }
    const localF = c.fills?.length || 0;
    const remoteF = r.fills?.length || 0;
    const localSol = c.curve?.realSol || 0;
    const remoteSol = r.curve?.realSol || 0;
    if (localF > remoteF || (localF === remoteF && localSol >= remoteSol)) map.set(c.id, c);
  }
  const coins = [...map.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 120);
  return {
    coins,
    ownerWallet: local.ownerWallet || remote.ownerWallet,
    ownerEarningsSol: Math.max(local.ownerEarningsSol || 0, remote.ownerEarningsSol || 0),
    treasuryFeesSol: Math.max(local.treasuryFeesSol || 0, remote.treasuryFeesSol || 0),
  };
}

function windowFlow(fills: LaunchFill[], now: number, ms: number) {
  let sol = 0;
  let buys = 0;
  let sells = 0;
  let txns = 0;
  const uniq = new Set<string>();
  for (const f of fills) {
    if (now - f.at > ms) continue;
    sol += f.sol;
    txns += 1;
    if (f.side === "buy") buys += 1;
    else sells += 1;
    if (f.owner) uniq.add(f.owner);
  }
  return { sol, buys, sells, txns, unique: uniq.size };
}

function holderMix(c: LaunchCoin) {
  const live = Object.values(c.holders).filter((h) => h.tokens > 1e-9);
  const sold = Math.max(c.curve.tokensSold, live.reduce((s, h) => s + h.tokens, 0), 1);
  const ranked = live.slice().sort((a, b) => b.tokens - a.tokens);
  const top10 = ranked.slice(0, 10).reduce((s, h) => s + h.tokens, 0);
  const biggest = ranked[0]?.tokens || 0;
  const creatorTok = c.holders[c.creator]?.tokens || 0;
  const nonDev = ranked.find((h) => h.owner !== c.creator);
  return {
    holders: live.length,
    top10HolderPct: (top10 / sold) * 100,
    largestWalletPct: (biggest / sold) * 100,
    creatorHoldPct: (creatorTok / sold) * 100,
    bundleRatio: nonDev ? nonDev.tokens / sold : 0,
  };
}

function creatorDump(c: LaunchCoin) {
  const fills = c.fills || [];
  let bought = 0;
  let sold = 0;
  for (const f of fills) {
    if (f.owner !== c.creator) continue;
    if (f.side === "buy") bought += f.tokens;
    else sold += f.tokens;
  }
  if (bought <= 0) return 0;
  return Math.min(1, sold / bought);
}

function deployerMeta(book: LaunchBook | undefined, creator: string, now: number) {
  const theirs = (book?.coins || []).filter((c) => c.creator === creator);
  if (!theirs.length) return { deployerTokenCount: 1, deployerDeathRate: 0, creatorRecentLaunches: 1 };
  const dead = theirs.filter((c) => {
    const live = Object.values(c.holders || {}).filter((h) => h.tokens > 1e-9);
    return now - c.createdAt > 2 * 60 * 60_000 && (c.curve?.realSol || 0) < 0.2 && live.length <= 1;
  });
  return {
    deployerTokenCount: theirs.length,
    deployerDeathRate: dead.length / theirs.length,
    creatorRecentLaunches: theirs.filter((c) => now - c.createdAt < 24 * 60 * 60_000).length,
  };
}

export function publicCoin(c: LaunchCoin, solUsd = 0, viewer?: string, book?: LaunchBook, now = Date.now()) {
  const px = spotPriceSol(c.curve);
  const mc = marketCapSol(c.curve);
  const fills = c.fills || [];
  const startPx = fills[0]?.priceSol || px;
  const volBuy = fills.filter((f) => f.side === "buy").reduce((s, f) => s + f.sol, 0);
  const volSell = fills.filter((f) => f.side === "sell").reduce((s, f) => s + f.sol, 0);
  const liveHolders = Object.values(c.holders).filter((h) => h.tokens > 1e-9);
  const mine = viewer ? c.holders[viewer] : undefined;
  const mix = holderMix(c);
  const w5 = windowFlow(fills, now, 5 * 60_000);
  const w30 = windowFlow(fills, now, 30 * 60_000);
  const w1 = windowFlow(fills, now, 60 * 60_000);
  const w6 = windowFlow(fills, now, 6 * 60 * 60_000);
  const w24 = windowFlow(fills, now, 24 * 60 * 60_000);
  const allUniq = new Set(fills.map((f) => f.owner).filter(Boolean));
  const dep = deployerMeta(book, c.creator, now);
  const ch = (ms: number) => {
    const base = pxAt(fills, now - ms, startPx);
    return base > 0 ? px / base - 1 : 0;
  };
  return {
    id: c.id,
    mint: c.mint,
    name: c.name,
    symbol: c.symbol,
    image: c.image || "",
    blurb: c.blurb,
    links: c.links || {},
    mintAuthority: "revoked" as const,
    freezeAuthority: "revoked" as const,
    creator: c.creator,
    createdAt: c.createdAt,
    status: c.status,
    priceSol: px,
    marketCapSol: mc,
    marketCapUsd: solUsd > 0 ? mc * solUsd : 0,
    progress: progressPct(c.curve),
    realSol: c.curve.realSol,
    liqSol: c.curve.realSol,
    tokensSold: c.curve.tokensSold,
    holders: liveHolders.length,
    fills: fills.slice(-48).reverse().map((f) => ({
      at: f.at,
      side: f.side,
      sol: f.sol,
      tokens: f.tokens,
      owner: f.owner,
    })),
    spark: sparkCandles(fills, c.createdAt, startPx, now),
    volSol: volBuy + volSell,
    volBuySol: volBuy,
    volSellSol: volSell,
    vol5m: w5.sol,
    vol30m: w30.sol,
    vol1h: w1.sol,
    vol6h: w6.sol,
    vol24h: w24.sol,
    txns: fills.length,
    txns5m: w5.txns,
    txns1h: w1.txns,
    buys: fills.filter((f) => f.side === "buy").length,
    sells: fills.filter((f) => f.side === "sell").length,
    buys1h: w1.buys,
    sells1h: w1.sells,
    unique1h: w1.unique,
    uniqueAll: allUniq.size || liveHolders.length,
    top10HolderPct: mix.top10HolderPct,
    largestWalletPct: mix.largestWalletPct,
    creatorHoldPct: mix.creatorHoldPct,
    bundleRatio: mix.bundleRatio,
    devSoldPct: creatorDump(c),
    deployerTokenCount: dep.deployerTokenCount,
    deployerDeathRate: dep.deployerDeathRate,
    creatorRecentLaunches: dep.creatorRecentLaunches,
    ageMs: Math.max(0, now - c.createdAt),
    change5m: ch(5 * 60_000),
    change1h: ch(60 * 60_000),
    change6h: ch(6 * 60 * 60_000),
    change24h: ch(24 * 60 * 60_000),
    devRewardsSol: c.devRewardsSol,
    graduatedAt: c.graduatedAt || null,
    myTokens: mine?.tokens || 0,
    mySpentSol: mine?.spentSol || 0,
    maxBuySol: maxBuySol(c.curve, mine?.tokens || 0),
    curve: {
      virtualSol: c.curve.virtualSol,
      virtualTokens: c.curve.virtualTokens,
      realSol: c.curve.realSol,
      tokensSold: c.curve.tokensSold,
      phase: c.curve.phase,
    },
  };
}

export function createCoin(
  book: LaunchBook,
  opts: {
    creator: string;
    name: string;
    symbol: string;
    blurb?: string;
    image?: string;
    website?: string;
    x?: string;
    telegram?: string;
    discord?: string;
    launchBuySol?: number;
    now?: number;
  },
): { ok: true; coin: LaunchCoin } | { ok: false; error: string } {
  const issues = validateLaunchCreate(opts);
  if (issues.wallet) return { ok: false, error: "bad_wallet" };
  if (issues.name) return { ok: false, error: "bad_name" };
  if (issues.symbol) return { ok: false, error: "bad_ticker" };
  if (issues.image) return { ok: false, error: "bad_image" };
  if (issues.launchBuySol) return { ok: false, error: "dev_buy_cap" };
  if (issues.website || issues.x || issues.telegram || issues.discord) return { ok: false, error: "bad_link" };
  const name = opts.name.trim();
  const symbol = opts.symbol.trim().toUpperCase();
  if (book.coins.some((c) => c.symbol === symbol && c.status === "curve")) {
    return { ok: false, error: "ticker_taken" };
  }
  const img = imageOk(opts.image);
  if (opts.image && !img) return { ok: false, error: "bad_image" };
  const launchBuy = Math.min(launchDevBuyCap(), Math.max(0, Number(opts.launchBuySol) || 0));
  const now = opts.now || Date.now();
  const mint = `curve:${symbol}:${now.toString(36)}`;
  const coin: LaunchCoin = {
    id: id("ln"),
    mint,
    name,
    symbol,
    image: img,
    blurb: (opts.blurb || "").slice(0, 280),
    links: {
      website: cleanLink(opts.website, "website") || undefined,
      x: cleanLink(opts.x, "x") || undefined,
      telegram: cleanLink(opts.telegram, "telegram") || undefined,
      discord: cleanLink(opts.discord, "discord") || undefined,
    },
    mintAuthority: "revoked",
    freezeAuthority: "revoked",
    creator: opts.creator,
    createdAt: now,
    curve: emptyCurve(),
    status: "curve",
    holders: {},
    fills: [],
    devRewardsSol: 0,
    ownerFeesSol: 0,
    treasuryFeesSol: 0,
  };
  book.coins.unshift(coin);
  if (book.coins.length > 120) book.coins.length = 120;
  if (launchBuy >= MIN_TRADE_SOL) {
    const bought = buyCoin(book, { id: coin.id, owner: opts.creator, sol: launchBuy, now, skipSnipe: true });
    if (!bought.ok) return bought;
    return { ok: true, coin: bought.coin };
  }
  return { ok: true, coin };
}

function holderOf(coin: LaunchCoin, owner: string): LaunchHolder {
  const h = coin.holders[owner];
  if (h) return h;
  const n = { owner, tokens: 0, spentSol: 0, receivedSol: 0 };
  coin.holders[owner] = n;
  return n;
}

function creditFees(book: LaunchBook, coin: LaunchCoin, split: { dev: number; owner: number; treasury: number }) {
  coin.devRewardsSol += split.dev;
  coin.ownerFeesSol += split.owner;
  coin.treasuryFeesSol += split.treasury;
  book.ownerEarningsSol += split.owner;
  book.treasuryFeesSol += split.treasury;
}

function maybeGraduate(coin: LaunchCoin, now: number) {
  if (coin.curve.phase !== "graduated" || coin.status === "graduated") return;
  const pool = graduatePool(coin.curve);
  coin.status = "graduated";
  coin.graduatedAt = now;
  if (pool) coin.pool = pool;
}

export function buyCoin(
  book: LaunchBook,
  opts: { id: string; owner: string; sol: number; now?: number; skipSnipe?: boolean },
): { ok: true; fill: LaunchFill; coin: LaunchCoin } | { ok: false; error: string } {
  if (!isSolanaAddress(opts.owner)) return { ok: false, error: "bad_wallet" };
  const coin = book.coins.find((c) => c.id === opts.id);
  if (!coin) return { ok: false, error: "not_found" };
  if (coin.status !== "curve") return { ok: false, error: "graduated" };
  const now = opts.now || Date.now();
  const creator = coin.creator === opts.owner;
  if (!opts.skipSnipe && !creator && now - coin.createdAt < ANTI_SNIPE_MS && opts.sol > ANTI_SNIPE_SOL) {
    return { ok: false, error: "anti_snipe" };
  }
  const q = quoteBuy(coin.curve, opts.sol);
  if (!q.ok) return q;
  const h = holderOf(coin, opts.owner);
  const nextTokens = h.tokens + (q.tokensOut || 0);
  if (nextTokens > (TOKEN_SUPPLY * MAX_WALLET_BPS) / 10_000) return { ok: false, error: "wallet_cap" };
  if (nextTokens > CURVE_SALE) return { ok: false, error: "wallet_cap" };
  coin.curve = q.newCurve;
  h.tokens = nextTokens;
  h.spentSol += opts.sol;
  creditFees(book, coin, q.split);
  const fill: LaunchFill = {
    id: id("lf"),
    at: now,
    owner: opts.owner,
    side: "buy",
    sol: opts.sol,
    tokens: q.tokensOut || 0,
    feeSol: q.feeSol,
    priceSol: q.priceSol,
  };
  coin.fills.push(fill);
  if (coin.fills.length > 200) coin.fills.splice(0, coin.fills.length - 200);
  maybeGraduate(coin, now);
  return { ok: true, fill, coin };
}

export function sellCoin(
  book: LaunchBook,
  opts: { id: string; owner: string; tokens: number; now?: number },
): { ok: true; fill: LaunchFill; coin: LaunchCoin } | { ok: false; error: string } {
  if (!isSolanaAddress(opts.owner)) return { ok: false, error: "bad_wallet" };
  const coin = book.coins.find((c) => c.id === opts.id);
  if (!coin) return { ok: false, error: "not_found" };
  if (coin.status !== "curve") return { ok: false, error: "graduated" };
  const h = holderOf(coin, opts.owner);
  if (opts.tokens > h.tokens + 1e-9) return { ok: false, error: "not_enough" };
  const q = quoteSell(coin.curve, opts.tokens);
  if (!q.ok) return q;
  const now = opts.now || Date.now();
  coin.curve = q.newCurve;
  h.tokens = Math.max(0, h.tokens - opts.tokens);
  h.receivedSol += q.solOut || 0;
  creditFees(book, coin, q.split);
  const fill: LaunchFill = {
    id: id("lf"),
    at: now,
    owner: opts.owner,
    side: "sell",
    sol: q.solOut || 0,
    tokens: opts.tokens,
    feeSol: q.feeSol,
    priceSol: q.priceSol,
  };
  coin.fills.push(fill);
  if (coin.fills.length > 200) coin.fills.splice(0, coin.fills.length - 200);
  return { ok: true, fill, coin };
}

export function withdrawDev(
  book: LaunchBook,
  opts: { id: string; owner: string },
): { ok: true; sol: number } | { ok: false; error: string } {
  const coin = book.coins.find((c) => c.id === opts.id);
  if (!coin) return { ok: false, error: "not_found" };
  if (coin.creator !== opts.owner) return { ok: false, error: "not_creator" };
  const sol = coin.devRewardsSol;
  if (!(sol > 0)) return { ok: false, error: "empty" };
  coin.devRewardsSol = 0;
  return { ok: true, sol };
}

export function withdrawOwner(book: LaunchBook, opts: { owner: string }): { ok: true; sol: number } | { ok: false; error: string } {
  if (!book.ownerWallet || book.ownerWallet !== opts.owner) return { ok: false, error: "not_owner" };
  const sol = book.ownerEarningsSol;
  if (!(sol > 0)) return { ok: false, error: "empty" };
  book.ownerEarningsSol = 0;
  return { ok: true, sol };
}

export function setOwnerWallet(book: LaunchBook, wallet: string) {
  if (wallet && !isSolanaAddress(wallet)) return { ok: false as const, error: "bad_wallet" };
  book.ownerWallet = wallet;
  return { ok: true as const };
}

export function quotePreview(coin: LaunchCoin, side: "buy" | "sell", amount: number) {
  if (side === "buy") return quoteBuy(coin.curve, amount);
  const tokens = amount;
  return quoteSell(coin.curve, tokens);
}

export { MIN_TRADE_SOL };
