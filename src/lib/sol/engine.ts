import type { PaperBook } from "../types";
import {
  atr,
  bearishDivergence,
  bullishDivergence,
  closes,
  ema,
  lastSwingHigh,
  lastSwingLow,
  rsi,
  sma,
  type Candle,
} from "./indicators";
import { lastPrice } from "./candles";

/**
 * SOL/USDT spot scalp, sized from the stop.
 *
 * History used (Binance SOLUSDT, 1000 daily bars through 2026-09):
 *   median daily range 5.75%, mean 6.62%, p80 8.84% — matches the 4–8% / ~6% ATR band.
 *   15m ATR(14) ≈ 0.46% of price. A 0.5% stop is about one 15m ATR (noise floor).
 *
 * Rules (refuse-first, spot, no leverage):
 *   risk 0.5–1% of equity via stop × size, cap 80% of cash
 *   stop beyond structure, at least 0.5%, at most 1.2%
 *   first target ≥ 2R and ≥ 1.8R after fees; cap 1.5%
 *   skip if after-cost R:R < 1.8 or net TP < 0.70%
 *   daily goal 0.5% of equity → no new entries
 *   daily loss 1.5% → halt
 *   max 4 entries / UTC day
 *
 * Fees: 5 bps + 4 bps slip per side. Memecoin 35 bps would eat a 1% scalp.
 * SOL/USDT on a major venue is a few bps; 9 bps one-way is conservative, not optimistic.
 */
export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const SOL_FEE_BPS = 5;
export const SOL_SLIP_BPS = 4;
export const SOL_MIN_STOP = 0.005;
export const SOL_MAX_STOP = 0.012;
export const SOL_MAX_TP = 0.015;
export const SOL_MIN_NET_TP = 0.007;
export const SOL_MIN_RR = 1.8;
export const SOL_RISK_PCT = 0.0075;
export const SOL_DAILY_GOAL = 0.005;
export const SOL_DAILY_LOSS = 0.015;
export const SOL_MAX_TRADES_DAY = 4;
export const SOL_CASH_CAP = 0.8;
export const SOL_PARTIAL = 0.5;
export const SOL_TIME_MS = 6 * 60 * 60 * 1000;

export type SolDir = "long" | "short";

export type SolSignal = {
  ok: boolean;
  dir?: SolDir;
  price: number;
  stop: number;
  tp1: number;
  stopPct: number;
  tpPct: number;
  rrAfterCost: number;
  netTpPct: number;
  reason: string;
  rsi15: number;
  rsi1h: number;
  atrPct: number;
  emaBias1h: "up" | "down" | "flat";
};

export type SolDeskPublic = {
  price: number;
  rsi15: number;
  rsi1h: number;
  atrPct: number;
  emaBias1h: "up" | "down" | "flat";
  signal: "long" | "short" | "wait";
  reason: string;
  stopPct?: number;
  tpPct?: number;
  rrAfterCost?: number;
  dailyPnlPct: number;
  tradesToday: number;
};

export function roundTripPct(): number {
  return ((SOL_FEE_BPS + SOL_SLIP_BPS) * 2) / 10_000;
}

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function solDayPnl(book: PaperBook, now: number): { pnl: number; entries: number } {
  const key = dayKey(now);
  let pnl = 0;
  let entries = 0;
  for (const f of book.fills) {
    if (f.strategy !== "sol_usd") continue;
    if (dayKey(f.at) !== key) continue;
    if (f.reason.startsWith("enter-sol")) entries += 1;
    if (f.pnlUsd != null) pnl += f.pnlUsd;
  }
  for (const p of book.positions) {
    if (p.strategy === "sol_usd") pnl += p.unrealizedUsd;
  }
  return { pnl, entries };
}

function bias(ema9: number, ema21: number): "up" | "down" | "flat" {
  const d = (ema9 - ema21) / ema21;
  if (d > 0.0015) return "up";
  if (d < -0.0015) return "down";
  return "flat";
}

function planTrade(dir: SolDir, price: number, structure: number): Omit<SolSignal, "ok" | "reason" | "rsi15" | "rsi1h" | "atrPct" | "emaBias1h"> | { deny: string } {
  const rawStopPct = dir === "long" ? (price - structure) / price : (structure - price) / price;
  const stopPct = Math.min(SOL_MAX_STOP, Math.max(SOL_MIN_STOP, rawStopPct));
  if (rawStopPct < SOL_MIN_STOP * 0.85) return { deny: "Stop would sit inside 15m noise (<0.5%)." };
  if (rawStopPct > SOL_MAX_STOP * 1.15) return { deny: "Structure stop is wider than 1.2%. Skip." };

  const rt = roundTripPct();
  // 2R first, bumped if 2R fails 1.8 after costs.
  let tpPct = stopPct * 2;
  const netAt = (gross: number) => gross - rt;
  if (netAt(tpPct) / stopPct < SOL_MIN_RR) {
    tpPct = stopPct * SOL_MIN_RR + rt;
  }
  if (tpPct > SOL_MAX_TP + 1e-9) return { deny: "Needed target is past 1.5%. No chase." };
  const net = netAt(tpPct);
  if (net < SOL_MIN_NET_TP) return { deny: "Net target under 0.70% after fees. Tape would eat it." };
  const rr = net / stopPct;
  if (rr < SOL_MIN_RR) return { deny: `After-cost R:R ${rr.toFixed(2)} < 1.8.` };

  const stop = dir === "long" ? price * (1 - stopPct) : price * (1 + stopPct);
  const tp1 = dir === "long" ? price * (1 + tpPct) : price * (1 - tpPct);
  return { dir, price, stop, tp1, stopPct, tpPct, rrAfterCost: rr, netTpPct: net };
}

