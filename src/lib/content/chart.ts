export type Candle = { o: number; h: number; l: number; c: number; up: boolean; v: number };
export type CandlePx = { top: number; body: number; bot: number; up: boolean; pad: number; vol: number; emaPad: number };
export type SleeveBar = { name: string; tag: string; pct: number };
export type CurveBar = { h: number; up: boolean };
export type Step = { n: string; t: string; d: string };

export function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, xs: T[], avoid?: T): T {
  const pool = avoid ? xs.filter((x) => x !== avoid) : xs;
  return pool[Math.floor(rng() * pool.length)] || xs[0];
}

export type Star = { x: number; y: number; s: number; a: number };

export function starField(rng: () => number, n: number, w: number, h: number): Star[] {
  const out: Star[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: Math.round(rng() * w),
      y: Math.round(rng() * h * 0.72),
      s: 2 + Math.round(rng() * 4),
      a: 0.35 + rng() * 0.65,
    });
  }
  return out;
}

/** Aesthetic 15m tape: range, a dip, a clip back. Not a live book. */
export function fakeCandles(rng: () => number, n = 52): Candle[] {
  let px = 48 + rng() * 8;
  const out: Candle[] = [];
  const dip = Math.floor(n * 0.62);
  for (let i = 0; i < n; i++) {
    const noise = (rng() - 0.5) * 1.15;
    let drift = noise;
    if (i > dip && i < dip + 4) drift = -0.9 - rng() * 0.8;
    if (i >= dip + 4 && i < dip + 10) drift = 0.55 + rng() * 0.45;
    const o = px;
    const c = clamp(px + drift, 12, 88);
    const wick = 0.25 + rng() * 0.7;
    const h = Math.max(o, c) + wick * (0.4 + rng());
    const l = Math.min(o, c) - wick * (0.3 + rng());
    const v = 0.35 + rng() * 0.65 + (Math.abs(c - o) > 1.2 ? 0.3 : 0);
    out.push({ o, h, l, c, up: c >= o, v });
    px = c;
  }
  return out;
}

export function candlePixels(candles: Candle[], height = 200): CandlePx[] {
  const min = Math.min(...candles.map((c) => c.l));
  const max = Math.max(...candles.map((c) => c.h));
  const span = (max - min) * 1.08 || 1;
  const floor = min - span * 0.04;
  const y = (v: number) => ((v - floor) / span) * height;
  let ema = candles[0]?.c || 0;
  return candles.map((c) => {
    ema = ema * 0.85 + c.c * 0.15;
    const hi = y(c.h);
    const lo = y(c.l);
    const topBody = y(Math.max(c.o, c.c));
    const botBody = y(Math.min(c.o, c.c));
    return {
      pad: Math.max(0, height - hi),
      top: Math.max(1, hi - topBody),
      body: Math.max(3, topBody - botBody),
      bot: Math.max(1, botBody - lo),
      up: c.up,
      vol: c.v,
      emaPad: Math.max(0, height - y(ema)),
    };
  });
}

export function fakeSleeves(rng: () => number): SleeveBar[] {
  const names: [string, string][] = [
    ["USDC", "PnL home"],
    ["SOL", "her bag"],
    ["SPYx", "S&P 500"],
    ["QQQx", "Nasdaq"],
    ["GLDx", "gold"],
  ];
  const raw = names.map(() => 0.14 + rng() * 0.12);
  const sum = raw.reduce((a, b) => a + b, 0);
  return names.map(([name, tag], i) => ({ name, tag, pct: Math.round((raw[i] / sum) * 100) }));
}

export function fakeCurve(rng: () => number, n = 22): CurveBar[] {
  let v = 28 + rng() * 10;
  const out: CurveBar[] = [];
  for (let i = 0; i < n; i++) {
    const prev = v;
    v = clamp(v + (rng() - 0.42) * 6, 12, 92);
    out.push({ h: v, up: v >= prev });
  }
  return out;
}

export const STEPS: Step[] = [
  { n: "1", t: "Connect Phantom", d: "Keys stay in the wallet." },
  { n: "2", t: "Add SOL", d: "Move size onto this device." },
  { n: "3", t: "She runs", d: "Clips the stretch. You sleep." },
];

export const PAIRS = [
  "SOL / USDC",
  "SOL / S&P 500",
  "SOL / Nasdaq",
  "SOL / gold",
  "USDC / S&P 500",
  "USDC / Nasdaq",
  "USDC / gold",
  "S&P / Nasdaq",
  "S&P / gold",
  "Nasdaq / gold",
];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
