export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export function closes(candles: Candle[]): number[] {
  return candles.map((c) => c.c);
}

export function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out: number[] = new Array(values.length);
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) out[i] = values[i] * k + out[i - 1] * (1 - k);
  return out;
}

/** Wilder RSI. */
export function rsi(values: number[], period = 14): number[] {
  const out: number[] = new Array(values.length).fill(50);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function trueRange(cur: Candle, prev: Candle): number {
  return Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
}

/** Wilder ATR. */
export function atr(candles: Candle[], period = 14): number[] {
  const out: number[] = new Array(candles.length).fill(0);
  if (candles.length < 2) return out;
  const tr: number[] = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) tr[i] = trueRange(candles[i], candles[i - 1]);
  let sum = 0;
  for (let i = 1; i <= period && i < candles.length; i++) sum += tr[i];
  if (candles.length > period) {
    out[period] = sum / period;
    for (let i = period + 1; i < candles.length; i++) {
      out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
    }
  }
  return out;
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export type Swing = { i: number; price: number };

export function swingPoints(candles: Candle[], wing = 3): { lows: Swing[]; highs: Swing[] } {
  const lows: Swing[] = [];
  const highs: Swing[] = [];
  for (let i = wing; i < candles.length - wing; i++) {
    let low = true;
    let high = true;
    for (let k = 1; k <= wing; k++) {
      if (candles[i].l > candles[i - k].l || candles[i].l > candles[i + k].l) low = false;
      if (candles[i].h < candles[i - k].h || candles[i].h < candles[i + k].h) high = false;
    }
    if (low) lows.push({ i, price: candles[i].l });
    if (high) highs.push({ i, price: candles[i].h });
  }
  return { lows, highs };
}

/** Price lower low, RSI higher low. */
export function bullishDivergence(candles: Candle[], rsiVals: number[], lookback = 40): boolean {
  const sliceStart = Math.max(0, candles.length - lookback);
  const { lows } = swingPoints(candles.slice(sliceStart), 3);
  if (lows.length < 2) return false;
  const a = lows[lows.length - 2];
  const b = lows[lows.length - 1];
  const ra = rsiVals[sliceStart + a.i];
  const rb = rsiVals[sliceStart + b.i];
  if (ra == null || rb == null) return false;
  return b.price < a.price * 0.999 && rb > ra + 1.5 && rb < 52 && b.i - a.i >= 4;
}

/** Price higher high, RSI lower high. */
export function bearishDivergence(candles: Candle[], rsiVals: number[], lookback = 40): boolean {
  const sliceStart = Math.max(0, candles.length - lookback);
  const { highs } = swingPoints(candles.slice(sliceStart), 3);
  if (highs.length < 2) return false;
  const a = highs[highs.length - 2];
  const b = highs[highs.length - 1];
  const ra = rsiVals[sliceStart + a.i];
  const rb = rsiVals[sliceStart + b.i];
  if (ra == null || rb == null) return false;
  return b.price > a.price * 1.001 && rb < ra - 1.5 && rb > 48 && b.i - a.i >= 4;
}

export function lastSwingLow(candles: Candle[]): number {
  const { lows } = swingPoints(candles, 3);
  if (lows.length) return lows[lows.length - 1].price;
  return Math.min(...candles.slice(-8).map((c) => c.l));
}

export function lastSwingHigh(candles: Candle[]): number {
  const { highs } = swingPoints(candles, 3);
  if (highs.length) return highs[highs.length - 1].price;
  return Math.max(...candles.slice(-8).map((c) => c.h));
}

export function lastOf(xs: number[], fallback = 0): number {
  return xs.length ? xs[xs.length - 1] : fallback;
}

/** Rolling VWAP. Uses volume when present, else equal weight. */
export function vwap(candles: Candle[]): number {
  if (!candles.length) return 0;
  let pv = 0;
  let vol = 0;
  for (const c of candles) {
    const tp = (c.h + c.l + c.c) / 3;
    const v = c.v > 0 ? c.v : 1;
    pv += tp * v;
    vol += v;
  }
  return vol > 0 ? pv / vol : candles[candles.length - 1].c;
}

/** Wilder ADX. Strength of trend, not direction. */
export function adx(candles: Candle[], period = 14): { adx: number; plusDi: number; minusDi: number } {
  const empty = { adx: 0, plusDi: 0, minusDi: 0 };
  if (candles.length < period + 2) return empty;
  const plus: number[] = [];
  const minus: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].h - candles[i - 1].h;
    const down = candles[i - 1].l - candles[i].l;
    plus.push(up > down && up > 0 ? up : 0);
    minus.push(down > up && down > 0 ? down : 0);
    tr.push(trueRange(candles[i], candles[i - 1]));
  }
  const smooth = (xs: number[]) => {
    let s = 0;
    for (let i = 0; i < period && i < xs.length; i++) s += xs[i];
    const out: number[] = [];
    out[period - 1] = s;
    for (let i = period; i < xs.length; i++) {
      s = s - s / period + xs[i];
      out[i] = s;
    }
    return out;
  };
  const sp = smooth(plus);
  const sm = smooth(minus);
  const st = smooth(tr);
  const dx: number[] = [];
  for (let i = period - 1; i < st.length; i++) {
    const pdi = st[i] ? (100 * sp[i]) / st[i] : 0;
    const mdi = st[i] ? (100 * sm[i]) / st[i] : 0;
    const den = pdi + mdi;
    dx.push(den ? (100 * Math.abs(pdi - mdi)) / den : 0);
  }
  if (dx.length < period) return empty;
  let adxN = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dx.length; i++) adxN = (adxN * (period - 1) + dx[i]) / period;
  const last = candles.length - 2;
  const pdi = st[last] ? (100 * sp[last]) / st[last] : 0;
  const mdi = st[last] ? (100 * sm[last]) / st[last] : 0;
  return { adx: adxN, plusDi: pdi, minusDi: mdi };
}

