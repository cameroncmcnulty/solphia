import { rsi, ema, atr, type Candle } from "../sol/indicators";
import type { Sleeve } from "./catalog";
import type { HistoryStudy } from "./knowledge";
import type { PairPrices } from "./prices";
import { samplePx, type RatioSample } from "./ratio";
import { relAt, type ShortTape } from "./shortTape";
import { PAIR_FEE_BPS, PAIR_SLIP_BPS, PROTOCOL_FEE_BPS } from "../config";
import { cashOpenAuction, usEquitySession, type SessionKind } from "./knowledge";
import type { ScalpFrames } from "./frames";
import { scoreScalp } from "./scalp";
import type { Bias, Setup } from "./scalp";

export const RISK_SLEEVES: Exclude<Sleeve, "USDC">[] = ["SOL", "SPYx", "QQQx", "GLDx"];

export const ROUND_TRIP = (PAIR_FEE_BPS + PROTOCOL_FEE_BPS + PAIR_SLIP_BPS) * 2 * 0.0001;

/** Bank a real scalp after fees. 0.5% died to round-trip. ~1.2% SOL / ~0.8% books. */
export const CLIP_MIN = 0.008;
export const CLIP_AIM = 0.012;
export const CLIP_HARD = 0.02;
/** 1h dump this large is a knife, not a 1% dip. */
export const KNIFE_1H = 0.035;

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
  bias?: Bias;
  setup?: Setup;
};

export type SleeveLearn = {
  trades: number;
  wins: number;
  pnlUsd: number;
  buyNeed: number;
  trailK: number;
};

export const DEFAULT_LEARN: SleeveLearn = { trades: 0, wins: 0, pnlUsd: 0, buyNeed: 0.32, trailK: 0.55 };

/** A 15m reclaim / momentum clip — not RSI alone. */
export function needOf(learn?: SleeveLearn, sleeve?: Exclude<Sleeve, "USDC">): number {
  const fallback = sleeve === "SOL" ? 0.36 : 0.22;
  const n = learn?.buyNeed ?? fallback;
  const floor = sleeve === "SOL" ? 0.34 : 0.18;
  const cap = sleeve === "SOL" ? 0.5 : 0.34;
  return Math.min(cap, Math.max(floor, n));
}

/** SOL aims ~1.2%. Equities/gold bank a fee-cleared ~80 bps, then trail the rest. */
export function clipAimOf(sleeve: Exclude<Sleeve, "USDC">, atrPct = 0.01): number {
  const floor = ROUND_TRIP + 0.0025;
  if (sleeve === "SOL") return Math.max(CLIP_AIM, floor, Math.min(0.016, atrPct * 1.4));
  return Math.max(0.008, Math.min(0.012, Math.max(floor, atrPct * 1.2)));
}

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

function liveOf(sleeve: Exclude<Sleeve, "USDC">, prices: PairPrices): number {
  if (sleeve === "SOL") return prices.sol.usd;
  if (sleeve === "SPYx") return prices.spyx.usd;
  if (sleeve === "QQQx") return prices.qqqx.usd;
  return prices.gldx.usd;
}

function ret24Of(sleeve: Exclude<Sleeve, "USDC">, study: HistoryStudy, series: number[]): number {
  if (sleeve === "SOL" && study.solRet24h != null) return study.solRet24h;
  if (sleeve === "SPYx" && study.spyRet24h != null) return study.spyRet24h;
  if (sleeve === "QQQx" && study.qqqRet24h != null) return study.qqqRet24h;
  if (sleeve === "GLDx" && study.gldRet24h != null) return study.gldRet24h;
  if (series.length >= 20) return series[series.length - 1] / series[Math.max(0, series.length - 20)] - 1;
  return 0;
}

