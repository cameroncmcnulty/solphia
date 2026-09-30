import { ingestPublicTape, lookupTokenMint, solPriceUsd } from "../feeds";
import { isNativeSolSnapshot } from "../feeds/normalize";
import { scoreToken } from "../risk/engine";
import type { TokenSnapshot } from "../types";
import { smoothSpark } from "./chart";
import { trendingScoreH1, type TapeCoin } from "./tape";
import { publicImage } from "../token/art";

/** Preferred safety floor. The board still fills to MARKET_CAP with the next-best live names. */
export const MARKET_MIN_SCORE = 45;
export const MARKET_MIN_MCAP_USD = 400;
export const MARKET_CAP = 120;
export const MCAP_LARGE_USD = 1_000_000;
export const MEGA_MCAP_USD = 10_000_000;
export const MCAP_MID_USD = 50_000;
export const MCAP_SMALL_USD = 8_000;
const MIX_SLOTS = { large: 12, mid: 36, small: 36, micro: 36 } as const;
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const STABLE_TICKER = /^(usdc|usdt|usd1|dai|pyusd|usds)$/i;

export function isBrowseStable(t: { mint?: string; symbol?: string }): boolean {
  const mint = (t.mint || "").trim();
  if (mint === USDC_MINT || mint === USDT_MINT) return true;
  const sym = (t.symbol || "").replace(/^\$+/g, "").trim();
  return STABLE_TICKER.test(sym);
}

type McapBucket = keyof typeof MIX_SLOTS;

function mcapBucket(mcap: number): McapBucket {
  if (mcap >= MCAP_LARGE_USD) return "large";
  if (mcap >= MCAP_MID_USD) return "mid";
  if (mcap >= MCAP_SMALL_USD) return "small";
  return "micro";
}

/** Interleave mega / mid / small / micro so browse is not 3 billion-MC names plus a wall of 3k dust. */
export function mixByMcap<T>(
  rows: T[],
  cap = MARKET_CAP,
  mcapOf: (row: T) => number = (row) => Number((row as { marketCapUsd?: number }).marketCapUsd) || 0,
): T[] {
  const bins: Record<McapBucket, T[]> = { large: [], mid: [], small: [], micro: [] };
  for (const row of rows) bins[mcapBucket(mcapOf(row) || 0)].push(row);
  const take: Record<McapBucket, T[]> = {
    large: bins.large.slice(0, MIX_SLOTS.large),
    mid: bins.mid.slice(0, MIX_SLOTS.mid),
    small: bins.small.slice(0, MIX_SLOTS.small),
    micro: bins.micro.slice(0, MIX_SLOTS.micro),
  };
  const order: McapBucket[] = ["mid", "small", "micro", "large"];
  const idx: Record<McapBucket, number> = { large: 0, mid: 0, small: 0, micro: 0 };
  const out: T[] = [];
  while (out.length < cap) {
    let added = false;
    for (const k of order) {
      if (out.length >= cap) break;
      if (idx[k] < take[k].length) {
        out.push(take[k][idx[k]++]!);
        added = true;
      }
    }
    if (!added) break;
  }
  if (out.length < cap) {
    const used = new Set(out);
    for (const k of ["mid", "small", "micro", "large"] as McapBucket[]) {
      for (const row of bins[k]) {
        if (out.length >= cap) break;
        if (used.has(row)) continue;
        out.push(row);
        used.add(row);
      }
    }
  }
  return out;
}

/**
 * DexScreener Trending board: hottest 1h first, but only ~20% of rows may be $10M+ names
 * so idle BONK/JUP/TRUMP cannot eat the list.
 */
export function rankLikeDex<T>(
  rows: T[],
  cap = MARKET_CAP,
  scoreOf: (row: T) => number,
  mcapOf: (row: T) => number,
): T[] {
  const ranked = rows.slice().sort((a, b) => scoreOf(b) - scoreOf(a));
  const maxMega = Math.max(8, Math.floor(cap * 0.2));
  const out: T[] = [];
  let mega = 0;
  for (const row of ranked) {
    if (out.length >= cap) break;
    const isMega = mcapOf(row) >= MEGA_MCAP_USD;
    if (isMega && mega >= maxMega) continue;
    out.push(row);
    if (isMega) mega += 1;
  }
  if (out.length < cap) {
    const used = new Set(out);
    for (const row of ranked) {
      if (out.length >= cap) break;
      if (used.has(row)) continue;
      if (mcapOf(row) >= MEGA_MCAP_USD) continue;
      out.push(row);
      used.add(row);
    }
  }
  return out;
}

export function marketPasses(opts: {
  born?: boolean;
  score: number;
  vetoed?: boolean;
  nsfw?: boolean;
  banned?: boolean;
  livestream?: boolean;
  marketCapUsd?: number;
  liquidityUsd?: number;
  volume1hUsd?: number;
  preferred?: boolean;
}): boolean {
  if (opts.born) return true;
  if (opts.nsfw || opts.banned || opts.livestream) return false;
  const mcap = opts.marketCapUsd || 0;
  const liq = opts.liquidityUsd || 0;
  const vol = opts.volume1hUsd || 0;
  if (mcap < MARKET_MIN_MCAP_USD && liq < 250 && vol < 80) return false;
  if (opts.preferred && opts.score < MARKET_MIN_SCORE) return false;
  return true;
}

export function pairUrlOf(t: TokenSnapshot): string {
  if (t.venue === "pumpfun" || t.venue === "pumpswap") return `https://pump.fun/${t.mint}`;
  return `https://dexscreener.com/solana/${t.pairAddress || t.mint}`;
}

