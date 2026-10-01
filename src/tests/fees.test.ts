import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_OWNER, DEFAULT_TREASURY } from "../lib/protocolWallets";
import { feeOn, splitFee } from "../lib/launch/curve";
import { houseFeeLegs, houseShare } from "../lib/fees/payout";

const FROM = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const REF = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const DEV = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";

describe("house fee legs", () => {
  it("folds the creator 50% into treasury when there is no Solphia creator", () => {
    const fee = feeOn(1);
    const s = houseShare(fee, false, false);
    assert.equal(s.dev, 0);
    assert.equal(s.owner, 0.0025);
    assert.equal(s.treasury, 0.0075);
    assert.equal(s.referral, 0);
    const legs = houseFeeLegs({
      from: FROM,
      feeSol: fee,
      owner: DEFAULT_OWNER,
      treasury: DEFAULT_TREASURY,
    });
    const owner = legs.find((l) => l.to === DEFAULT_OWNER);
    const treas = legs.find((l) => l.to === DEFAULT_TREASURY);
    assert.ok(owner);
    assert.ok(treas);
    assert.equal(owner!.lamports + treas!.lamports, Math.round(fee * 1e9));
  });

  it("splits only the owner share when the fee generator was invited", () => {
    const fee = feeOn(1);
    const s = houseShare(fee, true, true);
    assert.equal(s.dev, 0.005);
    assert.equal(s.owner, 0.00125);
    assert.equal(s.referral, 0.00125);
    assert.equal(s.treasury, 0.0025);
    const legs = houseFeeLegs({
      from: FROM,
      feeSol: fee,
      creator: DEV,
      referrer: REF,
      owner: DEFAULT_OWNER,
      treasury: DEFAULT_TREASURY,
    });
    assert.equal(legs.length, 4);
    assert.equal(legs.find((l) => l.to === DEV)?.lamports, 5_000_000);
    assert.equal(legs.find((l) => l.to === DEFAULT_OWNER)?.lamports, 1_250_000);
    assert.equal(legs.find((l) => l.to === REF)?.lamports, 1_250_000);
    assert.equal(legs.find((l) => l.to === DEFAULT_TREASURY)?.lamports, 2_500_000);
  });

  it("never takes referral from treasury", () => {
    const fee = splitFee(1, true);
    assert.equal(fee.treasury, splitFee(1, false).treasury);
  });
});
