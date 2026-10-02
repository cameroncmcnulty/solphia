import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOL_MINT, USDC_MINT } from "../lib/pair/mints";
import {
  amountExceedsBalance,
  maxPayString,
  SOL_GAS_RESERVE,
  spendableAmount,
} from "../lib/swap/spendable";

describe("swap spendable", () => {
  it("keeps a SOL gas reserve so MAX cannot empty the wallet", () => {
    assert.ok(Math.abs(spendableAmount(1, SOL_MINT) - (1 - SOL_GAS_RESERVE)) < 1e-12);
    assert.equal(spendableAmount(SOL_GAS_RESERVE, SOL_MINT), 0);
    assert.equal(spendableAmount(0, SOL_MINT), 0);
  });

  it("does not reserve gas on token balances", () => {
    assert.equal(spendableAmount(29.25, USDC_MINT), 29.25);
  });

  it("flags a 0.25 SOL quote when the wallet cannot pay it", () => {
    const have = spendableAmount(0.1, SOL_MINT);
    assert.equal(amountExceedsBalance(0.25, have), true);
    assert.equal(amountExceedsBalance(0.05, have), false);
    assert.equal(amountExceedsBalance(0, have), false);
  });

  it("MAX USDC floors 25.87396 instead of rounding up to 25.874", () => {
    const have = 25.87396;
    const filled = maxPayString(have, USDC_MINT);
    assert.equal(filled, "25.87396");
    assert.equal(amountExceedsBalance(Number(filled), have), false);
    assert.equal(amountExceedsBalance(25.874, have), true);
  });

  it("MAX percent chips also stay at or under the bag", () => {
    const have = 25.87396;
    const filled = maxPayString(have * 0.75, USDC_MINT);
    assert.equal(amountExceedsBalance(Number(filled), have), false);
    assert.match(filled, /^\d+\.\d+$/);
  });
});
