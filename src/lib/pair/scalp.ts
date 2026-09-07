import { adx, atr, ema, lastOf, rsi, supertrend, swingPoints, vwap, type Candle } from "../sol/indicators";
import { cashOpenAuction, usEquitySession } from "./knowledge";
import type { Sleeve } from "./catalog";
import type { ScalpFrames, SleeveFrames } from "./frames";
import { hasTape } from "./frames";

const CLIP_MIN = 0.008;

export type Bias = "bull" | "bear" | "flat";
export type Setup = "trend_pullback" | "range_fade" | "momentum" | "none";

export type ScalpRead = {
  sleeve: Exclude<Sleeve, "USDC">;
  buy: number;
  sell: number;
  bias: Bias;
  setup: Setup;
  rsi: number;
  atrPct: number;
  ret15m: number;
  ret1h: number;
  reason: string;
  why: string[];
};

function ret(cs: Candle[], bars: number): number {
  if (cs.length <= bars) return 0;
  const a = cs[cs.length - 1 - bars].c;
  const b = cs[cs.length - 1].c;
  return a > 0 ? b / a - 1 : 0;
}

function taggedThenReclaim(cs: Candle[], level: number): boolean {
  if (cs.length < 4 || !(level > 0)) return false;
  const last = cs[cs.length - 1];
  const prev = cs.slice(-6, -1);
  const touched = prev.some((c) => c.l <= level * 1.002);
  return touched && last.c > level && last.c >= last.o;
}

function bounceOffDip(cs: Candle[]): boolean {
  if (cs.length < 5) return false;
  const last = cs[cs.length - 1];
  const a = cs[cs.length - 4].c;
  const b = cs[cs.length - 2].c;
  if (!(a > 0 && b > 0)) return false;
  const dip = b / a - 1;
  const bounce = last.c / b - 1;
  return dip <= -0.002 && bounce >= 0.0012 && last.c >= last.o;
}

function discount(cs: Candle[], live: number): number {
  const slice = cs.slice(-40);
  if (slice.length < 8) return 0.5;
  const hi = Math.max(...slice.map((c) => c.h));
  const lo = Math.min(...slice.map((c) => c.l));
  const span = hi - lo;
  if (span <= 0) return 0.5;
  return (live - lo) / span;
}

function structureBull(cs: Candle[]): boolean {
  const { lows } = swingPoints(cs, 2);
  if (lows.length < 2) return false;
  const a = lows[lows.length - 2];
  const b = lows[lows.length - 1];
  return b.price > a.price * 1.0005;
}

function emaBias(cs: Candle[], fastN = 9, slowN = 21): Bias {
  if (cs.length < slowN + 2) return "flat";
  const closes = cs.map((c) => c.c);
  const f = lastOf(ema(closes, fastN));
  const s = lastOf(ema(closes, slowN));
  if (f > s * 1.001) return "bull";
  if (f < s * 0.999) return "bear";
  return "flat";
}

function dailyBias(cs: Candle[], live: number): Bias {
  if (cs.length < 30) return "flat";
  const e21 = lastOf(ema(cs.map((c) => c.c), 21));
  const e50 = lastOf(ema(cs.map((c) => c.c), 50), e21);
  if (live > e21 && e21 >= e50 * 0.998) return "bull";
  if (live < e21 && e21 <= e50 * 1.002) return "bear";
  return "flat";
}

/**
 * HTF (Daily + 4H) must agree. LTF (5m/15m) times the clip.
 * LuxAlgo-style: only long in discount while Daily/4H is bull.
 * ChartPrime/AlgoAlpha-style: EMA 9/21 + SuperTrend + ADX regime + VWAP reclaim.
 * Spot only — bear HTF means sit in USDC, never short.
 */
