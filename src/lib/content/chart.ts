export type Candle = { o: number; h: number; l: number; c: number; up: boolean };
export type CandlePx = { top: number; body: number; bot: number; up: boolean; pad: number };
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

/** Aesthetic tape: quiet range, a stretch, a clip back. Not a live book. */
export function fakeCandles(rng: () => number, n = 16): Candle[] {
  let px = 42 + rng() * 16;
  const out: Candle[] = [];
  const stretchAt = Math.floor(n * 0.55);
  for (let i = 0; i < n; i++) {
    let drift = (rng() - 0.48) * 2.4;
    if (i === stretchAt) drift = -5 - rng() * 4;
    if (i === stretchAt + 1) drift = 3 + rng() * 3;
    if (i > stretchAt + 1) drift = Math.abs(drift) * 0.6;
    const o = px;
    const c = clamp(px + drift, 8, 92);
    const h = Math.max(o, c) + rng() * 2.2;
    const l = Math.min(o, c) - rng() * 2.2;
    out.push({ o, h, l, c, up: c >= o });
    px = c;
  }
  return out;
}

export function candlePixels(candles: Candle[], height = 200): CandlePx[] {
  const min = Math.min(...candles.map((c) => c.l));
  const max = Math.max(...candles.map((c) => c.h));
  const span = max - min || 1;
  const y = (v: number) => ((v - min) / span) * height;
  return candles.map((c) => {
    const hi = y(c.h);
    const lo = y(c.l);
    const topBody = y(Math.max(c.o, c.c));
    const botBody = y(Math.min(c.o, c.c));
    return {
      pad: Math.max(0, height - hi),
      top: Math.max(2, hi - topBody),
      body: Math.max(5, topBody - botBody),
      bot: Math.max(2, botBody - lo),
      up: c.up,
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
