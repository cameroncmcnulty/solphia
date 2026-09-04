export type RatioSample = { t: number; sol: number; spyx: number };

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

export function logRatio(sol: number, spyx: number): number {
  if (sol <= 0 || spyx <= 0) return 0;
  return Math.log(sol / spyx);
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

export function windowLogs(samples: RatioSample[], now: number, ms: number): number[] {
  return samples.filter((s) => now - s.t <= ms && s.sol > 0 && s.spyx > 0).map((s) => logRatio(s.sol, s.spyx));
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
};

export function readRatio(samples: RatioSample[], sol: number, spyx: number, now: number): RatioRead {
  const logR = logRatio(sol, spyx);
  const h24 = windowLogs(samples, now, 24 * 60 * 60 * 1000);
  const d7 = windowLogs(samples, now, 7 * 24 * 60 * 60 * 1000);
  const mean24 = h24.length ? mean(h24) : logR;
  const mean7 = d7.length ? mean(d7) : logR;
  const std24 = Math.max(stdev(h24), 1e-6);
  const std7 = Math.max(stdev(d7), 1e-6);
  return {
    ratio: spyx > 0 ? sol / spyx : 0,
    logR,
    mean24,
    mean7,
    std24,
    std7,
    z24: (logR - mean24) / std24,
    z7: (logR - mean7) / std7,
    n24: h24.length,
    n7: d7.length,
  };
}