export function snapshotToTape(t: TokenSnapshot, solUsd: number): TapeCoin {
  const sol = solUsd > 0 ? solUsd : 100;
  const toSol = (usd: number) => (usd > 0 ? usd / sol : 0);
  const row: TapeCoin = {
    id: t.mint,
    mint: t.mint,
    born: false,
    venue: t.venue,
    pairAddress: t.pairAddress,
    pairUrl: pairUrlOf(t),
    name: t.name,
    symbol: t.symbol,
    image: publicImage(t.image) || t.image,
    links: {
      website: t.socials.website,
      x: t.socials.twitter,
      telegram: t.socials.telegram,
      discord: t.socials.discord,
    },
    creator: t.creator || "",
    createdAt: t.createdAt,
    status: t.graduated ? "graduated" : "curve",
    priceSol: toSol(t.priceUsd),
    marketCapSol: toSol(t.marketCapUsd),
    marketCapUsd: t.marketCapUsd,
    progress: t.bondingProgress,
    realSol: toSol(t.liquidityUsd),
    liqSol: toSol(t.liquidityUsd),
    liqUsd: t.liquidityUsd,
    holders: t.uniqueTraders1h || 0,
    volSol: toSol(t.volume24h),
    vol5m: toSol(t.volume5m),
    vol30m: toSol(t.volume1h) * 0.5,
    vol1h: toSol(t.volume1h),
    vol6h: toSol(t.volume24h) * 0.45,
    vol24h: toSol(t.volume24h),
    txns: t.txns1h,
    txns5m: t.txns5m,
    txns1h: t.txns1h,
    buys1h: t.buys1h,
    sells1h: t.sells1h,
    unique1h: t.uniqueTraders1h,
    top10HolderPct: t.top10HolderPct,
    bundleRatio: t.bundleRatio,
    deployerDeathRate: t.deployerDeathRate,
    deployerTokenCount: t.deployerTokenCount,
    change5m: (t.priceChange5m || 0) / 100,
    change1h: (t.priceChange1h || 0) / 100,
    change6h: (t.priceChange6h || 0) / 100,
    change24h: (t.priceChange24h || 0) / 100,
  };
  row.spark = smoothSpark(row);
  return row;
}

export type MarketRow = { coin: TapeCoin; score: number; grade: string };

let cache: { at: number; rows: MarketRow[]; solUsd: number; scanned: number } | null = null;
let inflight: Promise<{ rows: MarketRow[]; solUsd: number; scanned: number; minScore: number }> | null = null;
const CACHE_MS = 45_000;
const STALE_MS = 5 * 60_000;

export function filterMarketSnapshots(tokens: TokenSnapshot[], solUsd: number): { rows: MarketRow[]; scanned: number } {
  const scored: MarketRow[] = [];
  for (const t of tokens) {
    if (!t.mint || t.mint.length < 32) continue;
    if (isNativeSolSnapshot(t)) continue;
    if (isBrowseStable(t)) continue;
    if (!t.symbol || t.symbol === "???" || !t.name) continue;
    if (
      !marketPasses({
        born: false,
        score: 100,
        nsfw: t.nsfw,
        banned: t.banned,
        livestream: t.livestream,
        marketCapUsd: t.marketCapUsd,
        liquidityUsd: t.liquidityUsd,
        volume1hUsd: t.volume1h,
      })
    ) {
      continue;
    }
    const report = scoreToken(t);
    scored.push({ coin: snapshotToTape(t, solUsd), score: report.score, grade: report.grade });
  }
  const rows = rankLikeDex(
    scored,
    MARKET_CAP,
    (r) => trendingScoreH1(r.coin, solUsd) * (r.score >= MARKET_MIN_SCORE ? 1.05 : 1),
    (r) => r.coin.marketCapUsd || 0,
  );
  return { rows, scanned: tokens.length };
}

async function refreshMarketTape() {
  if (inflight) return inflight;
  inflight = (async () => {
    const { tokens, solUsd } = await ingestPublicTape();
    const { rows, scanned } = filterMarketSnapshots(tokens, solUsd);
    cache = { at: Date.now(), rows, solUsd, scanned };
    return { rows, solUsd, scanned, minScore: MARKET_MIN_SCORE };
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function loadMarketTape(force = false): Promise<{
  rows: MarketRow[];
  solUsd: number;
  scanned: number;
  minScore: number;
}> {
  const age = cache ? Date.now() - cache.at : Infinity;
  if (!force && cache && age < CACHE_MS) {
    return { rows: cache.rows, solUsd: cache.solUsd, scanned: cache.scanned, minScore: MARKET_MIN_SCORE };
  }
  if (!force && cache && age < STALE_MS) {
    void refreshMarketTape();
    return { rows: cache.rows, solUsd: cache.solUsd, scanned: cache.scanned, minScore: MARKET_MIN_SCORE };
  }
  return refreshMarketTape();
}

/** One mint, even when the public tape would hide it. Search must still open the token. */
export async function lookupMarketMint(mint: string): Promise<(MarketRow & { solUsd: number }) | null> {
  const snap = await lookupTokenMint(mint);
  if (!snap?.mint) return null;
  const solUsd = (await solPriceUsd().catch(() => 100)) || 100;
  const report = scoreToken(snap);
  return { coin: snapshotToTape(snap, solUsd), score: report.score, grade: report.grade, solUsd };
}
