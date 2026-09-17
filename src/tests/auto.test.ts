import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ARM_V, bankrollUsd, emptyTrader, maybeResizeBook, DEFAULT_AUTO, lockedAuto } from "../lib/auto";

describe("auto bankroll", () => {
  it("stays at zero until they deposit SOL — no demo paper book", () => {
    assert.equal(bankrollUsd(0, 100), 0);
    assert.equal(bankrollUsd(0.0001, 100), 0);
    assert.equal(emptyTrader("D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81").auto.armed, false);
    assert.equal(emptyTrader("D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81").book.startingUsd, 0);
  });

  it("sizes the book to deposited SOL once they fund the trading wallet", () => {
    assert.equal(bankrollUsd(1, 103), 103);
    assert.equal(bankrollUsd(2.5, 100), 250);
  });

  it("does not wipe an active book when deposit changes", () => {
    const t = emptyTrader("D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81");
    t.book.fills.push({
      id: "x",
      mint: "Mint111111111111111111111111111111111111111",
      symbol: "X",
      name: "X",
      strategy: "scalp",
      side: "buy",
      at: Date.now(),
      priceUsd: 1,
      qty: 1,
      sizeUsd: 10,
      feeUsd: 0,
      slippageUsd: 0,
      reason: "t",
      riskScore: 80,
      venue: "pumpfun",
    });
    const same = maybeResizeBook(t.book, 500);
    assert.equal(same.fills.length, 1);
    assert.equal(DEFAULT_AUTO.armed, false);
    assert.equal(lockedAuto({ armed: true }).armed, false);
    assert.equal(lockedAuto({ armed: true, armV: ARM_V }).armed, true);
    assert.equal(DEFAULT_AUTO.mode, "live");
    assert.equal(DEFAULT_AUTO.armedAt, undefined);
    assert.equal(DEFAULT_AUTO.style, "scalp");
    assert.equal(DEFAULT_AUTO.leverage, 1);
    assert.equal(DEFAULT_AUTO.cooldownMin, 60);
    assert.equal(DEFAULT_AUTO.band, "normal");
    assert.equal(DEFAULT_AUTO.targetSolPct, 0.2);
    assert.equal(DEFAULT_AUTO.liveDelegate, undefined);
  });
});
