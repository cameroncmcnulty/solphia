import type { TokenSnapshot, Venue } from "../types";

export function blankSnapshot(partial: Partial<TokenSnapshot> & Pick<TokenSnapshot, "mint" | "name" | "symbol">): TokenSnapshot {
  return {
    venue: "unknown",
    createdAt: Date.now(),
    priceUsd: 0,
    marketCapUsd: 0,
    liquidityUsd: 0,
    volume5m: 0,
    volume1h: 0,
    volume24h: 0,
    txns5m: 0,
    txns1h: 0,
    buys1h: 0,
    sells1h: 0,
    uniqueTraders1h: 0,
    priceChange5m: 0,
    priceChange1h: 0,
    priceChange6h: 0,
    priceChange24h: 0,
    bondingProgress: 0,
    graduated: false,
    nsfw: false,
    banned: false,
    livestream: false,
    replyCount: 0,
    verified: false,
    socials: {},
    ...partial,
  };
}

export function mergeSnapshots(a: TokenSnapshot, b: TokenSnapshot): TokenSnapshot {
  const pickMax = (x: number, y: number) => (y > x ? y : x);
  return {
    ...a,
    ...b,
    name: b.name || a.name,
    symbol: b.symbol || a.symbol,
    image: b.image || a.image,
    venue: b.venue !== "unknown" ? b.venue : a.venue,
    pairAddress: b.pairAddress || a.pairAddress,
    creator: b.creator || a.creator,
    createdAt: Math.min(a.createdAt || Date.now(), b.createdAt || Date.now()),
    priceUsd: b.priceUsd || a.priceUsd,
    marketCapUsd: pickMax(a.marketCapUsd, b.marketCapUsd),
    liquidityUsd: pickMax(a.liquidityUsd, b.liquidityUsd),
    volume5m: pickMax(a.volume5m, b.volume5m),
    volume1h: pickMax(a.volume1h, b.volume1h),
    volume24h: pickMax(a.volume24h, b.volume24h),
    txns5m: pickMax(a.txns5m, b.txns5m),
    txns1h: pickMax(a.txns1h, b.txns1h),
    buys1h: pickMax(a.buys1h, b.buys1h),
    sells1h: pickMax(a.sells1h, b.sells1h),
    uniqueTraders1h: pickMax(a.uniqueTraders1h, b.uniqueTraders1h),
    uniqueEstimated: Boolean(a.uniqueEstimated && b.uniqueEstimated),
    priceChange5m: b.priceChange5m || a.priceChange5m,
    priceChange1h: b.priceChange1h || a.priceChange1h,
    priceChange6h: b.priceChange6h || a.priceChange6h,
    priceChange24h: b.priceChange24h || a.priceChange24h,
    bondingProgress: Math.max(a.bondingProgress, b.bondingProgress),
    graduated: a.graduated || b.graduated,
    nsfw: a.nsfw || b.nsfw,
    banned: a.banned || b.banned,
    livestream: a.livestream || b.livestream,
    replyCount: pickMax(a.replyCount, b.replyCount),
    verified: a.verified || b.verified,
    socials: { ...a.socials, ...b.socials },
    mintAuthorityRevoked: b.mintAuthorityRevoked ?? a.mintAuthorityRevoked,
    freezeAuthorityRevoked: b.freezeAuthorityRevoked ?? a.freezeAuthorityRevoked,
    lpLockedOrBurned: b.lpLockedOrBurned ?? a.lpLockedOrBurned,
    top10HolderPct: b.top10HolderPct ?? a.top10HolderPct,
    bundleRatio: b.bundleRatio ?? a.bundleRatio,
    organicBuyRatio: b.organicBuyRatio ?? a.organicBuyRatio,
    devSoldPct: b.devSoldPct ?? a.devSoldPct,
    smartMoneyInflow: b.smartMoneyInflow || a.smartMoneyInflow,
    copiedBy: [...new Set([...(a.copiedBy || []), ...(b.copiedBy || [])])],
    copiedHolding: Boolean(a.copiedHolding || b.copiedHolding),
    leaderHoldPct: Math.max(a.leaderHoldPct || 0, b.leaderHoldPct || 0) || undefined,
    farmCluster: Boolean(a.farmCluster || b.farmCluster),
    deployerDeathRate: b.deployerDeathRate ?? a.deployerDeathRate,
    deployerTokenCount: b.deployerTokenCount ?? a.deployerTokenCount,
    athMarketCapUsd: pickMax(a.athMarketCapUsd || 0, b.athMarketCapUsd || 0),
  };
}

export function dexToVenue(dexId: string): Venue {
  const d = dexId.toLowerCase();
  if (d.includes("pumpfun") || d === "pump.fun") return "pumpfun";
  if (d.includes("pumpswap")) return "pumpswap";
  if (d.includes("launchlab") || d.includes("raydium-launchlab")) return "launchlab";
  if (d.includes("raydium")) return "raydium";
  if (d.includes("meteora")) return "meteora";
  if (d.includes("orca")) return "orca";
  return "unknown";
}
