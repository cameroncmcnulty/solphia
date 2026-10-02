import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creditEvenIncome, creditPartnerClaim, creditSwapHold, evenShare } from "../lib/fees/income";
import { emptyLaunchBook } from "../lib/launch/engine";
import { feeOn, splitFee } from "../lib/launch/curve";

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

  it("holds Jupiter / open-market 1% as 25% owner when nobody invited the swapper", () => {
    const book = emptyLaunchBook();
    const fee = feeOn(1);
    creditSwapHold(book, fee, false);
    const s = splitFee(fee, false);
    assert.equal(book.ownerEarningsSol, s.owner);
    assert.equal(book.treasuryFeesSol, s.treasury + s.dev);
    assert.equal(book.swapFeesSol, fee);
  });

  it("cuts only the owner share when the swapper was invited", () => {
    const book = emptyLaunchBook();
    const fee = feeOn(1);
    creditSwapHold(book, fee, true);
    const s = splitFee(fee, true);
    assert.equal(book.ownerEarningsSol, s.owner);
    assert.equal(s.owner, 0.00125);
    assert.equal(s.referral, 0.00125);
    assert.equal(s.treasury, 0.0025);
  });
});
