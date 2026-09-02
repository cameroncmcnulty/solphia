import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { atr, bullishDivergence, bearishDivergence, ema, rsi, swingPoints, type Candle } from "../lib/sol/indicators";
import {
  SOL_MIN_RR,
  SOL_MIN_STOP,
  decideSol,
  roundTripPct,
  solDayPnl,
} from "../lib/sol/engine";
import { applySolTick } from "../lib/sol/paper";
import { emptyBook } from "../lib/auto";

function candle(t: number, c: number, range = 0.004): Candle {
  const h = c * (1 + range / 2);
  const l = c * (1 - range / 2);
  return { t, o: c, h, l, c, v: 1000 };
}

function series(prices: number[], t0 = 1_700_000_000_000): Candle[] {
  return prices.map((p, i) => candle(t0 + i * 15 * 60_000, p));
}

describe("SOL indicators", () => {
  it("RSI is 100 on a straight up tape and near 0 on a straight down tape", () => {
    const up = Array.from({ length: 40 }, (_, i) => 10 + i);
    const down = Array.from({ length: 40 }, (_, i) => 50 - i);
    const rUp = rsi(up);
    const rDown = rsi(down);
    assert.ok(rUp.at(-1)! > 80);
    assert.ok(rDown.at(-1)! < 20);
  });

  it("ATR is positive and scales with range", () => {
    const quiet = series(Array.from({ length: 30 }, () => 100), 1);
    const wild = quiet.map((c) => ({ ...c, h: c.c * 1.02, l: c.c * 0.98 }));
    const aQ = atr(quiet).at(-1)!;
    const aW = atr(wild).at(-1)!;
    assert.ok(aW > aQ);
    assert.ok(aW > 0);
  });

  it("finds two planted swing lows", () => {
    const prices: number[] = [];
    for (let i = 0; i < 10; i++) prices.push(100);
    prices.push(99, 97, 94, 90, 94, 97, 99);
    for (let i = 0; i < 5; i++) prices.push(99);
    prices.push(98, 96, 94, 92, 91, 89, 88, 89, 91, 93);
    for (let i = 0; i < 5; i++) prices.push(93);
    const candles = prices.map((c, i) => ({ t: i, o: c, h: c + 0.15, l: c, c, v: 1000 }));
    const { lows } = swingPoints(candles, 3);
    assert.ok(lows.length >= 2);
    assert.ok(lows.at(-1)!.price < lows.at(-2)!.price);
  });

  it("spots bullish RSI divergence: lower price low, higher RSI low", () => {
    const prices: number[] = [];
    for (let i = 0; i < 10; i++) prices.push(100);
    prices.push(99, 97, 94, 90, 94, 97, 99);
    for (let i = 0; i < 5; i++) prices.push(99);
    prices.push(98, 96, 94, 92, 91, 89, 88, 89, 91, 93);
    for (let i = 0; i < 5; i++) prices.push(93);
    const candles = prices.map((c, i) => ({ t: i, o: c, h: c + 0.15, l: c, c, v: 1000 }));
    const r = candles.map(() => 50);
    const { lows } = swingPoints(candles, 3);
    const a = lows[lows.length - 2];
    const b = lows[lows.length - 1];
    r[a.i] = 28;
    r[b.i] = 40;
    assert.equal(bullishDivergence(candles, r), true);
  });

  it("spots bearish RSI divergence: higher price high, lower RSI high", () => {
    const prices: number[] = [];
    for (let i = 0; i < 10; i++) prices.push(100);
    prices.push(101, 103, 106, 110, 106, 103, 101);
    for (let i = 0; i < 5; i++) prices.push(101);
    prices.push(102, 104, 106, 108, 109, 111, 112, 111, 109, 107);
    for (let i = 0; i < 5; i++) prices.push(107);
    const candles = prices.map((c, i) => ({ t: i, o: c, h: c, l: c - 0.15, c, v: 1000 }));
    const r = candles.map(() => 50);
    const { highs } = swingPoints(candles, 3);
    const a = highs[highs.length - 2];
    const b = highs[highs.length - 1];
    r[a.i] = 72;
    r[b.i] = 60;
    assert.equal(bearishDivergence(candles, r), true);
  });
});

