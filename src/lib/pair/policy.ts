/**
 * Trade policy. Z-score stretch is one input, not the trade.
 * Gates come from how these charts actually move: SOL knives, SPY/QQQ cash-session
 * fades, gold safe-haven runs, fee drag, and sleeve concentration.
 */

import type { Sleeve, TradePair } from "./catalog";
import { GOLD_HISTORY, NDX_HISTORY, SOL_HISTORY, SPX_HISTORY, type HistoryStudy, type SessionKind } from "./knowledge";
import type { RatioRead, RatioSample } from "./ratio";
import { samplePx } from "./ratio";
import { PAIR_FEE_BPS, PAIR_SLIP_BPS, PROTOCOL_FEE_BPS } from "../config";

export type PolicyIn = {
  pair: TradePair;
  from: Sleeve;
  to: Sleeve;
  high: boolean;
  read: RatioRead;
  ext7: number;
  session: SessionKind;
  study: HistoryStudy;
  equity: number;
  fromUsd: number;
  toUsd: number;
  clipUsd: number;
  impactPct: number;
  samples: RatioSample[];
  now: number;
  /** swing = 7d/24h band. pulse = 15m–1h relative move (the 1% tape). */
  mode?: "swing" | "pulse";
  rel1h?: number;
  horizon?: string;
};

export type PolicyOut =
  | { ok: false; reason: string }
  | { ok: true; score: number; clipUsd: number; reason: string };

export function sleeveReturn(samples: RatioSample[], sleeve: Sleeve, now: number, ms: number): number {
  const window = samples.filter((s) => now - s.t <= ms && samplePx(s, sleeve) > 0);
  if (window.length < 2) return 0;
  const a = samplePx(window[0], sleeve);
  const b = samplePx(window[window.length - 1], sleeve);
  return a > 0 ? b / a - 1 : 0;
}

function ret(samples: RatioSample[], sleeve: Sleeve, now: number, ms: number): number {
  return sleeveReturn(samples, sleeve, now, ms);
}

export function sampleCount(samples: RatioSample[], now: number, ms: number): number {
  return samples.filter((s) => now - s.t <= ms).length;
}

function sleeveRet24(samples: RatioSample[], sleeve: Sleeve, now: number, study: HistoryStudy): number {
  if (sleeve === "SOL" && study.solRet24h != null) return study.solRet24h;
  if (sleeve === "SPYx" && study.spyRet24h != null) return study.spyRet24h;
  if (sleeve === "QQQx" && study.qqqRet24h != null) return study.qqqRet24h;
  if (sleeve === "GLDx" && study.gldRet24h != null) return study.gldRet24h;
  if (sleeve === "USDC") return 0;
  return ret(samples, sleeve, now, 24 * 60 * 60 * 1000);
}

function typicalDay(sleeve: Sleeve, study: HistoryStudy): number {
  if (sleeve === "SOL") return study.solMedianDailyRangePct || SOL_HISTORY.medianDailyRangePct;
  if (sleeve === "SPYx") return study.spyMedianDailyRangePct || SPX_HISTORY.typicalDailyRangePct;
  if (sleeve === "QQQx") return study.qqqMedianDailyRangePct || NDX_HISTORY.typicalDailyRangePct;
  if (sleeve === "GLDx") return study.gldMedianDailyRangePct || GOLD_HISTORY.typicalDailyRangePct;
  return 0.002;
}

function knifePct(sleeve: Sleeve): number {
  if (sleeve === "SOL") return SOL_HISTORY.p80DailyRangePct;
  if (sleeve === "SPYx") return SPX_HISTORY.knifeDayPct;
  if (sleeve === "QQQx") return NDX_HISTORY.knifeDayPct;
  if (sleeve === "GLDx") return GOLD_HISTORY.knifeDayPct;
  return 0.02;
}