export function readAsset(
  sleeve: Exclude<Sleeve, "USDC">,
  samples: RatioSample[],
  prices: PairPrices,
  study: HistoryStudy,
  now: number,
  tape?: ShortTape,
  learn?: SleeveLearn,
  frames?: ScalpFrames,
): AssetSignal | null {
  const candles = bucketCandles(samples, sleeve);
  const closes = candles.map((c) => c.c);
  const live = liveOf(sleeve, prices);
  if (!(live > 0) || closes.length < 8) return null;
  const series = closes.concat(live);
  const r = rsi(series, 14);
  const e12 = ema(series, 12);
  const e26 = ema(series, 26);
  const a = atr(candles.length >= 8 ? candles : candles.concat([{ t: now, o: live, h: live, l: live, c: live, v: 1 }]), 14);
  const rsiN = r[r.length - 1] ?? 50;
  const fast = e12[e12.length - 1] ?? live;
  const slow = e26[e26.length - 1] ?? live;
  const macd = fast - slow;
  const prevMacd = (e12[e12.length - 2] ?? fast) - (e26[e26.length - 2] ?? slow);
  const atrN = a[a.length - 1] || live * 0.01;
  const atrPct = live > 0 ? atrN / live : 0.01;
  const dt =
    candles.length >= 2 ? Math.max(60_000, candles[candles.length - 1].t - candles[candles.length - 2].t) : 3_600_000;
  const bars1h = Math.max(1, Math.round(3_600_000 / dt));
  const ret1hSeries =
    series.length > bars1h ? series[series.length - 1] / series[series.length - 1 - bars1h] - 1 : 0;
  const ret15mTape = relAt(tape, sleeve, "USDC", "m15");
  const ret1hTape = relAt(tape, sleeve, "USDC", "h1");
  const ret15m = tape ? ret15mTape : 0;
  const ret1h = tape && Math.abs(ret1hTape) > 1e-6 ? ret1hTape : ret1hSeries;
  const ret24h = ret24Of(sleeve, study, series);
  const z24 = zScore(series);
  const trend: AssetSignal["trend"] = fast > slow * 1.001 ? "up" : fast < slow * 0.999 ? "down" : "flat";
  const session = usEquitySession(now);
  const auction = cashOpenAuction(now);
  const need = needOf(learn, sleeve);
  const equity = sleeve === "SPYx" || sleeve === "QQQx";
  const scalp = frames ? scoreScalp(sleeve, frames[sleeve], live, now) : null;

  let buy = 0;
  const why: string[] = [];
  if (scalp) {
    buy = scalp.buy;
    why.push(...scalp.why);
  } else {
    const cheapPct = Math.max(0, -ret15m, -ret1h);
    const bounce = ret15m > 0.0012 && ret1h < -0.003;
    if (trend === "up" && bounce && cheapPct >= ROUND_TRIP + 0.0025) {
      buy += 0.28;
      why.push("hourly pullback");
    }
    if (macd > prevMacd && trend === "up") buy += 0.08;
    if (rsiN >= 38 && rsiN <= 58) buy += 0.06;
    if (rsiN > 68) buy -= 0.4;
    if (ret1h < -KNIFE_1H || ret24h < -0.08) buy -= 0.55;
    if (auction && equity) buy -= 0.3;
    if (session === "weekend" && equity) buy -= 0.45;
    buy = Math.max(0, Math.min(1, buy));
  }

  let sell = 0;
  const sWhy: string[] = [];
  if (rsiN >= 70) {
    sell += 0.35;
    sWhy.push("RSI hot");
  }
  if (ret1h >= CLIP_AIM) {
    sell += 0.28;
    sWhy.push("clip in");
  }
  if (z24 > 1.15) {
    sell += 0.18;
    sWhy.push("stretched");
  }
  if (macd < 0 && macd < prevMacd) {
    sell += 0.16;
    sWhy.push("MACD fade");
  }
  if (ret15m < -0.004 && ret1h < 0) {
    sell += 0.18;
    sWhy.push("tape rolled");
  }
  sell = Math.max(0, Math.min(1, sell));

  const reason =
    scalp && scalp.buy >= need
      ? scalp.reason
      : buy >= need
        ? `Buy ${sleeve} · ${why.slice(0, 3).join(" · ") || "clip"}`
        : sell >= 0.45
          ? `Exit ${sleeve} · ${sWhy.slice(0, 2).join(" · ")}`
          : scalp
            ? scalp.reason
            : `${sleeve} quiet · RSI ${rsiN.toFixed(0)} · ${(ret1h * 100).toFixed(1)}% 1h`;

  return {
    sleeve,
    px: live,
    rsi: scalp?.rsi ?? rsiN,
    emaFast: fast,
    emaSlow: slow,
    macd,
    trend,
    atrPct: scalp?.atrPct || atrPct,
    ret15m: scalp?.ret15m ?? ret15m,
    ret1h: scalp?.ret1h ?? ret1h,
    ret24h,
    z24,
    buy,
    sell: Math.max(sell, scalp?.sell || 0),
    reason,
    bias: scalp?.bias,
    setup: scalp?.setup,
  };
}

