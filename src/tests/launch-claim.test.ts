import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLAIM_DUST_SOL,
  claimableCreator,
  fmtClaimSol,
  sumCreatorUnclaimed,
  uniqueByMint,
} from "../lib/launch/claim";
import { feesFromPoolAccount } from "../lib/launch/claim";

describe("creator claim amounts", () => {
  it("does not double-count the same mint when summing unclaimed", () => {
    const rows = [
      { mint: "Mint111111111111111111111111111111111111111", creatorUnclaimedSol: 0.01 },
      { mint: "Mint111111111111111111111111111111111111111", creatorUnclaimedSol: 0.01 },
      { mint: "Mint222222222222222222222222222222222222222", creatorUnclaimedSol: 0.0092 },
    ];
    assert.equal(uniqueByMint(rows).length, 2);
    assert.ok(Math.abs(sumCreatorUnclaimed(rows) - 0.0192) < 1e-12);
    assert.equal(claimableCreator(rows).length, 2);
  });

  it("drops dust so the button cannot advertise more than Phantom will pay", () => {
    const rows = [
      { mint: "Mint111111111111111111111111111111111111111", creatorUnclaimedSol: CLAIM_DUST_SOL },
      { mint: "Mint222222222222222222222222222222222222222", creatorUnclaimedSol: 0.003982 },
    ];
    assert.equal(claimableCreator(rows).length, 1);
    assert.equal(fmtClaimSol(sumCreatorUnclaimed(rows)), "0.003982");
  });

  it("prints claim SOL without rounding 0.003982 up to 0.004", () => {
    assert.equal(fmtClaimSol(0.0192), "0.0192");
    assert.equal(fmtClaimSol(0.003982), "0.003982");
    assert.equal(fmtClaimSol(0), "0");
  });

  it("treats pool.creatorQuoteFee as unclaimed, not total trading volume", () => {
    const fees = feesFromPoolAccount({
      creatorQuoteFee: 3_982_000,
      partnerQuoteFee: 3_982_000,
      metrics: { totalTradingQuoteFee: 19_200_000 },
    });
    assert.equal(fees.creatorUnclaimedSol, 0.003982);
    assert.equal(fees.partnerUnclaimedSol, 0.003982);
    assert.ok(fees.creatorUnclaimedSol < fees.creatorFeesSol);
    assert.ok(Math.abs(fees.creatorUnclaimedSol - 0.0192) > 0.01);
  });
});
