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
