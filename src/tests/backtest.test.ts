import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dailyStats,
  latestBacktest,
  monthlyStats,
  publicBacktest,
  runBacktest,
  type BacktestTape,
} from "../lib/pair/backtest";
import type { Candle } from "../lib/sol/indicators";
import type { PaperFill } from "../lib/types";

function climb(n: number, px: number, t0: number, dt: number, step: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const o = px;
    const c = px * (1 + step + (i % 18 === 17 ? -0.012 : 0) + (i % 18 === 0 && i > 0 ? 0.008 : 0));
    out.push({ t: t0 + i * dt, o, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998, c, v: 80 });
    px = c;
  }
  return out;
}

describe("backtest replay", () => {
  it("walks history, writes a curve, and keeps fees in the mark", () => {
    const t0 = Date.UTC(2026, 2, 1, 14, 0, 0);
    const dt = 3_600_000;
    const n = 220;
    const tape: BacktestTape = {
      sol: climb(n, 100, t0, dt, 0.0004),
      spy: climb(n, 500, t0, dt, 0.0016),
      qqq: climb(n, 400, t0, dt, 0.0003),
      gld: climb(n, 300, t0, dt, 0.0002),
    };
    const report = runBacktest(tape, 1000);
    assert.equal(report.leverage, 1);
    assert.ok(report.bars > 80);
    assert.ok(report.curve.length > 4);
    assert.equal(report.startingUsd, 1000);
    assert.ok(report.endingUsd > 0);
    assert.ok(report.maxDdPct >= 0);
    assert.match(report.note, /historical paper/i);
    assert.match(report.horizon, /fees/i);
    assert.ok(Array.isArray(report.daily));
    assert.ok(typeof report.bestDayUsd === "number");
    const again = runBacktest(tape, 1000);
    assert.equal(again.pnlPct, report.pnlPct);
    assert.equal(again.trades, report.trades);
    assert.equal(again.endingUsd, report.endingUsd);
    assert.deepEqual(
      again.daily.map((d) => [d.day, d.pnlUsd, d.entries, d.exits]),
      report.daily.map((d) => [d.day, d.pnlUsd, d.entries, d.exits]),
    );
    const pub = publicBacktest(report);
    assert.equal(pub.ready, true);
    if (pub.ready) {
      assert.equal(pub.curve?.length, report.curve.length);
      assert.ok(!("fills" in pub));
    }
    const lev2 = runBacktest(tape, 1000, 2);
    assert.equal(lev2.leverage, 2);
    assert.ok(typeof lev2.liquidations === "number");
    const lev3 = runBacktest(tape, 1000, 3);
    assert.equal(lev3.leverage, 3);
  });

  it("falls back to the shipped seed so the public curve always has a mark", () => {
    const pub = publicBacktest(latestBacktest(null));
    assert.equal(pub.ready, true);
    if (pub.ready) {
      assert.ok((pub.curve?.length || 0) > 8);
      assert.ok((pub.trades || 0) >= 1);
    }
    const seeded = latestBacktest(null);
    assert.ok(seeded);
    if (seeded && seeded.losses === 0 && seeded.wins > 0) assert.equal(seeded.profitFactor, null);
  });

  it("does not fake a 2x curve from the 1x seed", () => {
    assert.equal(latestBacktest(null, 2), null);
    assert.equal(publicBacktest(latestBacktest(null, 2)).ready, false);
    assert.equal(latestBacktest(null, 3), null);
  });

  it("serves a stored 2x report instead of the 1x seed", () => {
    const stored = { ...latestBacktest(null)!, leverage: 2 as const, pnlPct: 0.12, curve: [{ t: 1, equity: 1120 }] };
    const got = latestBacktest(stored, 2);
    assert.ok(got);
    assert.equal(got.leverage, 2);
    assert.equal(got.pnlPct, 0.12);
    const pub = publicBacktest(got);
    assert.equal(pub.ready, true);
    if (pub.ready) assert.equal(pub.leverage, 2);
  });
});

function fill(at: number, side: "buy" | "sell", symbol: string, pnlUsd?: number): PaperFill {
  return {
    id: `${side}-${at}`,
    mint: "mint",
    symbol,
    name: symbol,
    strategy: "sol_spyx",
    side,
    at,
    priceUsd: 100,
    qty: 1,
    sizeUsd: 100,
    feeUsd: 0.1,
    slippageUsd: 0.04,
    pnlUsd,
    reason: "test",
    riskScore: 70,
    venue: "unknown",
  };
}

describe("backtest day ledger", () => {
  it("counts asset entries and exits, and keeps hold-day mark PnL", () => {
    const t0 = Date.UTC(2026, 7, 10, 14, 0, 0);
    const t1 = t0 + 2 * 3_600_000;
    const t2 = t0 + 86_400_000;
    const curve = [
      { t: t0, equity: 1000 },
      { t: t1, equity: 990 },
      { t: t2, equity: 1012 },
    ];
    const fills = [
      fill(t0, "buy", "SOL"),
      fill(t1, "sell", "SOL", 4.2),
      fill(t1, "sell", "USDC", -0.2),
    ];
    const days = dailyStats(curve, fills, 1000);
    assert.equal(days.length, 2);
    assert.equal(days[0].entries, 1);
    assert.equal(days[0].exits, 1);
    assert.equal(days[0].trades, 2);
    assert.equal(days[0].realizedUsd, 4.2);
    assert.equal(days[0].pnlUsd, -10);
    assert.equal(days[1].entries, 0);
    assert.equal(days[1].exits, 0);
    assert.equal(days[1].trades, 0);
    assert.equal(days[1].pnlUsd, 22);
    const months = monthlyStats(curve, fills);
    assert.equal(months[0].exits, 1);
    assert.equal(months[0].entries, 1);
    assert.equal(months[0].trades, 2);
  });
});