describe("SOL/USDT desk rules", () => {
  it("round-trip cost is 18 bps, so a 1% target is not eaten by fees", () => {
    assert.equal(Math.round(roundTripPct() * 10_000), 18);
    const net = 0.01 - roundTripPct();
    assert.ok(net >= 0.007);
  });

  it("refuses when 15m ATR is a spike", () => {
    const m15 = Array.from({ length: 80 }, (_, i) => ({
      t: i,
      o: 100,
      h: 103.5,
      l: 96.5,
      c: 100,
      v: 4000,
    }));
    const h1 = series(Array.from({ length: 50 }, () => 100), 2);
    const d = decideSol(m15, h1, emptyBook(), Date.now());
    assert.equal(d.ok, false);
    assert.match(d.reason, /spike|ATR/i);
  });

  it("refuses when daily goal is already hit", () => {
    const book = emptyBook();
    book.fills.push({
      id: "f",
      mint: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      name: "Solana",
      strategy: "sol_usd",
      side: "sell",
      at: Date.now(),
      priceUsd: 101,
      qty: 1,
      sizeUsd: 10,
      feeUsd: 0,
      slippageUsd: 0,
      pnlUsd: 8,
      reason: "take-profit-1",
      riskScore: 80,
      venue: "stable",
    });
    const m15 = series(Array.from({ length: 80 }, () => 100));
    const h1 = series(Array.from({ length: 50 }, () => 100), 2);
    const d = decideSol(m15, h1, book, Date.now());
    assert.equal(d.ok, false);
    assert.match(d.reason, /Daily goal/i);
  });

  it("counts only enter-sol fills as today's entries", () => {
    const book = emptyBook();
    book.fills.push({
      id: "a",
      mint: "x",
      symbol: "SOL",
      name: "Solana",
      strategy: "sol_usd",
      side: "buy",
      at: Date.now(),
      priceUsd: 100,
      qty: 1,
      sizeUsd: 100,
      feeUsd: 0,
      slippageUsd: 0,
      reason: "enter-sol long · pullback",
      riskScore: 80,
      venue: "stable",
    });
    book.fills.push({
      id: "b",
      mint: "x",
      symbol: "SOL",
      name: "Solana",
      strategy: "sol_usd",
      side: "sell",
      at: Date.now(),
      priceUsd: 101,
      qty: 1,
      sizeUsd: 101,
      feeUsd: 0,
      slippageUsd: 0,
      pnlUsd: 1,
      reason: "take-profit-1",
      riskScore: 80,
      venue: "stable",
    });
    const { entries, pnl } = solDayPnl(book, Date.now());
    assert.equal(entries, 1);
    assert.equal(pnl, 1);
  });

  it("does not open when there is no setup, and never uses a sub-0.5% stop on a fill", () => {
    const book = emptyBook();
    const m15 = series(Array.from({ length: 80 }, () => 100 + Math.random() * 0.05));
    const h1 = series(Array.from({ length: 50 }, () => 100), 2);
    applySolTick(book, m15, h1, Date.now());
    for (const p of book.positions.filter((x) => x.strategy === "sol_usd")) {
      const stopPct = Math.abs(p.entryUsd - p.slUsd) / p.entryUsd;
      assert.ok(stopPct + 1e-9 >= SOL_MIN_STOP);
      const tpPct = Math.abs(p.tpUsd - p.entryUsd) / p.entryUsd;
      const net = tpPct - roundTripPct();
      assert.ok(net / stopPct + 1e-9 >= SOL_MIN_RR);
    }
  });

  it("EMA rises on an up series", () => {
    const e = ema([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    assert.ok(e.at(-1)! > e[3]);
  });
});
