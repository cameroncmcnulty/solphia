import { DEFAULT_AUTO, emptyBook } from "../auto";
import { PAPER_STARTING_USD } from "../config";
import { pack4h, packDaily, type Candle } from "../sol/indicators";
import type {
  BacktestDay,
  BacktestFillLite,
  BacktestMonth,
  BacktestPoint,
  BacktestReport,
  BacktestSleeve,
  PaperBook,
  PaperFill,
} from "../types";
import { DEFAULT_STUDY } from "./knowledge";
import { tickPairBook } from "./paper";
import type { PairPrices } from "./prices";
import type { RatioSample } from "./ratio";
import type { ScalpFrames, SleeveFrames } from "./frames";
import { emptyFrames } from "./frames";
import { equityOf, markPair, pairOf } from "./engine";
import seed from "./backtestSeed.json";

function normalizeDay(d: BacktestDay): BacktestDay {
  const entries = d.entries ?? 0;
  const exits = d.exits ?? d.trades ?? 0;
  return {
    ...d,
    entries,
    exits,
    realizedUsd: d.realizedUsd ?? 0,
    trades: entries + exits || d.trades || 0,
  };
}

function normalizeMonth(m: BacktestMonth): BacktestMonth {
  const entries = m.entries ?? 0;
  const exits = m.exits ?? m.trades ?? 0;
  return {
    ...m,
    entries,
    exits,
    realizedUsd: m.realizedUsd ?? 0,
    trades: entries + exits || m.trades || 0,
  };
}

export function normalizeBacktest(report: BacktestReport): BacktestReport {
  const daily = (report.daily || []).map(normalizeDay);
  const monthly = (report.monthly || []).map(normalizeMonth);
  const noLosses = (report.losses || 0) === 0 && (report.wins || 0) > 0;
  return {
    ...report,
    daily,
    monthly,
    profitFactor: noLosses ? null : report.profitFactor,
    realizedUsd: report.realizedUsd ?? 0,
    unrealizedUsd: report.unrealizedUsd ?? 0,
  };
}

export function latestBacktest(stored?: BacktestReport | null): BacktestReport {
  const raw = stored && Array.isArray(stored.curve) && stored.curve.length ? stored : (seed as BacktestReport);
  return normalizeBacktest(raw);
}

export type { BacktestReport, BacktestPoint } from "../types";

export type BacktestTape = {
  sol: Candle[];
  spy: Candle[];
  qqq: Candle[];
  gld: Candle[];
};

function lastIdx(cs: Candle[], t: number): number {
  let lo = 0;
  let hi = cs.length - 1;
  let hit = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cs[mid].t <= t) {
      hit = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return hit;
}

function lastAt(cs: Candle[], t: number): Candle | null {
  const i = lastIdx(cs, t);
  return i >= 0 ? cs[i] : null;
}

function sliceTo(cs: Candle[], t: number, n: number): Candle[] {
  const i = lastIdx(cs, t);
  if (i < 0) return [];
  const from = Math.max(0, i - n + 1);
  return cs.slice(from, i + 1);
}

function pricesAt(tape: BacktestTape, t: number): PairPrices | null {
  const sol = lastAt(tape.sol, t);
  const spy = lastAt(tape.spy, t);
  const qqq = lastAt(tape.qqq, t);
  const gld = lastAt(tape.gld, t);
  if (!sol || !spy || !qqq || !gld) return null;
  return {
    sol: { usd: sol.c, source: "backtest", at: t },
    spyx: { usd: spy.c, source: "backtest", at: t },
    qqqx: { usd: qqq.c, source: "backtest", at: t },
    gldx: { usd: gld.c, source: "backtest", at: t },
    liquidityUsd: 1_000_000,
    liquidities: { spyx: 1_000_000, qqqx: 1_000_000, gldx: 1_000_000 },
    stale: false,
    ageMs: 0,
  };
}

function framesAt(tape: BacktestTape, t: number, packed: { h4: Record<string, Candle[]>; d1: Record<string, Candle[]> }): ScalpFrames {
  const one = (cs: Candle[], key: string): SleeveFrames => {
    const m15 = sliceTo(cs, t, 120);
    return {
      m5: m15,
      m15,
      h4: sliceTo(packed.h4[key], t, 40),
      d1: sliceTo(packed.d1[key], t, 40),
    };
  };
  const frames = emptyFrames();
  frames.SOL = one(tape.sol, "sol");
  frames.SPYx = one(tape.spy, "spy");
  frames.QQQx = one(tape.qqq, "qqq");
  frames.GLDx = one(tape.gld, "gld");
  return frames;
}

