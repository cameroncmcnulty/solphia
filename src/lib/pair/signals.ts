import { rsi, ema, atr, type Candle } from "../sol/indicators";
import type { Sleeve } from "./catalog";
import type { HistoryStudy } from "./knowledge";
import type { PairPrices } from "./prices";
import { samplePx, type RatioSample } from "./ratio";
import { relAt, type ShortTape } from "./shortTape";
import { PAIR_FEE_BPS, PAIR_SLIP_BPS, PROTOCOL_FEE_BPS } from "../config";
import { cashOpenAuction, usEquitySession, type SessionKind } from "./knowledge";

export const RISK_SLEEVES: Exclude<Sleeve, "USDC">[] = ["SOL", "SPYx", "QQQx", "GLDx"];

export const ROUND_TRIP = (PAIR_FEE_BPS + PROTOCOL_FEE_BPS + PAIR_SLIP_BPS) * 2 * 0.0001;

export type AssetSignal = {
  sleeve: Exclude<Sleeve, "USDC">;
  px: number;
  rsi: number;
  emaFast: number;
  emaSlow: number;
  macd: number;
  trend: "up" | "down" | "flat";
  atrPct: number;
  ret15m: number;
  ret1h: number;
  ret24h: number;
  z24: number;
  buy: number;
  sell: number;
  reason: string;
};

export type SleeveLearn = {
  trades: number;
  wins: number;
  pnlUsd: number;
  buyNeed: number;
  trailK: number;
};

export const DEFAULT_LEARN: SleeveLearn = { trades: 0, wins: 0, pnlUsd: 0, buyNeed: 0.58, trailK: 1.15 };

export function bucketCandles(samples: RatioSample[], sleeve: Sleeve, ms = 15 * 60 * 1000): Candle[] {
  const map = new Map<number, Candle>();
  for (const s of samples) {
    const px = samplePx(s, sleeve);
    if (!(px > 0)) continue;
    const b = Math.floor(s.t / ms) * ms;
    const prev = map.get(b);
    if (!prev) map.set(b, { t: b, o: px, h: px, l: px, c: px, v: 1 });
    else {
      prev.h = Math.max(prev.h, px);
      prev.l = Math.min(prev.l, px);
      prev.c = px;
      prev.v += 1;
    }
  }
  return [...map.values()].sort((a, b) => a.t - b.t);
}

function zScore(xs: number[]): number {
  if (xs.length < 8) return 0;
  const slice = xs.slice(-24);
  const m = slice.reduce((a, b) => a + b, 0) / slice.length;
  const v = slice.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, slice.length - 1);
  const sd = Math.sqrt(v);
  const last = slice[slice.length - 1];
  return sd > 0 ? (last - m) / sd : 0;
}

