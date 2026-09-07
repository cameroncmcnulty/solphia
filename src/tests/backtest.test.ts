import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicBacktest, runBacktest, type BacktestTape } from "../lib/pair/backtest";
import type { Candle } from "../lib/sol/indicators";

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
    assert.ok(report.bars > 80);
    assert.ok(report.curve.length > 4);
    assert.equal(report.startingUsd, 1000);
    assert.ok(report.endingUsd > 0);
    assert.ok(report.maxDdPct >= 0);
    assert.match(report.note, /not a live book/i);
    assert.match(report.horizon, /fees/i);
    const pub = publicBacktest(report);
    assert.equal(pub.ready, true);
    if (pub.ready) {
      assert.equal(pub.curve?.length, report.curve.length);
      assert.ok(!("fills" in pub));
    }
  });

  it("hides the brochure when there is no run", () => {
    const pub = publicBacktest(null);
    assert.equal(pub.ready, false);
  });
});
