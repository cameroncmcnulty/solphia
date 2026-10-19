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
  sphaTeamLegs,
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

  it("mints team slices to owner, foundation, and treasury at launch", () => {
    const dest = {
      owner: "Own111111111111111111111111111111111111111",
      foundation: "Fnd111111111111111111111111111111111111111",
      airdrop: "",
      treasury: "Trs111111111111111111111111111111111111111",
      lp: "",
    };
    const legs = sphaTeamLegs(dest);
    assert.equal(legs.length, 3);
    assert.equal(legs.find((l) => l.id === "owner")?.tokens, 17_200_000);
    assert.equal(legs.find((l) => l.id === "owner")?.to, dest.owner);
    assert.equal(legs.find((l) => l.id === "foundation")?.tokens, 19_400_000);
    assert.equal(legs.find((l) => l.id === "foundation")?.to, dest.foundation);
    assert.equal(legs.find((l) => l.id === "treasury")?.tokens, 9_200_000);
    assert.equal(legs.find((l) => l.id === "treasury")?.to, dest.treasury);
    const src = readFileSync(path.join(process.cwd(), "src/components/admin/SphaLaunch.tsx"), "utf8");
    assert.match(src, /prepareTeam/);
    assert.match(src, /preparePoolMeta/);
    assert.match(src, /prepareBuy/);
    assert.match(src, /Mint team allocations/);
    assert.match(src, /SPHA_SUPPLY/);
    assert.equal(src.includes("1_000_000_000"), false);
    assert.equal(src.includes("shared pad 1B"), false);
    assert.equal(src.includes("Send leftover to owner and foundation"), false);
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /sphaCurveTokens\(\)/);
    assert.match(dbc, /leftover: 0/);
    assert.match(dbc, /CreatorUpdateAndMintAuthority/);
    assert.match(dbc, /createConfigAndPoolWithTransferHook/);
    assert.match(dbc, /createPoolMetadata/);
    assert.match(dbc, /claimCreatorTradingFee2\(/);
    assert.match(dbc, /receiver: creator/);
    const route = readFileSync(path.join(process.cwd(), "src/app/api/admin/spha/route.ts"), "utf8");
    assert.match(route, /buildSphaDbcLaunchTx/);
    assert.match(route, /pinSphaTokenMeta/);
    assert.match(route, /isTokenMetaUri/);
    assert.match(route, /preparePoolMeta/);
    assert.match(route, /prepareBuy/);
    assert.equal(route.includes("buildDbcLaunchTx"), false);
    assert.equal(route.includes('uri = (b.uri || "https://solphia.io")'), false);
    assert.equal(/supply:\s*b\.mode === "official" \? SPHA_SUPPLY : 1_000_000_000/.test(route), false);
  });
});
