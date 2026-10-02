import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("partner fee sweep", () => {
  it("server-signs one pool at a time and never packs claims", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/launch/partnerSweep.ts"), "utf8");
    assert.match(src, /treasuryKeypair/);
    assert.match(src, /buildDbcClaimPartnerBatch/);
    assert.match(src, /signSendAndConfirm/);
    assert.equal(src.includes("assembleClaimTx"), false);
    assert.match(src, /limit/);
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /buildDbcClaimPartnerBatch/);
    assert.match(dbc, /ownerCut/);
    const cron = readFileSync(path.join(process.cwd(), "src/app/api/cron/tick/route.ts"), "utf8");
    assert.match(cron, /sweepPartnerFees/);
  });
});
