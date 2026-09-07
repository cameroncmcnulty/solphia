import type { XStockId } from "./mints";
import type { Sleeve, TradePair } from "./catalog";
import type { PairPrices } from "./prices";

export type RatioSample = { t: number; sol: number; spyx: number; qqqx?: number; gldx?: number };

export type BandName = "tight" | "normal" | "wide";

export const BAND_K: Record<BandName, number> = {
  tight: 0.75,
  normal: 1.25,
  wide: 1.85,
};

export function bumpBand(band: BandName, losses: number): BandName {
  if (losses >= 4) return "wide";
  if (losses >= 2) return band === "tight" ? "normal" : "wide";
  return band;
}

export function logRatio(left: number, right: number): number {
  if (left <= 0 || right <= 0) return 0;
  return Math.log(left / right);
}

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

export function samplePx(sample: RatioSample, sleeve: Sleeve): number {
  if (sleeve === "SOL") return sample.sol;
  if (sleeve === "USDC") return 1;
  if (sleeve === "SPYx") return sample.spyx;
  if (sleeve === "QQQx") return sample.qqqx || 0;
  return sample.gldx || 0;
}

export function livePx(prices: PairPrices, sleeve: Sleeve): number {
  if (sleeve === "SOL") return prices.sol.usd || 0;
  if (sleeve === "USDC") return 1;
  if (sleeve === "SPYx") return prices.spyx.usd || 0;
  if (sleeve === "QQQx") return prices.qqqx.usd || 0;
  return prices.gldx.usd || 0;
}

function assetPx(sample: RatioSample, asset: XStockId): number {
  if (asset === "spyx") return sample.spyx;
  if (asset === "qqqx") return sample.qqqx || 0;
  return sample.gldx || 0;
}

export function windowLogs(samples: RatioSample[], now: number, ms: number, asset: XStockId = "spyx"): number[] {
  return samples
    .filter((s) => now - s.t <= ms && s.sol > 0 && assetPx(s, asset) > 0)
    .map((s) => logRatio(s.sol, assetPx(s, asset)));
}

function pairLogs(samples: RatioSample[], now: number, ms: number, pair: TradePair): number[] {
  return samples
    .filter((s) => now - s.t <= ms && samplePx(s, pair.left) > 0 && samplePx(s, pair.right) > 0)
    .map((s) => logRatio(samplePx(s, pair.left), samplePx(s, pair.right)));
}

export type RatioRead = {
  ratio: number;
  logR: number;
  mean24: number;
  mean7: number;
  std24: number;
  std7: number;
  z24: number;
  z7: number;
  n24: number;
  n7: number;
  asset: string;
  pairId?: string;
};

function pack(leftPx: number, rightPx: number, h24: number[], d7: number[], asset: string, pairId?: string): RatioRead {
  const logR = logRatio(leftPx, rightPx);
  const mean24 = h24.length ? mean(h24) : logR;
  const mean7 = d7.length ? mean(d7) : logR;
  const std24 = Math.max(stdev(h24), 1e-6);
  const std7 = Math.max(stdev(d7), 1e-6);
  return {
    ratio: rightPx > 0 ? leftPx / rightPx : 0,
    logR,
    mean24,
    mean7,
    std24,
    std7,
    z24: (logR - mean24) / std24,
    z7: (logR - mean7) / std7,
    n24: h24.length,
    n7: d7.length,
    asset,
    pairId,
  };
}

export function readRatio(
  samples: RatioSample[],
  sol: number,
  assetUsd: number,
  now: number,
  asset: XStockId = "spyx",
): RatioRead {
  const h24 = windowLogs(samples, now, 24 * 60 * 60 * 1000, asset);
  const d7 = windowLogs(samples, now, 7 * 24 * 60 * 60 * 1000, asset);
  return pack(sol, assetUsd, h24, d7, asset);
}

export function readPair(samples: RatioSample[], leftPx: number, rightPx: number, now: number, pair: TradePair): RatioRead {
  const h24 = pairLogs(samples, now, 24 * 60 * 60 * 1000, pair);
  const d7 = pairLogs(samples, now, 7 * 24 * 60 * 60 * 1000, pair);
  return pack(leftPx, rightPx, h24, d7, pair.id, pair.id);
}
