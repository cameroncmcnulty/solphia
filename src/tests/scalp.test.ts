import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreScalp } from "../lib/pair/scalp";
import { maybeResizeBook, emptyBook } from "../lib/auto";
import type { Candle } from "../lib/sol/indicators";

const CASH = Date.UTC(2026, 8, 3, 18, 0, 0);

function climb(n: number, px: number, t0: number, dt: number, step: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const o = px;
    const c = px * (1 + step);
    out.push({ t: t0 + i * dt, o, h: Math.max(o, c) * 1.0012, l: Math.min(o, c) * 0.9988, c, v: 120 });
    px = c;
  }
  return out;
}

function reclaim(cs: Candle[], dip = 0.007): Candle[] {
  const out = cs.slice();
  const dt = cs.length > 1 ? cs[1].t - cs[0].t : 15 * 60_000;
  let t = out[out.length - 1].t;
  let px = out[out.length - 1].c;
  for (let i = 0; i < 3; i++) {
    const o = px;
    const c = px * (1 - dip / 3);
    t += dt;
    out.push({ t, o, h: o, l: Math.min(o, c) * 0.999, c, v: 90 });
    px = c;
  }
  const o = px;
  const c = o * 1.004;
  t += dt;
  out.push({ t, o, h: c, l: o, c, v: 160 });
  return out;
}

function bull(now = CASH) {
  const t15 = now - 90 * 15 * 60_000;
  const t5 = now - 90 * 5 * 60_000;
  const t4 = now - 50 * 4 * 3_600_000;
  const td = now - 80 * 86_400_000;
  return {
    m5: reclaim(climb(70, 420, t5, 5 * 60_000, 0.0009)),
    m15: reclaim(climb(70, 410, t15, 15 * 60_000, 0.0022)),
    h4: climb(40, 380, t4, 4 * 3_600_000, 0.005),
    d1: climb(60, 320, td, 86_400_000, 0.007),
  };
}

function bearDaily(now = CASH) {
  const t15 = now - 90 * 15 * 60_000;
  const t5 = now - 90 * 5 * 60_000;
  const t4 = now - 50 * 4 * 3_600_000;
  const td = now - 80 * 86_400_000;
  const down = (n: number, px: number, t0: number, dt: number) => climb(n, px, t0, dt, -0.004);
  return {
    m5: down(40, 100, t5, 5 * 60_000),
    m15: down(40, 100, t15, 15 * 60_000),
    h4: down(40, 120, t4, 4 * 3_600_000),
    d1: down(60, 160, td, 86_400_000),
  };
}

describe("scalp confluence", () => {
  it("scores a Daily/4H bull + 15m EMA reclaim as a buy", () => {
    const f = bull();
    const live = f.m15[f.m15.length - 1].c;
    const s = scoreScalp("SPYx", f, live, CASH);
    assert.ok(s);
    assert.equal(s.bias, "bull");
    assert.ok(s.buy >= 0.5, `buy ${s?.buy} ${s?.reason}`);
    assert.notEqual(s.setup, "none");
  });

  it("refuses SOL when Daily/4H is bear even if RSI is washed out", () => {
    const f = bearDaily();
    const live = f.m15[f.m15.length - 1].c;
    const s = scoreScalp("SOL", f, live, CASH);
    assert.ok(s);
    assert.equal(s.bias, "bear");
    assert.ok(s.buy < 0.42, `buy ${s?.buy} should not clear`);
  });
});

describe("paper session persistence", () => {
  it("does not wipe a running paper book when the bankroll mark moves", () => {
    const book = emptyBook(1000);
    book.startedAt = Date.now() - 3_600_000;
    book.tape = [{ id: "t", at: Date.now(), action: "hold", reason: "USDC" }];
    const next = maybeResizeBook(book, 80);
    assert.equal(next.startedAt, book.startedAt);
    assert.equal(next.startingUsd, 1000);
  });
});
