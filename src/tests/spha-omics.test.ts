import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SPHA_SLICES,
  SPHA_SUPPLY,
  sphaAllocations,
  sphaBpsTotal,
  sphaCurveTokens,
  sphaMissingDest,
  sphaRawAmount,
  sphaReservedTokens,
  sphaSplitLegs,
  sphaTokensFor,
} from "../lib/token/omics";

describe("spha tokenomics", () => {
  it("sums to 100 percent and 200 million tokens", () => {
    assert.equal(sphaBpsTotal(), 10_000);
    assert.equal(SPHA_SUPPLY, 200_000_000);
    const sum = SPHA_SLICES.reduce((s, x) => s + sphaTokensFor(x.bps), 0);
    assert.equal(sum, SPHA_SUPPLY);
    const byId = Object.fromEntries(SPHA_SLICES.map((s) => [s.id, s.bps]));
    assert.equal(byId.owner, 860);
    assert.equal(byId.foundation, 970);
    assert.equal(byId.treasury, 460);
    assert.equal(byId.lp, 7710);
    assert.equal(SPHA_SLICES.find((s) => s.id === "lp")?.label, "Bonding curve");
    assert.equal(sphaReservedTokens(), 45_800_000);
    assert.equal(sphaCurveTokens(), 154_200_000);
  });

  it("pays the airdrop wallet for the foundation slice when set and does not require an LP wallet", () => {
    const dest = {
      owner: "Own111111111111111111111111111111111111111",
      foundation: "Fnd111111111111111111111111111111111111111",
      airdrop: "Air111111111111111111111111111111111111111",
      treasury: "Trs111111111111111111111111111111111111111",
      lp: "",
    };
    const rows = sphaAllocations(dest);
    assert.equal(rows.find((r) => r.id === "foundation")?.wallet, dest.airdrop);
    assert.equal(rows.find((r) => r.id === "owner")?.tokens, 17_200_000);
    assert.equal(rows.find((r) => r.id === "lp")?.tokens, 154_200_000);
    assert.equal(rows.find((r) => r.id === "lp")?.wallet, "curve");
    assert.equal(sphaMissingDest({ owner: dest.owner, treasury: dest.treasury }).includes("lp"), false);
    assert.equal(sphaMissingDest({ owner: dest.owner, treasury: dest.treasury }).includes("foundation"), true);
    assert.equal(sphaRawAmount(1, 9), 1_000_000_000n);
    assert.equal(sphaRawAmount(1), 1_000_000n);
  });

  it("splits leftover to owner and foundation and keeps treasury in leftoverReceiver", () => {
    const dest = {
      owner: "Own111111111111111111111111111111111111111",
      foundation: "Fnd111111111111111111111111111111111111111",
      airdrop: "",
      treasury: "Trs111111111111111111111111111111111111111",
      lp: "",
    };
    const legs = sphaSplitLegs(dest);
    assert.equal(legs.length, 2);
    assert.equal(legs.find((l) => l.id === "owner")?.tokens, 17_200_000);
    assert.equal(legs.find((l) => l.id === "owner")?.to, dest.owner);
    assert.equal(legs.find((l) => l.id === "foundation")?.tokens, 19_400_000);
    assert.equal(legs.find((l) => l.id === "foundation")?.to, dest.foundation);
    assert.equal(sphaSplitLegs({ ...dest, owner: dest.treasury, foundation: dest.treasury }).length, 0);
    const src = readFileSync(path.join(process.cwd(), "src/components/admin/SphaLaunch.tsx"), "utf8");
    assert.match(src, /sphaSplitLegs/);
    assert.match(src, /Send leftover to owner and foundation/);
    assert.equal(src.includes("with the send widget"), false);
  });
});