export function decideSol(m15: Candle[], h1: Candle[], book: PaperBook, now: number): SolSignal {
  const price = lastPrice(m15);
  const empty = (reason: string, extra?: Partial<SolSignal>): SolSignal => ({
    ok: false,
    price,
    stop: 0,
    tp1: 0,
    stopPct: 0,
    tpPct: 0,
    rrAfterCost: 0,
    netTpPct: 0,
    reason,
    rsi15: extra?.rsi15 ?? 50,
    rsi1h: extra?.rsi1h ?? 50,
    atrPct: extra?.atrPct ?? 0,
    emaBias1h: extra?.emaBias1h ?? "flat",
  });
  if (m15.length < 60 || h1.length < 40 || price <= 0) return empty("Waiting on SOL/USDT candles.");

  const c15 = closes(m15);
  const c1h = closes(h1);
  const rsi15 = rsi(c15, 14);
  const rsi1h = rsi(c1h, 14);
  const atr15 = atr(m15, 14);
  const ema9_15 = ema(c15, 9);
  const ema21_15 = ema(c15, 21);
  const ema9_1h = ema(c1h, 9);
  const ema21_1h = ema(c1h, 21);
  const volSma = sma(m15.map((c) => c.v), 20);
  const i = m15.length - 1;
  const j = h1.length - 1;
  const r15 = rsi15[i];
  const r1h = rsi1h[j];
  const atrPct = atr15[i] / price;
  const htf = bias(ema9_1h[j], ema21_1h[j]);
  const meta = { rsi15: r15, rsi1h: r1h, atrPct, emaBias1h: htf };

  if (book.positions.some((p) => p.strategy === "sol_usd")) return empty("Already in SOL.", meta);

  const { pnl, entries } = solDayPnl(book, now);
  const equity = book.equityUsd || book.startingUsd;
  if (equity > 0 && pnl / equity >= SOL_DAILY_GOAL) return empty("Daily goal hit (0.5%). Done for the day.", meta);
  if (equity > 0 && pnl / equity <= -SOL_DAILY_LOSS) return empty("Daily loss cap (1.5%). She's off.", meta);
  if (entries >= SOL_MAX_TRADES_DAY) return empty("Four SOL entries today. No overtrade.", meta);

  if (atrPct < 0.002) return empty("15m ATR is asleep. No 1% target without noise.", meta);
  if (atrPct > 0.012) return empty("15m ATR is a spike. Wait for it to settle.", meta);

  const vol = m15[i].v;
  const volAvg = volSma[i] || vol;
  if (volAvg > 0 && vol < volAvg * 0.55) return empty("Volume is dead vs the last 20 bars.", meta);

  const pullbackLong =
    ema9_15[i] > ema21_15[i] &&
    Math.abs(price - ema21_15[i]) / price <= 0.0035 &&
    r15 >= 32 &&
    r15 <= 52;
  const pullbackShort =
    ema9_15[i] < ema21_15[i] &&
    Math.abs(price - ema21_15[i]) / price <= 0.0035 &&
    r15 >= 48 &&
    r15 <= 68;

  const longSetup = (bullishDivergence(m15, rsi15) || pullbackLong) && htf !== "down" && r1h >= 42;
  const shortSetup = (bearishDivergence(m15, rsi15) || pullbackShort) && htf !== "up" && r1h <= 58;

  if (longSetup) {
    const structure = Math.min(lastSwingLow(m15), price * (1 - SOL_MIN_STOP));
    const planned = planTrade("long", price, structure);
    if ("deny" in planned) return empty(planned.deny, meta);
    const why = bullishDivergence(m15, rsi15)
      ? "15m bullish RSI divergence, 1h not against."
      : "Pullback to 15m EMA21 in an uptrend.";
    return { ok: true, ...planned, reason: why, ...meta };
  }
  if (shortSetup) {
    const structure = Math.max(lastSwingHigh(m15), price * (1 + SOL_MIN_STOP));
    const planned = planTrade("short", price, structure);
    if ("deny" in planned) return empty(planned.deny, meta);
    const why = bearishDivergence(m15, rsi15)
      ? "15m bearish RSI divergence, 1h not against."
      : "Reject at 15m EMA21 in a downtrend.";
    return { ok: true, ...planned, reason: why, ...meta };
  }
  return empty("No divergence and no EMA21 pullback. Waiting.", meta);
}

export function publicSol(signal: SolSignal, book: PaperBook, now: number): SolDeskPublic {
  const { pnl, entries } = solDayPnl(book, now);
  const equity = book.equityUsd || book.startingUsd || 1;
  return {
    price: signal.price,
    rsi15: signal.rsi15,
    rsi1h: signal.rsi1h,
    atrPct: signal.atrPct,
    emaBias1h: signal.emaBias1h,
    signal: signal.ok && signal.dir ? signal.dir : "wait",
    reason: signal.reason,
    stopPct: signal.ok ? signal.stopPct : undefined,
    tpPct: signal.ok ? signal.tpPct : undefined,
    rrAfterCost: signal.ok ? signal.rrAfterCost : undefined,
    dailyPnlPct: pnl / equity,
    tradesToday: entries,
  };
}
