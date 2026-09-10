export type AgeFilter = "newest" | "1h" | "6h" | "24h";
export type VolWindow = "5m" | "30m" | "1h" | "6h" | "24h";

export const AGE_MS: Record<Exclude<AgeFilter, "newest">, number> = {
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
};

export const VOL_MS: Record<VolWindow, number> = {
  "5m": 5 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
};

/** Ranked board: enough rows to fill the tape without scrolling. */
export const TAPE_BOARD = 6;

export type TapeCoin = {
  id: string;
  mint?: string;
  /** True when the coin launched on Solphia's pad. Market tokens are false. */
  born?: boolean;
  venue?: string;
  pairAddress?: string;
  pairUrl?: string;
  liqUsd?: number;
  name: string;
  symbol: string;
  image?: string;
  blurb?: string;
  links?: { website?: string; x?: string; telegram?: string; discord?: string };
  creator: string;
  createdAt: number;
  status: "curve" | "graduated";
  priceSol: number;
  marketCapSol: number;
  marketCapUsd: number;
  progress: number;
  realSol: number;
  liqSol?: number;
  holders: number;
  volSol?: number;
  vol5m?: number;
  vol30m?: number;
  vol1h?: number;
  vol6h?: number;
  vol24h?: number;
  txns?: number;
  txns5m?: number;
  txns1h?: number;
  buys?: number;
  sells?: number;
  buys1h?: number;
  sells1h?: number;
  unique1h?: number;
  uniqueAll?: number;
  top10HolderPct?: number;
  creatorHoldPct?: number;
  largestWalletPct?: number;
  bundleRatio?: number;
  devSoldPct?: number;
  deployerTokenCount?: number;
  deployerDeathRate?: number;
  creatorRecentLaunches?: number;
  change5m?: number;
  change1h?: number;
  change6h?: number;
  change24h?: number;
  spark?: { t: number; o: number; h: number; l: number; c: number }[];
  fills?: { at: number; side: "buy" | "sell"; sol: number; tokens: number; owner?: string }[];
};

export function inAgeWindow(coin: TapeCoin, age: AgeFilter, now = Date.now()): boolean {
  if (age === "newest") return true;
  return now - coin.createdAt <= AGE_MS[age];
}

export function volumeIn(coin: TapeCoin, w: VolWindow, now = Date.now()): number {
  const keyed =
    w === "5m"
      ? coin.vol5m
      : w === "30m"
        ? coin.vol30m
        : w === "1h"
          ? coin.vol1h
          : w === "6h"
            ? coin.vol6h
            : coin.vol24h;
  if (typeof keyed === "number") return keyed;
  const ms = VOL_MS[w];
  return (coin.fills || []).filter((f) => now - f.at <= ms).reduce((s, f) => s + f.sol, 0);
}

export function filterTape<T extends TapeCoin>(coins: T[], age: AgeFilter, now = Date.now()): T[] {
  return coins.filter((c) => inAgeWindow(c, age, now));
}

export function sortTape<T extends TapeCoin>(coins: T[], vol: VolWindow | null, now = Date.now()): T[] {
  const rows = coins.slice();
  if (!vol) {
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows;
  }
  rows.sort((a, b) => {
    const dv = volumeIn(b, vol, now) - volumeIn(a, vol, now);
    if (dv !== 0) return dv;
    return b.createdAt - a.createdAt;
  });
  return rows;
}
