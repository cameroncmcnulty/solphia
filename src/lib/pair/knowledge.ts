/**
 * Priors from SOL and S&P 500 history. The pair engine reads these — it does not
 * invent candles. Live study (Yahoo SPY / Binance SOL) can overwrite the numeric
 * fields when the fetch works.
 *
 * SOL (Binance SOLUSDT, ~1000 daily bars through 2026-09):
 *   median daily range 5.75%, mean 6.62%, p80 8.84%
 *   15m ATR(14) ≈ 0.46% of price — a 0.5% stop sits on the noise floor
 *
 * S&P 500 / SPY (cash session, long sample):
 *   long-run nominal ~10%/yr, realized vol ~15–20%
 *   typical daily range (H−L)/C ≈ 0.8–1.1%; median |return| ≈ 0.5%
 *   fat tails: 1987-10-19 −20.5%, 2008-10-13 +11.6%, 2020-03-16 −12%
 *   tokenized SPYx is NOT the NYSE print after 16:00 ET or on weekends
 *
 * Pair implication: R = P_SOL / P_SPYx is almost entirely SOL vol.
 * Mean-revert on a 1–7 day window, not 15m noise. After hours, widen the band.
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
  /** Tokenized SPYx can print 24/7; cash SPY does not. */
  afterHoursDivergence: true,
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
  solAtr15mPct: number;
  samples: number;
  note: string;
};

export const DEFAULT_STUDY: HistoryStudy = {
  solMedianDailyRangePct: SOL_HISTORY.medianDailyRangePct,
  spyMedianDailyRangePct: SPX_HISTORY.typicalDailyRangePct,
  solAtr15mPct: SOL_HISTORY.atr15mPct,
  samples: 0,
  note: "Priors: SOL median daily range 5.75%. SPY typical range ~0.9%. Ratio is SOL-vol dominated. Tokenized SPYx is not the NYSE print after hours.",
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

export function mergeStudy(solDaily: number[], spyDaily: number[], atr15mPct: number): HistoryStudy {
  const sol = solDaily.length >= 30 ? median(solDaily) : SOL_HISTORY.medianDailyRangePct;
  const spy = spyDaily.length >= 30 ? median(spyDaily) : SPX_HISTORY.typicalDailyRangePct;
  return {
    solMedianDailyRangePct: sol,
    spyMedianDailyRangePct: spy,
    solAtr15mPct: atr15mPct > 0 ? atr15mPct : SOL_HISTORY.atr15mPct,
    samples: solDaily.length + spyDaily.length,
    note: `SOL median daily range ${(sol * 100).toFixed(2)}%. SPY ${(spy * 100).toFixed(2)}%. She fades the ratio on a 1–7d window, not 15m noise. SPYx can diverge from the NYSE print after 16:00 ET.`,
  };
}