function samplesAt(tape: BacktestTape, t: number): RatioSample[] {
  const sol = sliceTo(tape.sol, t, 80);
  const out: RatioSample[] = [];
  for (const s of sol) {
    const spy = lastAt(tape.spy, s.t);
    const qqq = lastAt(tape.qqq, s.t);
    const gld = lastAt(tape.gld, s.t);
    if (!spy) continue;
    out.push({ t: s.t, sol: s.c, spyx: spy.c, qqqx: qqq?.c, gldx: gld?.c });
  }
  return out;
}

const ASSETS = new Set(["SOL", "SPYx", "QQQx", "GLDx"]);

function utcDay(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

function utcMonth(t: number): string {
  return new Date(t).toISOString().slice(0, 7);
}

function isAssetFill(f: { symbol: string }): boolean {
  return ASSETS.has(f.symbol);
}

function emptyDay(day: string, endEquity = 0): BacktestDay {
  return { day, pnlUsd: 0, trades: 0, entries: 0, exits: 0, realizedUsd: 0, endEquity };
}

function emptyMonth(ym: string, endEquity = 0): BacktestMonth {
  return { ym, pnlUsd: 0, trades: 0, entries: 0, exits: 0, realizedUsd: 0, endEquity };
}

function downsample(curve: BacktestPoint[], n = 96): BacktestPoint[] {
  if (curve.length <= n) return curve;
  const out: BacktestPoint[] = [];
  const step = (curve.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(curve[Math.round(i * step)]);
  return out;
}

function sleeveStats(fills: PaperFill[]): BacktestSleeve[] {
  const ids = ["SOL", "SPYx", "QQQx", "GLDx"] as const;
  return ids.map((id) => {
    const sells = fills.filter((f) => f.symbol === id && f.side === "sell" && f.pnlUsd != null);
    const wins = sells.filter((f) => (f.pnlUsd || 0) > 0);
    const pnl = sells.reduce((s, f) => s + (f.pnlUsd || 0), 0);
    return {
      id,
      trades: sells.length,
      wins: wins.length,
      pnlUsd: Math.round(pnl * 100) / 100,
      winRate: sells.length ? wins.length / sells.length : 0,
    };
  });
}

/** Closed asset sells. USDC legs are the other side of the same clip, not a second trade. */
export function closedClips(fills: { side: string; symbol: string; pnlUsd?: number }[]): typeof fills {
  return fills.filter((f) => f.side === "sell" && isAssetFill(f) && f.pnlUsd != null);
}

export function dailyStats(curve: BacktestPoint[], fills: PaperFill[], startUsd: number): BacktestDay[] {
  const map = new Map<string, BacktestDay>();
  for (const p of curve) {
    const day = utcDay(p.t);
    const prev = map.get(day);
    if (!prev) map.set(day, emptyDay(day, p.equity));
    else prev.endEquity = p.equity;
  }
  for (const f of fills) {
    if (!isAssetFill(f)) continue;
    const day = utcDay(f.at);
    let row = map.get(day);
    if (!row) {
      row = emptyDay(day, 0);
      map.set(day, row);
    }
    if (f.side === "buy") row.entries = (row.entries || 0) + 1;
    if (f.side === "sell") {
      row.exits = (row.exits || 0) + 1;
      if (f.pnlUsd != null) row.realizedUsd = Math.round(((row.realizedUsd || 0) + f.pnlUsd) * 100) / 100;
    }
  }
  const rows = [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
  for (let i = 0; i < rows.length; i++) {
    const open = i === 0 ? startUsd : rows[i - 1].endEquity || startUsd;
    if (rows[i].endEquity === 0 && i > 0) rows[i].endEquity = rows[i - 1].endEquity;
    rows[i].pnlUsd = Math.round((rows[i].endEquity - open) * 100) / 100;
    rows[i].entries = rows[i].entries || 0;
    rows[i].exits = rows[i].exits || 0;
    rows[i].realizedUsd = rows[i].realizedUsd || 0;
    rows[i].trades = (rows[i].entries || 0) + (rows[i].exits || 0);
  }
  return rows;
}

export function monthlyStats(curve: BacktestPoint[], fills: PaperFill[]): BacktestMonth[] {
  const map = new Map<string, BacktestMonth>();
  for (const p of curve) {
    const ym = utcMonth(p.t);
    const prev = map.get(ym);
    if (!prev) map.set(ym, emptyMonth(ym, p.equity));
    else prev.endEquity = p.equity;
  }
  for (const f of fills) {
    if (!isAssetFill(f)) continue;
    const ym = utcMonth(f.at);
    let row = map.get(ym);
    if (!row) {
      row = emptyMonth(ym, 0);
      map.set(ym, row);
    }
    if (f.side === "buy") row.entries = (row.entries || 0) + 1;
    if (f.side === "sell") {
      row.exits = (row.exits || 0) + 1;
      if (f.pnlUsd != null) row.realizedUsd = Math.round(((row.realizedUsd || 0) + f.pnlUsd) * 100) / 100;
    }
  }
  const rows = [...map.values()].sort((a, b) => a.ym.localeCompare(b.ym));
  for (let i = 0; i < rows.length; i++) {
    const start = i === 0 ? curve[0]?.equity || 0 : rows[i - 1].endEquity;
    if (rows[i].endEquity === 0 && i > 0) rows[i].endEquity = rows[i - 1].endEquity;
    rows[i].pnlUsd = Math.round((rows[i].endEquity - start) * 100) / 100;
    rows[i].entries = rows[i].entries || 0;
    rows[i].exits = rows[i].exits || 0;
    rows[i].realizedUsd = rows[i].realizedUsd || 0;
    rows[i].trades = (rows[i].entries || 0) + (rows[i].exits || 0);
  }
  return rows;
}

function reportOf(book: PaperBook, curve: BacktestPoint[], from: number, to: number, bars: number, maxDdPct: number): BacktestReport {
  const sells = closedClips(book.fills);
  const wins = sells.filter((f) => (f.pnlUsd || 0) > 0);
  const losses = sells.filter((f) => (f.pnlUsd || 0) < 0);
  const winUsd = wins.reduce((s, f) => s + (f.pnlUsd || 0), 0);
  const lossUsd = Math.abs(losses.reduce((s, f) => s + (f.pnlUsd || 0), 0));
  const realizedUsd = Math.round(sells.reduce((s, f) => s + (f.pnlUsd || 0), 0) * 100) / 100;
  const start = book.startingUsd;
  const end = book.equityUsd;
  const pnlUsd = Math.round((end - start) * 100) / 100;
  const days = Math.max(1, (to - from) / 86_400_000);
  const daily = dailyStats(curve, book.fills, start);
  const monthly = monthlyStats(curve, book.fills);
  return {
    ranAt: Date.now(),
    from,
    to,
    bars,
    horizon: `${Math.round(days)}d · 15m clips · Daily/4H bias · fees in`,
    startingUsd: start,
    endingUsd: Math.round(end * 100) / 100,
    pnlUsd,
    pnlPct: start ? (end - start) / start : 0,
    maxDdPct,
    trades: sells.length,
    wins: wins.length,
    losses: losses.length,
    winRate: sells.length ? wins.length / sells.length : 0,
    profitFactor: lossUsd > 0 ? Math.round((winUsd / lossUsd) * 100) / 100 : null,
    realizedUsd,
    unrealizedUsd: Math.round((pnlUsd - realizedUsd) * 100) / 100,
    feesUsd: Math.round(book.feesPaidUsd * 100) / 100,
    slippageUsd: Math.round(book.slippagePaidUsd * 100) / 100,
    avgWinUsd: wins.length ? winUsd / wins.length : 0,
    avgLossUsd: losses.length ? -lossUsd / losses.length : 0,
    bestTradeUsd: wins.length ? Math.max(...wins.map((f) => f.pnlUsd || 0)) : 0,
    worstTradeUsd: losses.length ? Math.min(...losses.map((f) => f.pnlUsd || 0)) : 0,
    sleeves: sleeveStats(book.fills),
    monthly,
    daily,
    bestDayUsd: daily.length ? Math.max(...daily.map((d) => d.pnlUsd)) : 0,
    worstDayUsd: daily.length ? Math.min(...daily.map((d) => d.pnlUsd)) : 0,
    avgDayUsd: daily.length ? daily.reduce((s, d) => s + d.pnlUsd, 0) / daily.length : 0,
    daysGe2: daily.filter((d) => d.pnlUsd >= 2).length,
    curve: downsample(curve, 120),
    fills: book.fills
      .filter((f) => isAssetFill(f))
      .map((f) => ({
        at: f.at,
        side: f.side,
        symbol: f.symbol,
        sizeUsd: Math.round(f.sizeUsd * 100) / 100,
        pnlUsd: f.pnlUsd != null ? Math.round(f.pnlUsd * 100) / 100 : undefined,
        reason: f.reason.slice(0, 140),
      })),
    note: "Historical paper of this engine on SOL, SPY, QQQ, and gold. Same rules she runs now. Fees and the 0.1% clip are in the mark. Daily PnL is the marked book (open position included). Clips are entries and exits. A green day with 0 clips means she was holding. Past days are not a promise she prints $2 every session.",
  };
}

export function publicBacktest(report: BacktestReport | null | undefined) {
  if (!report) return { ready: false as const };
  return {
    ready: true as const,
    from: report.from,
    to: report.to,
    horizon: report.horizon,
    startingUsd: report.startingUsd,
    endingUsd: report.endingUsd,
    pnlUsd: report.pnlUsd,
    pnlPct: report.pnlPct,
    maxDdPct: report.maxDdPct,
    trades: report.trades,
    winRate: report.winRate,
    feesUsd: report.feesUsd,
    bestDayUsd: report.bestDayUsd,
    avgDayUsd: report.avgDayUsd,
    daysGe2: report.daysGe2,
    curve: report.curve,
    note: report.note,
  };
}

/** Replay the live scalp engine on a historical tape. */
export function runBacktest(tape: BacktestTape, startingUsd = PAPER_STARTING_USD): BacktestReport {
  const spy0 = tape.spy[0]?.t || 0;
  const clock = tape.sol.filter((c) => c.t >= spy0 && lastAt(tape.spy, c.t) && lastAt(tape.qqq, c.t) && lastAt(tape.gld, c.t));
  const warmup = 80;
  const packed = {
    h4: { sol: pack4h(tape.sol), spy: pack4h(tape.spy), qqq: pack4h(tape.qqq), gld: pack4h(tape.gld) },
    d1: { sol: packDaily(tape.sol), spy: packDaily(tape.spy), qqq: packDaily(tape.qqq), gld: packDaily(tape.gld) },
  };
  const book = emptyBook(startingUsd);
  const auto = { ...DEFAULT_AUTO, armed: true, mode: "paper" as const };
  const curve: BacktestPoint[] = [{ t: clock[warmup]?.t || Date.now(), equity: startingUsd }];
  let peak = startingUsd;
  let maxDd = 0;
  let ticks = 0;
  for (let i = warmup; i < clock.length; i++) {
    const t = clock[i].t;
    const prices = pricesAt(tape, t);
    if (!prices) continue;
    const frames = framesAt(tape, t, packed);
    const samples = samplesAt(tape, t);
    if (samples.length < 16) continue;
    tickPairBook({
      book,
      auto,
      prices,
      samples,
      study: DEFAULT_STUDY,
      now: t,
      frames,
    });
    markPair(book, prices);
    const eq = equityOf(pairOf(book), prices);
    if (eq > peak) peak = eq;
    const dd = peak > 0 ? (peak - eq) / peak : 0;
    if (dd > maxDd) maxDd = dd;
    const last = curve[curve.length - 1];
    if (!last || t - last.t >= 2 * 3_600_000 || Math.abs(eq - last.equity) > 0.4) {
      curve.push({ t, equity: Math.round(eq * 100) / 100 });
    }
    ticks += 1;
  }
  const lastT = clock[clock.length - 1]?.t || Date.now();
  const lastPx = pricesAt(tape, lastT);
  if (lastPx) markPair(book, lastPx);
  const from = clock[warmup]?.t || clock[0]?.t || 0;
  const to = lastT;
  if (curve[curve.length - 1]?.t !== to) {
    curve.push({ t: to, equity: Math.round(book.equityUsd * 100) / 100 });
  }
  return reportOf(book, curve, from, to, ticks, maxDd);
}
