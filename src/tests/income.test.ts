import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creditEvenIncome, creditPartnerClaim, creditSwapHold, evenShare } from "../lib/fees/income";
import { emptyLaunchBook } from "../lib/launch/engine";
import { feeOn } from "../lib/launch/curve";

describe("protocol income accrual", () => {
  it("splits boosts and pins 50/50", () => {
    const s = evenShare(0.2);
    assert.equal(s.owner, 0.1);
    assert.equal(s.treasury, 0.1);
    assert.equal(s.dev, 0);
    assert.equal(s.referral, 0);
  });

  it("credits pin income 50/50 owner and treasury as lifetime booked", () => {
    const book = emptyLaunchBook();
    creditEvenIncome(book, 0.2, "pin");
    assert.equal(book.ownerEarningsSol, 0.1);
    assert.equal(book.treasuryFeesSol, 0.1);
    assert.equal(book.pinFeesSol, 0.2);
  });

  it("credits partner DBC claims 50/50 after the sweep sends the owner half", () => {
    const book = emptyLaunchBook();
    creditPartnerClaim(book, 0.004);
    assert.ok(Math.abs(book.ownerEarningsSol - 0.002) < 1e-12);
    assert.ok(Math.abs(book.treasuryFeesSol - 0.002) < 1e-12);
    assert.equal(book.swapFeesSol, 0.004);
  });

  it("holds widget open-market 1% as 50/50 owner and treasury", () => {
    const book = emptyLaunchBook();
    const fee = feeOn(1);
    creditSwapHold(book, fee, false);
    assert.equal(book.ownerEarningsSol, 0.005);
    assert.equal(book.treasuryFeesSol, 0.005);
    assert.equal(book.swapFeesSol, fee);
  });

  it("keeps open-market 50/50 even when the swapper was invited (referral is curve-only)", () => {
    const book = emptyLaunchBook();
    const fee = feeOn(1);
    creditSwapHold(book, fee, true);
    assert.equal(book.ownerEarningsSol, 0.005);
    assert.equal(book.treasuryFeesSol, 0.005);
  });
});
