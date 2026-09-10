import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAD_SWAP_FEE_BPS, splitPadSpend } from "../lib/swap/pad";
import { SWAP_FEE_BPS } from "../lib/launch/curve";

describe("pad swap fee", () => {
  it("takes 1% of SOL spend for the protocol, rest goes to Jupiter", () => {
    assert.equal(PAD_SWAP_FEE_BPS, SWAP_FEE_BPS);
    assert.equal(PAD_SWAP_FEE_BPS, 100);
    const { feeSol, swapSol } = splitPadSpend(1);
    assert.equal(feeSol, 0.01);
    assert.equal(swapSol, 0.99);
    const small = splitPadSpend(0.25);
    assert.ok(Math.abs(small.feeSol + small.swapSol - 0.25) < 1e-9);
    assert.ok(small.swapSol > 0.2);
  });
});
