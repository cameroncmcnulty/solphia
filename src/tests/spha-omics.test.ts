import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SPHA_SLICES,
  SPHA_SUPPLY,
  sphaAllocations,
  sphaBpsTotal,
  sphaMissingDest,
  sphaRawAmount,
  sphaTokensFor,
} from "../lib/token/omics";

describe("spha tokenomics", () => {
  it("sums to 100 percent and 100 million tokens", () => {
    assert.equal(sphaBpsTotal(), 10_000);
    assert.equal(SPHA_SUPPLY, 100_000_000);
    const sum = SPHA_SLICES.reduce((s, x) => s + sphaTokensFor(x.bps), 0);
    assert.equal(sum, SPHA_SUPPLY);
    const byId = Object.fromEntries(SPHA_SLICES.map((s) => [s.id, s.bps]));
    assert.equal(byId.owner, 860);
    assert.equal(byId.foundation, 970);
    assert.equal(byId.treasury, 460);
    assert.equal(byId.lp, 7710);
    assert.equal(SPHA_SLICES.find((s) => s.id === "lp")?.label, "Public market");
  });

  it("pays the airdrop wallet for the foundation slice when set", () => {
    const dest = {
      owner: "Own111111111111111111111111111111111111111",
      foundation: "Fnd111111111111111111111111111111111111111",
      airdrop: "Air111111111111111111111111111111111111111",
      treasury: "Trs111111111111111111111111111111111111111",
      lp: "Lp1111111111111111111111111111111111111111",
    };
    const rows = sphaAllocations(dest);
    assert.equal(rows.find((r) => r.id === "foundation")?.wallet, dest.airdrop);
    assert.equal(rows.find((r) => r.id === "owner")?.tokens, 8_600_000);
    assert.equal(rows.find((r) => r.id === "lp")?.tokens, 77_100_000);
    assert.equal(sphaMissingDest({ owner: dest.owner, treasury: dest.treasury }).includes("lp"), true);
    assert.equal(sphaRawAmount(1, 9), 1_000_000_000n);
  });
});
