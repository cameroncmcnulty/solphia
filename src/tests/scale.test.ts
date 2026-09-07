import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyState, hotOwners, MAX_TICK_TRADERS, restorePair, setLiveOwner, touchHot } from "../lib/store";
import { emptyTrader, maybeResizeBook } from "../lib/auto";
import { SPOT_LEVERAGE, borrowUsd, canUseLeverage, leverageUnlocked, leverageVenue, liqPrice, openFeeUsd } from "../lib/leverage";
import { KEYS } from "../lib/persist";
import { slimBacktest } from "../lib/pair/backtest";

describe("scale store", () => {
  it("ticks live and recent owners only, and caps the batch", () => {
    const s = emptyState();
    const now = Date.now();
    for (let i = 0; i < 80; i++) {
      const owner = `owner${i}1111111111111111111111111111111`.slice(0, 44);
      s.traders[owner] = emptyTrader(owner);
      touchHot(s, owner, now - i * 1000);
    }
    const live = "LiveOwner11111111111111111111111111111111".slice(0, 44);
    s.traders[live] = emptyTrader(live);
    s.traders[live].auto.mode = "live";
    s.traders[live].auto.armed = true;
    setLiveOwner(s, live, true);
    const hot = hotOwners(s, now);
    assert.ok(hot.includes(live));
    assert.ok(hot.length <= MAX_TICK_TRADERS);
    assert.equal(KEYS.trader("abc").startsWith("solphia:trader:"), true);
    assert.equal(KEYS.backtest(2), "solphia:backtest:2");
  });

  it("keeps a SOL-PERP sleeve across hydrate and does not resize it away", () => {
    const perp = {
      leverage: 2 as const,
      collateralUsd: 200,
      notionalUsd: 400,
      entryPx: 100,
      openedAt: 1,
      lastBorrowAt: 1,
      borrowPaidUsd: 0,
    };
    const pair = restorePair(
      { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: 500, solPerp: perp },
      500,
    );
    assert.equal(pair.solPerp?.leverage, 2);
    assert.equal(pair.solPerp?.notionalUsd, 400);
    const book = emptyTrader("x".repeat(44)).book;
    book.pair = pair;
    book.startedAt = Date.now();
    const kept = maybeResizeBook(book, 2000);
    assert.equal(kept.pair?.solPerp?.leverage, 2);
  });
});

describe("leverage", () => {
  it("prices SOL-PERP with Jupiter fees and a real liq", () => {
    assert.equal(SPOT_LEVERAGE, 1);
    assert.equal(leverageVenue(1), "spot");
    assert.equal(leverageVenue(2), "jupiter_perps");
    assert.equal(Math.round(liqPrice(100, 2) * 10) / 10, 60);
    assert.equal(Math.round(liqPrice(100, 3) * 100) / 100, 73.33);
    assert.equal(openFeeUsd(1000), 0.6);
    assert.equal(canUseLeverage("live"), false);
    assert.equal(canUseLeverage("lev"), true);
    assert.equal(canUseLeverage("paper", true), true);
    assert.equal(leverageUnlocked({ mode: "paper" }), true);
    assert.equal(leverageUnlocked({ mode: "live", levSeat: false }), false);
    assert.equal(leverageUnlocked({ mode: "live", levSeat: true }), true);
    const slim = slimBacktest({
      ranAt: 1,
      from: 1,
      to: 2,
      bars: 10,
      horizon: "test",
      startingUsd: 1000,
      endingUsd: 1000,
      pnlUsd: 0,
      pnlPct: 0,
      maxDdPct: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      profitFactor: null,
      feesUsd: 0,
      slippageUsd: 0,
      avgWinUsd: 0,
      avgLossUsd: 0,
      bestTradeUsd: 0,
      worstTradeUsd: 0,
      bestDayUsd: 0,
      worstDayUsd: 0,
      avgDayUsd: 0,
      daysGe2: 0,
      sleeves: [],
      monthly: [],
      daily: [],
      curve: [{ t: 1, equity: 1000 }],
      fills: Array.from({ length: 120 }, (_, i) => ({
        at: i,
        side: "buy" as const,
        symbol: "SOL",
        sizeUsd: 1,
        reason: "x",
      })),
      note: "n",
    });
    assert.equal(slim?.fills.length, 80);
    const hour = borrowUsd({ notionalUsd: 1000, lev: 2, from: 0, to: 3_600_000 });
    assert.ok(hour > 0 && hour < 0.1);
  });
});