/** Room under the peak. Bull trends get 3%+ so a SOL run is not scalped to death. */
export function trailGiveback(peakProfit: number, atrPct: number, trailK: number, swing = false): number {
  if (swing) {
    if (peakProfit >= 0.12) return 0.025;
    if (peakProfit >= 0.06) return 0.03;
    return 0.034;
  }
  const atr = Math.max(atrPct, 0.006);
  const wide = Math.max(0.01, Math.min(0.018, atr * (0.9 + (trailK || 0.55))));
  if (peakProfit >= 0.04) return Math.min(wide * 0.35, 0.007);
  if (peakProfit >= 0.025) return Math.min(wide * 0.45, 0.009);
  if (peakProfit >= CLIP_AIM) return Math.min(wide * 0.7, 0.012);
  return wide;
}

export function nextTrail(opts: {
  entryPx: number;
  peakPx: number;
  stopPx: number;
  armed: boolean;
  px: number;
  atrPct: number;
  trailK: number;
  swing?: boolean;
}): { peakPx: number; stopPx: number; armed: boolean } {
  const breakeven = opts.entryPx * (1 + ROUND_TRIP);
  let { peakPx, stopPx, armed } = opts;
  peakPx = Math.max(peakPx, opts.px);
  const profit = opts.entryPx > 0 ? opts.px / opts.entryPx - 1 : 0;
  const peakProfit = opts.entryPx > 0 ? peakPx / opts.entryPx - 1 : 0;
  const swing = Boolean(opts.swing);
  const armAt = swing ? CLIP_MIN : CLIP_AIM;
  if (!armed && profit >= armAt) {
    armed = true;
    stopPx = Math.max(stopPx, swing ? breakeven : opts.entryPx * (1 + CLIP_AIM * 0.85));
  }
  if (armed) {
    const k = trailGiveback(peakProfit, opts.atrPct, opts.trailK, swing);
    const raw = peakPx * (1 - k);
    let lock = 0;
    if (!swing) {
      lock = opts.entryPx * (1 + CLIP_MIN);
      if (peakProfit >= 0.02) lock = opts.entryPx * (1 + CLIP_AIM);
      if (peakProfit >= 0.035) lock = opts.entryPx * (1 + 0.02);
    } else if (peakProfit >= 0.04) {
      lock = opts.entryPx * (1 + 0.015);
    } else if (peakProfit >= 0.02) {
      lock = breakeven;
    }
    stopPx = Math.max(stopPx, raw);
    if (lock > 0) stopPx = Math.max(stopPx, lock);
  }
  return { peakPx, stopPx, armed };
}

export function noteExit(learn: SleeveLearn, pnlUsd: number): SleeveLearn {
  const trades = learn.trades + 1;
  const wins = learn.wins + (pnlUsd > 0 ? 1 : 0);
  const pnl = learn.pnlUsd + pnlUsd;
  const recentWin = trades >= 5 ? wins / trades : pnlUsd > 0 ? 0.55 : 0.45;
  let buyNeed = learn.buyNeed;
  if (pnlUsd < 0) buyNeed = Math.min(0.5, buyNeed + 0.02);
  else buyNeed = Math.max(0.28, buyNeed - 0.015);
  if (recentWin < 0.4) buyNeed = Math.min(0.5, buyNeed + 0.02);
  let trailK = learn.trailK;
  if (pnlUsd < 0) trailK = Math.min(0.9, trailK + 0.04);
  else trailK = Math.max(0.4, trailK - 0.03);
  return { trades, wins, pnlUsd: pnl, buyNeed, trailK };
}

export function sessionOf(now: number): SessionKind {
  return usEquitySession(now);
}