export function scoreScalp(
  sleeve: Exclude<Sleeve, "USDC">,
  frames: SleeveFrames,
  live: number,
  now: number,
): ScalpRead | null {
  if (!(live > 0) || !hasTape(frames)) return null;
  const m15 = frames.m15;
  const m5 = frames.m5.length >= 16 ? frames.m5 : m15;
  const h4 = frames.h4.length >= 16 ? frames.h4 : m15;
  const d1 = frames.d1;
  const closes15 = m15.map((c) => c.c).concat(live);
  const rsiN = lastOf(rsi(closes15, 14), 50);
  const e9 = lastOf(ema(closes15, 9), live);
  const e21 = lastOf(ema(closes15, 21), live);
  const macd = e9 - lastOf(ema(closes15, 21));
  const prevFast = ema(closes15, 9);
  const prevSlow = ema(closes15, 21);
  const macdUp =
    prevFast.length >= 2 && prevSlow.length >= 2
      ? e9 - lastOf(prevSlow) >= prevFast[prevFast.length - 2] - prevSlow[prevSlow.length - 2]
      : macd > 0;
  const atr15 = lastOf(atr(m15, 14), live * 0.01);
  const atr4 = lastOf(atr(h4, 14), live * 0.012);
  const atrPct = live > 0 ? atr15 / live : 0.01;
  const atr4Pct = live > 0 ? atr4 / live : 0.012;
  const st = supertrend(m15, 10, 3);
  const dmi = adx(m15, 14);
  const vw = vwap(m5.slice(-80));
  const daily = dailyBias(d1, live);
  const htf = emaBias(h4, 9, 21);
  const session = usEquitySession(now);
  const auction = cashOpenAuction(now);
  const equity = sleeve === "SPYx" || sleeve === "QQQx";
  const ret15m = ret(m15, 1);
  const ret1h = ret(m15, Math.min(4, m15.length - 1));
  const ret5m = ret(m5, 1);
  const disc = discount(h4, live);
  const trending = dmi.adx >= 14;
  const room = atr4Pct >= CLIP_MIN * 0.45 || atrPct * 3 >= CLIP_MIN * 0.7;
  const pullback =
    taggedThenReclaim(m15, e9) ||
    taggedThenReclaim(m5, vw) ||
    taggedThenReclaim(m15, vw) ||
    bounceOffDip(m15);
  const bounce5 = ret5m > 0.0008 && ret15m > -0.004;
  const hl = structureBull(m15);
  const aligned = e9 > e21 && live > e9;
  const lastBar = m15[m15.length - 1];
  const green = lastBar && lastBar.c >= lastBar.o;

  let bias: Bias = "flat";
  if (daily === "bear" && htf === "bear") bias = "bear";
  else if (daily === "bull" || htf === "bull") bias = "bull";
  else if (daily === "bear" || htf === "bear") bias = "bear";

  let buy = 0;
  const why: string[] = [];
  let setup: Setup = "none";

  if (bias === "bear") {
    buy = 0;
  } else if (pullback && st.dir !== -1 && (aligned || bias === "bull")) {
    setup = "trend_pullback";
    buy += 0.22;
    why.push(bias === "bull" ? "HTF bull" : "15m aligned");
    buy += 0.26;
    why.push("15m reclaim");
    if (hl) {
      buy += 0.08;
      why.push("HL structure");
    }
    if (macdUp) buy += 0.06;
    if (rsiN >= 32 && rsiN <= 68) buy += 0.06;
    if (disc <= 0.7) buy += 0.08;
    if (room) buy += 0.08;
    if (st.dir === 1) buy += 0.06;
  } else if (aligned && st.dir === 1 && green && rsiN >= 40 && rsiN <= 64 && ret15m > 0.001 && ret15m < 0.007) {
    setup = "momentum";
    buy += 0.2;
    why.push("15m momentum");
    if (bias === "bull") buy += 0.12;
    if (live > vw) buy += 0.08;
    if (macdUp) buy += 0.06;
    if (room) buy += 0.08;
    if (hl) buy += 0.06;
  } else if (!trending && (disc <= 0.38 || rsiN <= 40) && bounce5 && st.dir !== -1) {
    setup = "range_fade";
    buy += 0.2;
    why.push("range fade");
    if (disc <= 0.35) {
      buy += 0.14;
      why.push("discount");
    }
    if (rsiN <= 42 && rsiN >= 28) buy += 0.1;
    if (bounce5) buy += 0.12;
    if (bias === "bull") buy += 0.08;
    if (room) buy += 0.08;
  }

  if (setup === "none" && rsiN > 70) buy -= 0.4;
  if (ret15m < -0.022 || ret1h < -0.035) buy -= 0.5;
  if (equity && auction) buy -= 0.28;
  if (equity && session === "weekend") buy -= 0.45;
  if (equity && session === "after_hours") buy -= 0.08;
  buy = Math.max(0, Math.min(1, buy));

  let sell = 0;
  if (rsiN >= 72) sell += 0.3;
  if (st.dir === -1) sell += 0.25;
  if (htf === "bear") sell += 0.2;
  if (ret15m < -0.006 && ret5m < 0) sell += 0.2;
  sell = Math.max(0, Math.min(1, sell));

  const reason =
    buy >= 0.34
      ? `Buy ${sleeve} · ${why.slice(0, 3).join(" · ") || setup}`
      : `${sleeve} ${bias} · ${setup === "none" ? "no setup" : setup} · ADX ${dmi.adx.toFixed(0)}`;

  return {
    sleeve,
    buy,
    sell,
    bias,
    setup,
    rsi: rsiN,
    atrPct,
    ret15m,
    ret1h,
    reason,
    why,
  };
}

export function scoreAll(frames: ScalpFrames | undefined, liveOf: (s: Exclude<Sleeve, "USDC">) => number, now: number): ScalpRead[] {
  if (!frames) return [];
  const out: ScalpRead[] = [];
  for (const s of ["SOL", "SPYx", "QQQx", "GLDx"] as const) {
    const row = scoreScalp(s, frames[s], liveOf(s), now);
    if (row) out.push(row);
  }
  return out;
}