export function readAsset(
  sleeve: Exclude<Sleeve, "USDC">,
  samples: RatioSample[],
  prices: PairPrices,
  study: HistoryStudy,
  now: number,
  tape?: ShortTape,
  learn?: SleeveLearn,
): AssetSignal | null {
  const candles = bucketCandles(samples, sleeve);
  const closes = candles.map((c) => c.c);
  const live =
    sleeve === "SOL" ? prices.sol.usd : sleeve === "SPYx" ? prices.spyx.usd : sleeve === "QQQx" ? prices.qqqx.usd : prices.gldx.usd;
  if (!(live > 0) || closes.length < 16) return null;
  const series = closes.concat(live);
  const r = rsi(series, 14);
  const e12 = ema(series, 12);
  const e26 = ema(series, 26);
  const a = atr(candles.length >= 16 ? candles : candles.concat([{ t: now, o: live, h: live, l: live, c: live, v: 1 }]), 14);
  const rsiN = r[r.length - 1] ?? 50;
  const fast = e12[e12.length - 1] ?? live;
  const slow = e26[e26.length - 1] ?? live;
  const macd = fast - slow;
  const prevMacd = (e12[e12.length - 2] ?? fast) - (e26[e26.length - 2] ?? slow);
  const atrN = a[a.length - 1] || live * 0.01;
  const atrPct = live > 0 ? atrN / live : 0.01;
  const ret15m = relAt(tape, sleeve, "USDC", "m15");
  const ret1h = series.length >= 5 ? series[series.length - 1] / series[Math.max(0, series.length - 5)] - 1 : 0;
  const ret24h =
    sleeve === "SOL" && study.solRet24h != null
      ? study.solRet24h
      : sleeve === "SPYx" && study.spyRet24h != null
        ? study.spyRet24h
        : sleeve === "QQQx" && study.qqqRet24h != null
          ? study.qqqRet24h
          : sleeve === "GLDx" && study.gldRet24h != null
            ? study.gldRet24h
            : series.length >= 20
              ? series[series.length - 1] / series[Math.max(0, series.length - 20)] - 1
              : 0;
  const z24 = zScore(series);
  const trend: AssetSignal["trend"] = fast > slow * 1.001 ? "up" : fast < slow * 0.999 ? "down" : "flat";
  const session = usEquitySession(now);
  const auction = cashOpenAuction(now);
  const need = learn?.buyNeed ?? DEFAULT_LEARN.buyNeed;

  let buy = 0;
  const why: string[] = [];
  if (trend === "up") {
    buy += 0.22;
    why.push("EMA12>26");
  }
  if (macd > 0 && macd > prevMacd) {
    buy += 0.18;
    why.push("MACD rising");
  }
  if (rsiN >= 42 && rsiN <= 65) {
    buy += 0.16;
    why.push(`RSI ${rsiN.toFixed(0)}`);
  }
  if (ret15m > 0.003 && ret1h > 0) {
    buy += 0.12;
    why.push("15m bid");
  }
  if (z24 > -0.8 && z24 < 1.6) buy += 0.08;
  if (sleeve === "GLDx" && (study.solRet24h || 0) < -0.025 && ret24h > -0.005) {
    buy += 0.14;
    why.push("gold haven");
  }
  if (sleeve === "SOL" && rsiN < 38 && trend !== "down") {
    buy += 0.08;
    why.push("SOL oversold bounce");
  }
  if (rsiN > 72) buy -= 0.28;
  if (ret1h < -Math.max(0.012, atrPct * 1.4)) buy -= 0.35;
  if (trend === "down" && rsiN < 45) buy -= 0.2;
  if (auction && (sleeve === "SPYx" || sleeve === "QQQx")) buy -= 0.25;
  if (session === "weekend" && (sleeve === "SPYx" || sleeve === "QQQx")) buy -= 0.12;
  if (Math.abs(ret15m) < ROUND_TRIP * 0.5 && Math.abs(ret1h) < ROUND_TRIP) buy -= 0.1;
  buy = Math.max(0, Math.min(1, buy));

  let sell = 0;
  const sWhy: string[] = [];
  if (rsiN >= 74) {
    sell += 0.35;
    sWhy.push("RSI hot");
  }
  if (trend === "down") {
    sell += 0.25;
    sWhy.push("EMA rolled");
  }
  if (macd < 0 && macd < prevMacd) {
    sell += 0.2;
    sWhy.push("MACD fade");
  }
  if (ret15m < -0.004 && ret1h < 0) {
    sell += 0.15;
    sWhy.push("tape rolled");
  }
  sell = Math.max(0, Math.min(1, sell));

  const reason =
    buy >= need
      ? `Buy ${sleeve} · ${why.slice(0, 3).join(" · ") || "stack"}`
      : sell >= 0.45
        ? `Exit ${sleeve} · ${sWhy.slice(0, 2).join(" · ")}`
        : `${sleeve} quiet · RSI ${rsiN.toFixed(0)} · ${trend}`;

  return {
    sleeve,
    px: live,
    rsi: rsiN,
    emaFast: fast,
    emaSlow: slow,
    macd,
    trend,
    atrPct,
    ret15m,
    ret1h,
    ret24h,
    z24,
    buy,
    sell,
    reason,
  };
}

export function nextTrail(opts: {
  entryPx: number;
  peakPx: number;
  stopPx: number;
  armed: boolean;
  px: number;
  atrPct: number;
  trailK: number;
}): { peakPx: number; stopPx: number; armed: boolean } {
  const round = ROUND_TRIP;
  const breakeven = opts.entryPx * (1 + round);
  let { peakPx, stopPx, armed } = opts;
  peakPx = Math.max(peakPx, opts.px);
  const profit = opts.px / opts.entryPx - 1;
  if (!armed && opts.px >= breakeven * 1.001) {
    armed = true;
    stopPx = breakeven;
  }
  if (armed) {
    const k = Math.max(0.004, Math.min(0.02, (opts.trailK || 1.15) * opts.atrPct));
    const raw = peakPx * (1 - k);
    const floor = profit > 0.03 ? peakPx * (1 - k * 0.85) : breakeven;
    stopPx = Math.max(stopPx, raw, floor);
  }
  return { peakPx, stopPx, armed };
}

export function noteExit(learn: SleeveLearn, pnlUsd: number): SleeveLearn {
  const trades = learn.trades + 1;
  const wins = learn.wins + (pnlUsd > 0 ? 1 : 0);
  const pnl = learn.pnlUsd + pnlUsd;
  const recentWin = trades >= 5 ? wins / trades : pnlUsd > 0 ? 0.55 : 0.45;
  let buyNeed = learn.buyNeed;
  if (pnlUsd < 0) buyNeed = Math.min(0.78, buyNeed + 0.03);
  else buyNeed = Math.max(0.45, buyNeed - 0.02);
  if (recentWin < 0.4) buyNeed = Math.min(0.78, buyNeed + 0.02);
  let trailK = learn.trailK;
  if (pnlUsd < 0) trailK = Math.min(1.8, trailK + 0.05);
  else trailK = Math.max(0.85, trailK - 0.03);
  return { trades, wins, pnlUsd: pnl, buyNeed, trailK };
}

export function sessionOf(now: number): SessionKind {
  return usEquitySession(now);
}
