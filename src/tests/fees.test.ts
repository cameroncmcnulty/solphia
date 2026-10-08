import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_OWNER, DEFAULT_TREASURY } from "../lib/protocolWallets";
import { feeOn, splitFee } from "../lib/launch/curve";
import { harvestSplit, houseFeeLegs, houseFeeMissing, houseShare } from "../lib/fees/payout";
import { liveSwapFeeSol } from "../lib/swap/route";
import { formatSol, formatSolUsd } from "../lib/formatSol";

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
      vaults: false,
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
      vaults: false,
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

  it("hold mode sends owner + treasury cuts to treasury only", () => {
    const fee = feeOn(1);
    const legs = houseFeeLegs({
      from: FROM,
      feeSol: fee,
      owner: DEFAULT_OWNER,
      treasury: DEFAULT_TREASURY,
      mode: "hold",
      vaults: false,
    });
    assert.equal(legs.length, 1);
    assert.equal(legs[0]!.to, DEFAULT_TREASURY);
    assert.equal(legs[0]!.lamports, Math.round(fee * 1e9));
  });

  it("even mode sends 50/50 owner and treasury live", () => {
    const legs = houseFeeLegs({
      from: FROM,
      feeSol: 0.2,
      owner: DEFAULT_OWNER,
      treasury: DEFAULT_TREASURY,
      mode: "even",
      vaults: false,
    });
    assert.equal(legs.length, 2);
    assert.equal(legs.find((l) => l.to === DEFAULT_OWNER)?.lamports, 100_000_000);
    assert.equal(legs.find((l) => l.to === DEFAULT_TREASURY)?.lamports, 100_000_000);
  });

  it("split mode without a creator still pays owner 25% live", () => {
    const fee = feeOn(1);
    const legs = houseFeeLegs({
      from: FROM,
      feeSol: fee,
      owner: DEFAULT_OWNER,
      treasury: DEFAULT_TREASURY,
      mode: "split",
      vaults: false,
    });
    assert.equal(legs.find((l) => l.to === DEFAULT_OWNER)?.lamports, 2_500_000);
    assert.equal(legs.find((l) => l.to === DEFAULT_TREASURY)?.lamports, 7_500_000);
  });

  it("harvests legacy partner-only claims 50/50 owner and treasury", () => {
    const s = harvestSplit(0.008, true, true);
    assert.equal(s.dev, 0);
    assert.equal(s.owner, 0.004);
    assert.equal(s.treasury, 0.004);
  });

  it("harvests full 1% claims 50 creator / 25 owner / 25 treasury", () => {
    const s = harvestSplit(0.01, false, true);
    assert.equal(s.dev, 0.005);
    assert.equal(s.owner, 0.0025);
    assert.equal(s.treasury, 0.0025);
  });

  it("refuses a 1% swap when owner or treasury cannot receive their cut", () => {
    const fee = feeOn(1);
    assert.equal(houseFeeMissing({ from: FROM, feeSol: fee, owner: DEFAULT_OWNER, treasury: DEFAULT_TREASURY, vaults: false }), null);
    assert.match(houseFeeMissing({ from: "nope", feeSol: fee, owner: DEFAULT_OWNER, treasury: DEFAULT_TREASURY }) || "", /wallet/i);
    assert.equal(houseFeeMissing({ from: FROM, feeSol: 0, owner: DEFAULT_OWNER, treasury: DEFAULT_TREASURY }), null);
  });

  it("takes exact 1% even on small SOL sizes (no floor-to-zero)", () => {
    assert.equal(liveSwapFeeSol(1), 0.01);
    assert.equal(liveSwapFeeSol(0.015), 0.00015);
    assert.equal(liveSwapFeeSol(0.01), 0.0001);
    assert.ok(liveSwapFeeSol(0.01) * 1e9 >= 100_000);
  });

  it("shows dust SOL instead of 0", () => {
    assert.equal(formatSol(0), "0");
    assert.equal(formatSol(0.00025), "0.00025");
    assert.equal(formatSolUsd(0.00025, 200), "$0.05");
  });

  it("pays owner and treasury live even when vaults are on", () => {
    const fee = feeOn(1);
    const legs = houseFeeLegs({
      from: FROM,
      feeSol: fee,
      creator: DEV,
      owner: DEFAULT_OWNER,
      treasury: DEFAULT_TREASURY,
      vaults: true,
    });
    assert.equal(legs.find((l) => l.to === DEFAULT_OWNER)?.lamports, 2_500_000);
    assert.equal(legs.find((l) => l.to === DEFAULT_TREASURY)?.lamports, 2_500_000);
  });
});
