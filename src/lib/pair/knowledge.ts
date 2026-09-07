/**
 * Priors from SOL, S&P 500, Nasdaq-100, and gold. The policy layer reads these.
 * Live Yahoo / Binance study overwrites the numeric fields when the fetch works.
 *
 * SOL (Binance SOLUSDT, ~1000 daily bars):
 *   median daily range 5.75%, mean 6.62%, p80 8.84%
 *   15m ATR(14) ≈ 0.46% — a 0.5% stop sits on noise
 *   Trends hard in macro risk-off (LUNA, FTX). Those days did not snap back in 24h.
 *   Mean-reverts vs USD on 2–10d in a range. Do not catch a knife past ~p80 day.
 *
 * S&P 500 / SPY:
 *   long-run ~10%/yr, realized vol 15–20%, daily range ~0.8–1.1%
 *   Fades 1–2σ on 1–5d in a range. Crash regimes (1987, 2008, 2020) grind.
 *   Tokenized SPYx is NOT the NYSE print after 16:00 ET or weekends.
 *
 * Nasdaq-100 / QQQ:
 *   Higher beta than SPY (~1.2–1.4×), fatter tech tails, 2022 bear was a grind.
 *   Same cash-session rules. Cross vs SPY is a small-edge pair — demand more stretch.
 *
 * Gold / GLD:
 *   Daily range ~0.8–1.2%. Trends with real rates. Safe-haven spikes can run days.
 *   Weaker mean-revert vs USD than equities. Do not fade gold on a SOL crash bid.
 *   Tokenized GLDx can be thin on weekends.
 */

export const SOL_HISTORY = {
  medianDailyRangePct: 0.0575,
  meanDailyRangePct: 0.0662,
  p80DailyRangePct: 0.0884,
  atr15mPct: 0.0046,
  noiseFloorPct: 0.005,
} as const;

export const SPX_HISTORY = {
  longRunNominalPct: 0.1,
  realizedVolPct: 0.17,
  typicalDailyRangePct: 0.009,
  medianAbsReturnPct: 0.005,
  crash1987: -0.205,
  bounce2008: 0.116,
  crash2020: -0.12,
  knifeDayPct: 0.025,
  afterHoursDivergence: true,
} as const;

export const NDX_HISTORY = {
  typicalDailyRangePct: 0.012,
  betaVsSpy: 1.25,
  grind2022: -0.33,
  knifeDayPct: 0.03,
} as const;

export const GOLD_HISTORY = {
  typicalDailyRangePct: 0.01,
  medianAbsReturnPct: 0.005,
  safeHavenSpikePct: 0.015,
  weakerMeanRevert: true,
  knifeDayPct: 0.035,
} as const;

export type SessionKind = "cash" | "after_hours" | "weekend";

/** US cash equity session, America/New_York. */
export function usEquitySession(now = Date.now()): SessionKind {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const mins = hour * 60 + minute;
  if (weekday === "Sat" || weekday === "Sun") return "weekend";
  // 09:30–16:00 ET
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return "cash";
  return "after_hours";
}

/** First 15 minutes of the cash open — auction/gap, sit. */
export function cashOpenAuction(now = Date.now()): boolean {
  if (usEquitySession(now) !== "cash") return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour === 9 && minute < 45;
}

export function sessionBandMult(session: SessionKind): number {
  if (session === "weekend") return 1.6;
  if (session === "after_hours") return 1.4;
  return 1;
}

export type HistoryStudy = {
  solMedianDailyRangePct: number;
  spyMedianDailyRangePct: number;
  qqqMedianDailyRangePct: number;
  gldMedianDailyRangePct: number;
  solAtr15mPct: number;
  samples: number;
  note: string;
  solRet24h?: number;
  spyRet24h?: number;
  qqqRet24h?: number;
  gldRet24h?: number;
  solRet7d?: number;
};

export const DEFAULT_STUDY: HistoryStudy = {
  solMedianDailyRangePct: SOL_HISTORY.medianDailyRangePct,
  spyMedianDailyRangePct: SPX_HISTORY.typicalDailyRangePct,
  qqqMedianDailyRangePct: NDX_HISTORY.typicalDailyRangePct,
  gldMedianDailyRangePct: GOLD_HISTORY.typicalDailyRangePct,
  solAtr15mPct: SOL_HISTORY.atr15mPct,
  samples: 0,
  note: "Priors: SOL day ~5.8%. SPY ~0.9%. QQQ ~1.2%. Gold ~1.0%. Fade ranges, not crash days. Tokenized prints diverge after hours.",
};

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function dailyRanges(candles: { h: number; l: number; c: number }[]): number[] {
  return candles.filter((c) => c.c > 0 && c.h >= c.l).map((c) => (c.h - c.l) / c.c);
}

export function mergeStudy(
  solDaily: number[],
  spyDaily: number[],
  atr15mPct: number,
  qqqDaily: number[] = [],
  gldDaily: number[] = [],
): HistoryStudy {
  const sol = solDaily.length >= 30 ? median(solDaily) : SOL_HISTORY.medianDailyRangePct;
  const spy = spyDaily.length >= 30 ? median(spyDaily) : SPX_HISTORY.typicalDailyRangePct;
  const qqq = qqqDaily.length >= 30 ? median(qqqDaily) : NDX_HISTORY.typicalDailyRangePct;
  const gld = gldDaily.length >= 30 ? median(gldDaily) : GOLD_HISTORY.typicalDailyRangePct;
  return {
    solMedianDailyRangePct: sol,
    spyMedianDailyRangePct: spy,
    qqqMedianDailyRangePct: qqq,
    gldMedianDailyRangePct: gld,
    solAtr15mPct: atr15mPct > 0 ? atr15mPct : SOL_HISTORY.atr15mPct,
    samples: solDaily.length + spyDaily.length + qqqDaily.length + gldDaily.length,
    note: `SOL day ${(sol * 100).toFixed(2)}%. SPY ${(spy * 100).toFixed(2)}%. QQQ ${(qqq * 100).toFixed(2)}%. Gold ${(gld * 100).toFixed(2)}%. Fade quiet ranges. Do not catch crash knives. Tokenized prints can diverge after 16:00 ET.`,
  };
}
