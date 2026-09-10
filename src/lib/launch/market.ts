import { ingestPublicTape } from "../feeds";
import { scoreToken } from "../risk/engine";
import type { TokenSnapshot } from "../types";
import { attachTapeSparks } from "./chart";
import type { TapeCoin } from "./tape";

/** Preferred safety floor. The board still fills to MARKET_CAP with the next-best live names. */
export const MARKET_MIN_SCORE = 45;
export const MARKET_MIN_MCAP_USD = 400;
export const MARKET_CAP = 48;

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
  return {
    id: t.mint,
    mint: t.mint,
    born: false,
    venue: t.venue,
    pairAddress: t.pairAddress,
    pairUrl: pairUrlOf(t),
    name: t.name,
    symbol: t.symbol,
    image: t.image,
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
}

export type MarketRow = { coin: TapeCoin; score: number; grade: string };

let cache: { at: number; rows: MarketRow[]; solUsd: number; scanned: number } | null = null;
const CACHE_MS = 45_000;

export function filterMarketSnapshots(tokens: TokenSnapshot[], solUsd: number): { rows: MarketRow[]; scanned: number } {
  const scored: MarketRow[] = [];
  for (const t of tokens) {
    if (!t.mint || t.mint.length < 32) continue;
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
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.coin.vol1h || 0) - (a.coin.vol1h || 0);
  });
  const preferred = scored.filter((r) => r.score >= MARKET_MIN_SCORE);
  const rest = scored.filter((r) => r.score < MARKET_MIN_SCORE);
  const rows = [...preferred, ...rest].slice(0, MARKET_CAP);
  return { rows, scanned: tokens.length };
}

export async function loadMarketTape(force = false): Promise<{
  rows: MarketRow[];
  solUsd: number;
  scanned: number;
  minScore: number;
}> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return { rows: cache.rows, solUsd: cache.solUsd, scanned: cache.scanned, minScore: MARKET_MIN_SCORE };
  }
  const { tokens, solUsd } = await ingestPublicTape();
  const { rows, scanned } = filterMarketSnapshots(tokens, solUsd);
  await attachTapeSparks(rows.map((r) => r.coin));
  cache = { at: Date.now(), rows, solUsd, scanned };
  return { rows, solUsd, scanned, minScore: MARKET_MIN_SCORE };
}
