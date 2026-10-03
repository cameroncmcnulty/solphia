import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("partner fee sweep", () => {
  it("server-signs one pool at a time and never packs claims", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/launch/partnerSweep.ts"), "utf8");
    assert.match(src, /harvestKeypair/);
    assert.match(src, /buildDbcClaimPartnerBatch/);
    assert.match(src, /signSendAndConfirm/);
    assert.equal(src.includes("assembleClaimTx"), false);
    assert.match(src, /limit/);
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /buildDbcClaimPartnerBatch/);
    assert.equal(dbc.includes("ownerCut"), false);
    assert.match(src, /harvestSplit/);
    assert.match(src, /payoutAddress/);
    assert.match(src, /ownerAddress/);
    assert.match(src, /packClaimWithLegs|sendHarvestSol/);
    assert.match(src, /decoratePartnerClaimTx/);
    const cron = readFileSync(path.join(process.cwd(), "src/app/api/cron/tick/route.ts"), "utf8");
    assert.match(cron, /sweepPartnerFees/);
  });

  it("feeClaimer is the displayed Phantom treasury, not a harvest key", () => {
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /treasuryAddress/);
    assert.equal(dbc.includes("harvestAddress"), false);
    assert.equal(dbc.includes("harvestKeypair"), false);
    assert.match(dbc, /creatorTradingFeePercentage:\s*50/);
    const pay = readFileSync(path.join(process.cwd(), "src/lib/fees/payout.ts"), "utf8");
    assert.match(pay, /Owner and treasury always get the Phantom wallets they set/);
  });
});