/** Round-trip bps she must beat: venue + protocol 10bps + slip + impact. */
export function roundTripBps(impactPct = 0): number {
  return PAIR_FEE_BPS + PROTOCOL_FEE_BPS + PAIR_SLIP_BPS + Math.round(Math.max(0, impactPct) * 10_000);
}

export function enrichStudy(study: HistoryStudy, samples: RatioSample[], now: number): HistoryStudy {
  if (!samples.length) return study;
  return {
    ...study,
    solRet24h: ret(samples, "SOL", now, 24 * 60 * 60 * 1000),
    spyRet24h: ret(samples, "SPYx", now, 24 * 60 * 60 * 1000),
    qqqRet24h: ret(samples, "QQQx", now, 24 * 60 * 60 * 1000),
    gldRet24h: ret(samples, "GLDx", now, 24 * 60 * 60 * 1000),
    solRet7d: ret(samples, "SOL", now, 7 * 24 * 60 * 60 * 1000),
  };
}

export function reviewTrade(p: PolicyIn): PolicyOut {
  const { pair, from, to, high, read, ext7, session, study, equity, toUsd, clipUsd, impactPct, samples, now } = p;
  const pulse = p.mode === "pulse";
  const sol24 = sleeveRet24(samples, "SOL", now, study);
  const spy24 = sleeveRet24(samples, "SPYx", now, study);
  const qqq24 = sleeveRet24(samples, "QQQx", now, study);
  const gld24 = sleeveRet24(samples, "GLDx", now, study);
  const sol7 = study.solRet7d ?? ret(samples, "SOL", now, 7 * 24 * 60 * 60 * 1000);
  const atr = study.solAtr15mPct || SOL_HISTORY.atr15mPct;
  const rt = roundTripBps(impactPct) / 10_000;
  const to24 = sleeveRet24(samples, to, now, study);
  const from24 = sleeveRet24(samples, from, now, study);

  if (!pulse && read.n7 < 12) return { ok: false, reason: "Not enough history on this pair." };
  if (pulse && sampleCount(samples, now, 60 * 60 * 1000) < 3) {
    return { ok: false, reason: "Need a bit more short-tape history." };
  }

  // Crash / knife: do not buy an asset that already fell past a typical worst day.
  if (to !== "USDC" && to24 < -knifePct(to)) {
    return {
      ok: false,
      reason: `${pair.right === to ? pair.rightName : pair.leftName} already dropped ${(to24 * 100).toFixed(1)}% in 24h — past a normal day. She will not catch that knife.`,
    };
  }

  // Risk-off: SOL dumping with equities. Buying SOL here is the 2022/FTX mistake.
  const riskOff = sol24 < -0.04 && (spy24 < -0.012 || qqq24 < -0.015);
  if (riskOff && to === "SOL") {
    return { ok: false, reason: "Risk-off tape (SOL and stocks both dumping). She does not buy SOL into that." };
  }

  // Safe-haven: gold bid while SOL dumps — do not fade gold.
  const haven = gld24 > GOLD_HISTORY.safeHavenSpikePct && sol24 < -0.03;
  if (haven && from === "GLDx") {
    return { ok: false, reason: "Gold is catching a bid while SOL dumps. She does not fade that safe-haven run." };
  }

  if (!pulse) {
    if (pair.id === "usdc-gldx" && Math.abs(read.z7) < 1.6) {
      return { ok: false, reason: "Gold vs USDC needs a bigger stretch than stocks. History says it trends." };
    }
    if (pair.id === "spyx-qqqx" && Math.abs(read.z7) < 1.7) {
      return { ok: false, reason: "Nasdaq vs S&P is a tight pair. Stretch is not enough after costs." };
    }
    if (pair.id === "sol-usdc") {
      if (sol7 > 0.12 && from === "SOL" && Math.abs(read.z7) < 2) {
        return { ok: false, reason: "SOL is in a 7-day uptrend. She will not fade it vs USDC on a modest stretch." };
      }
      if (sol7 < -0.12 && to === "SOL" && Math.abs(read.z7) < 2) {
        return { ok: false, reason: "SOL is in a 7-day downtrend. She will not buy the dip vs USDC yet." };
      }
      if (atr > 0.012) {
        return { ok: false, reason: `SOL 15m noise is ${(atr * 100).toFixed(2)}% — too hot to fade vs USDC.` };
      }
    }
    if (session !== "cash" && (pair.left === "SPYx" || pair.right === "SPYx" || pair.left === "QQQx" || pair.right === "QQQx")) {
      if (Math.abs(read.z7) < 1.85) {
        return { ok: false, reason: "US cash market is closed. Tokenized S&P/Nasdaq can drift. She waits for a bigger stretch." };
      }
    }
  }

  // Concentration: don't pile into a sleeve already > 38% of the book.
  if (equity > 0 && toUsd / equity > 0.38) {
    return { ok: false, reason: `Already heavy in ${to}. She will not add more.` };
  }

  // Edge must cover round-trip (venue + 0.1% protocol + slip + impact) by 2.5×.
  if (ext7 < rt * 2.5) {
    return {
      ok: false,
      reason: `Move is ${(ext7 * 100).toFixed(2)}% — fees would eat it (round-trip ~${(rt * 100).toFixed(2)}%). Sitting.`,
    };
  }

  // Need both windows agreeing (already required by caller) plus not fading a blow-off chase.
  if (from !== "USDC" && from24 > typicalDay(from, study) * 2.2 && Math.abs(read.z7) < 1.8) {
    return { ok: false, reason: `${from} already ran ${(from24 * 100).toFixed(1)}% today. She will not chase the rest.` };
  }

  let score = pulse ? Math.abs(ext7) * 900 : Math.abs(read.z7) * 10 + Math.abs(read.z24) * 4;
  let clip = clipUsd;
  if (!pulse && atr > 0.008 && (from === "SOL" || to === "SOL")) {
    clip *= 0.7;
    score -= 4;
  }
  if (pulse) clip = Math.min(clip, clipUsd);
  if (session === "cash" && (pair.left === "SPYx" || pair.right === "SPYx" || pair.left === "QQQx" || pair.right === "QQQx")) {
    score += 3;
  }
  if (!pulse && (pair.id === "usdc-gldx" || pair.id === "sol-gldx")) score -= 1;
  score += Math.min(8, ext7 / Math.max(rt, 0.0004));

  if (pulse) {
    const leftN = pair.leftName;
    const rightN = pair.rightName;
    const hz = p.horizon === "m1" ? "1m" : p.horizon === "m5" ? "5m" : p.horizon === "m15" ? "15m" : "1h";
    const why = `Short tape (${hz}): ${leftN} vs ${rightN} moved ${(ext7 * 100).toFixed(2)}% apart. ${
      high ? `${leftN} ran ahead` : `${leftN} lagged`
    }. Selling a slice of ${from} for ${to} — fees are ~${(rt * 100).toFixed(2)}%, so this can clear ~1%.`;
    return { ok: true, score, clipUsd: Math.max(15, clip), reason: why };
  }

  const side = high
    ? `${pair.leftName} is rich vs ${pair.rightName}`
    : `${pair.leftName} is cheap vs ${pair.rightName}`;
  const tape = `SOL 24h ${(sol24 * 100).toFixed(1)}%, stocks ${(spy24 * 100).toFixed(1)}%/${(qqq24 * 100).toFixed(1)}%, gold ${(gld24 * 100).toFixed(1)}%.`;
  const why = `${side} (7d ${(read.z7 >= 0 ? "+" : "")}${read.z7.toFixed(2)}σ, 24h ${(read.z24 >= 0 ? "+" : "")}${read.z24.toFixed(2)}σ). ${tape} Edge covers fees. Selling a slice of ${from} for ${to}.`;

  return { ok: true, score, clipUsd: Math.max(15, clip), reason: why };
}