/** ATR SuperTrend. dir 1 = bull, -1 = bear. */
export function supertrend(candles: Candle[], period = 10, mult = 3): { line: number; dir: 1 | -1 } {
  const a = atr(candles, period);
  if (candles.length < period + 2) {
    const c = candles[candles.length - 1]?.c || 0;
    return { line: c, dir: 1 };
  }
  let upper = 0;
  let lower = 0;
  let dir: 1 | -1 = 1;
  let line = candles[period].c;
  for (let i = period; i < candles.length; i++) {
    const hl2 = (candles[i].h + candles[i].l) / 2;
    const atrN = a[i] || a[i - 1] || candles[i].c * 0.01;
    let bu = hl2 + mult * atrN;
    let bl = hl2 - mult * atrN;
    if (i > period) {
      if (bl < lower && candles[i - 1].c > lower) bl = lower;
      if (bu > upper && candles[i - 1].c < upper) bu = upper;
    }
    upper = bu;
    lower = bl;
    if (dir === 1 && candles[i].c < lower) dir = -1;
    else if (dir === -1 && candles[i].c > upper) dir = 1;
    line = dir === 1 ? lower : upper;
  }
  return { line, dir };
}

export function pack4h(hourly: Candle[]): Candle[] {
  return packBars(hourly, 4 * 3_600_000);
}

export function packDaily(hourly: Candle[]): Candle[] {
  return packBars(hourly, 86_400_000);
}

function packBars(hourly: Candle[], ms: number): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of hourly) {
    const b = Math.floor(c.t / ms) * ms;
    const prev = map.get(b);
    if (!prev) map.set(b, { t: b, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v });
    else {
      prev.h = Math.max(prev.h, c.h);
      prev.l = Math.min(prev.l, c.l);
      prev.c = c.c;
      prev.v += c.v;
    }
  }
  return [...map.values()].sort((a, b) => a.t - b.t);
}
