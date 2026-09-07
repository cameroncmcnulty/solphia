import type { XStockId } from "./mints";

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

export function logRatio(sol: number, asset: number): number {
  if (sol <= 0 || asset <= 0) return 0;
  return Math.log(sol / asset);
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
  asset: XStockId;
};

export function readRatio(
  samples: RatioSample[],
  sol: number,
  assetUsd: number,
  now: number,
  asset: XStockId = "spyx",
): RatioRead {
  const logR = logRatio(sol, assetUsd);
  const h24 = windowLogs(samples, now, 24 * 60 * 60 * 1000, asset);
  const d7 = windowLogs(samples, now, 7 * 24 * 60 * 60 * 1000, asset);
  const mean24 = h24.length ? mean(h24) : logR;
  const mean7 = d7.length ? mean(d7) : logR;
  const std24 = Math.max(stdev(h24), 1e-6);
  const std7 = Math.max(stdev(d7), 1e-6);
  return {
    ratio: assetUsd > 0 ? sol / assetUsd : 0,
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
  };
}
