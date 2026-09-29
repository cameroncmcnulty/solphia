import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLAIM_DUST_SOL,
  claimSolFromBalances,
  claimableCreator,
  fmtClaimSol,
  nextCreatorPayout,
  sortByUnclaimedDesc,
  sumCreatorGenerated,
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

  it("the claim button equals card unclaimed, which is one pool, not the wallet sum", () => {
    const rows = [
      { mint: "Mint111111111111111111111111111111111111111", creatorFeesSol: 0.01, creatorUnclaimedSol: 0.003982 },
      { mint: "Mint222222222222222222222222222222222222222", creatorFeesSol: 0.072, creatorUnclaimedSol: 0.073338 },
      { mint: "Mint333333333333333333333333333333333333333", creatorFeesSol: 0, creatorUnclaimedSol: 0 },
    ];
    const p = nextCreatorPayout(rows);
    assert.equal(fmtClaimSol(p.nextSol), "0.073338");
    assert.equal(fmtClaimSol(p.totalUnclaimed), "0.073338");
    assert.equal(fmtClaimSol(p.nextSol), fmtClaimSol(p.totalUnclaimed));
    assert.equal(p.mints.length, 1);
    assert.equal(p.mints[0], p.next?.mint);
    assert.equal(p.restCount, 1);
    assert.equal(fmtClaimSol(sumCreatorUnclaimed(rows)), "0.07732");
    assert.notEqual(fmtClaimSol(p.nextSol), fmtClaimSol(sumCreatorUnclaimed(rows)));
    assert.equal(fmtClaimSol(sumCreatorGenerated(rows)), "0.082");
  });

  it("card unclaimed and the button are the highest unpaid pool", () => {
    const rows = [
      { mint: "MintSmall111111111111111111111111111111111", creatorUnclaimedSol: 0.0029993, createdAt: 2 },
      { mint: "MintTest11111111111111111111111111111111111", creatorUnclaimedSol: 0.061849, createdAt: 1 },
    ];
    const p = nextCreatorPayout(rows);
    assert.equal(sortByUnclaimedDesc(rows)[0]?.mint, p.next?.mint);
    assert.equal(p.mints[0], "MintTest11111111111111111111111111111111111");
    assert.equal(p.mints.length, 1);
    assert.equal(fmtClaimSol(p.nextSol), "0.061849");
    assert.equal(fmtClaimSol(p.totalUnclaimed), "0.061849");
  });

  it("advertises the simulated SOL credit Phantom shows, not a stale pool field", () => {
    const pre = 1_000_000_000;
    const post = 1_000_195_000;
    const fee = 8_000;
    assert.equal(fmtClaimSol(claimSolFromBalances(pre, post, fee)), "0.000203");
    assert.equal(claimSolFromBalances(pre, pre - 5_000, 5_000), 0);
    assert.equal(claimSolFromBalances(pre, pre, 0), 0);
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
