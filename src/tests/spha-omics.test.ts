import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SPHA_SLICES,
  SPHA_SUPPLY,
  mergeSphaTestLaunches,
  sphaLaunchMints,
  sphaAllocations,
  sphaBpsTotal,
  sphaCurveTokens,
  sphaMissingDest,
  sphaRawAmount,
  sphaReservedTokens,
  sphaTeamLegs,
  sphaTokensFor,
} from "../lib/token/omics";
import { applyOpsConfig, emptyState } from "../lib/store";
import { DEFAULT_FUND, DEFAULT_OWNER, DEFAULT_TREASURY } from "../lib/protocolWallets";
import { splitFee } from "../lib/launch/curve";

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
    assert.match(route, /prepareTrade/);
    assert.match(route, /tokenUiAmount/);
    assert.match(route, /testLaunches/);
    assert.match(route, /mergeSphaTestLaunches/);
    assert.match(route, /const side = b\.side === "sell" \? "sell" : "buy"/);
    assert.equal(route.includes("book.dbcConfig"), false);
    assert.match(route, /if \(official\)/);
    assert.match(route, /s\.sphaMint = b\.mint/);
    assert.match(route, /s\.sphaTestLaunch = row/);
    assert.match(route, /mergeSphaTestLaunches\(s\.sphaTestLaunches, \[\], s\.sphaTestLaunch \|\| null\)/);
    assert.match(route, /s\.sphaDbcConfig = b\.config/);
    assert.match(route, /config: b\.config && isSolanaAddress\(b\.config\) \? b\.config : undefined/);
    assert.match(route, /prepareClaim/);
    assert.match(route, /dbcFeeBreakdown/);
    assert.match(route, /sphaLaunchMints/);
  });

  it("collects official and test 200M mints without touching the pad config", () => {
    const mints = sphaLaunchMints({
      sphaMint: "Off111111111111111111111111111111111111111",
      sphaLaunch: { mint: "Off111111111111111111111111111111111111111" },
      sphaTestLaunch: { mint: "Tst111111111111111111111111111111111111111" },
      sphaTestLaunches: [
        { mint: "Tst111111111111111111111111111111111111111" },
        { mint: "Abc111111111111111111111111111111111111111" },
      ],
    });
    assert.deepEqual(mints, [
      "Off111111111111111111111111111111111111111",
      "Tst111111111111111111111111111111111111111",
      "Abc111111111111111111111111111111111111111",
    ]);
    assert.deepEqual(sphaLaunchMints(null), []);
  });

  it("mints 17.2M / 19.4M / 9.2M into owner, foundation, and treasury and leaves 154.2M on the curve", () => {
    const dest = {
      owner: DEFAULT_OWNER,
      foundation: DEFAULT_FUND,
      airdrop: "",
      treasury: DEFAULT_TREASURY,
      lp: "",
    };
    const legs = sphaTeamLegs(dest);
    assert.deepEqual(
      legs.map((l) => [l.id, l.to, l.tokens]),
      [
        ["owner", DEFAULT_OWNER, 17_200_000],
        ["foundation", DEFAULT_FUND, 19_400_000],
        ["treasury", DEFAULT_TREASURY, 9_200_000],
      ],
    );
    assert.equal(sphaCurveTokens(), 154_200_000);
    assert.equal(17_200_000 + 19_400_000 + 9_200_000 + 154_200_000, SPHA_SUPPLY);
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /totalTokenSupply: sphaCurveTokens\(\)/);
    assert.match(dbc, /leftover: 0/);
    assert.match(dbc, /leftoverReceiver: treasury/);
    assert.match(dbc, /feeClaimer: treasury/);
    assert.match(dbc, /Never write this config onto the shared pad dbcConfig/);
    assert.match(dbc, /createConfigAndPoolWithTransferHook/);
    assert.equal(dbc.includes("book.dbcConfig"), false);
    const mint = readFileSync(path.join(process.cwd(), "src/lib/token/mint.ts"), "utf8");
    assert.match(mint, /sphaTeamLegs/);
    assert.match(mint, /createMintToCheckedInstruction/);
    assert.match(mint, /AuthorityType.MintTokens, null/);
  });

  it("keeps the last eight admin test launches, newer stamp wins, local overwrites equal stamps", () => {
    const row = (mint: string, at: number, symbol = mint) => ({ mint, launchedAt: at, symbol });
    const remote = [row("mintA", 10), row("mintB", 20), row("mintC", 5)];
    const local = [row("mintA", 10, "LOCAL"), row("mintD", 30)];
    const extra = row("mintE", 40);
    const merged = mergeSphaTestLaunches(local, remote, extra);
    assert.deepEqual(
      merged.map((r) => r.mint),
      ["mintE", "mintD", "mintB", "mintA", "mintC"],
    );
    assert.equal(merged.find((r) => r.mint === "mintA")?.symbol, "LOCAL");
    const many = Array.from({ length: 12 }, (_, i) => row(`m${i}`, i + 1));
    assert.equal(mergeSphaTestLaunches(many, [], null).length, 8);
    assert.equal(mergeSphaTestLaunches(many, [], null)[0]?.mint, "m11");
    const olderExtra = mergeSphaTestLaunches([row("mintA", 50, "NEW")], [row("mintA", 10, "OLD")], row("mintA", 20, "MID"));
    assert.equal(olderExtra[0]?.symbol, "NEW");
  });

  it("does not let empty remote ops wipe dashboard test CAs", () => {
    const local = emptyState();
    local.opsUpdatedAt = 5;
    local.sphaTestLaunch = {
      mint: "Test111111111111111111111111111111111111111",
      network: "mainnet-beta",
      name: "Solphia Test",
      symbol: "TESTTOKEN",
      supply: SPHA_SUPPLY,
      launchedAt: 50,
      sigs: ["sig"],
      allocations: [],
    };
    local.sphaTestLaunches = [local.sphaTestLaunch];
    const dirty = applyOpsConfig(local, {
      opsUpdatedAt: 9,
      sphaTestLaunch: null,
      sphaTestLaunches: [],
    });
    assert.equal(local.sphaTestLaunch?.symbol, "TESTTOKEN");
    assert.equal(local.sphaTestLaunches?.[0]?.mint, "Test111111111111111111111111111111111111111");
    assert.equal(dirty, false);
  });

  it("shows full copyable CAs and desk buy/sell on the 200M launcher, defaulting to TESTTOKEN", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/admin/SphaLaunch.tsx"), "utf8");
    assert.match(src, /useState\("TESTTOKEN"\)/);
    assert.match(src, /Launch \$\{symbol \|\| "TESTTOKEN"\}/);
    assert.match(src, /<CopyCa ca=\{row\.mint\} full \/>/);
    assert.match(src, /prepareTrade/);
    assert.match(src, /deskTrade\("buy"\)/);
    assert.match(src, /deskTrade\("sell"\)/);
    assert.match(src, /copyText\(ca, "CA copied"\)/);
    assert.match(src, /solscan\.io\/token\/\$\{row\.mint\}/);
    assert.match(src, /dexscreener\.com\/solana\/\$\{row\.mint\}/);
    assert.match(src, /MAINNET \$SPHA\. 200,000,000 supply\. 77\.1% on the curve\. Continue\?/);
    assert.match(src, /useState<"test" \| "official">\("test"\)/);
    assert.equal(src.toLowerCase().includes("phantom"), false);
    assert.match(src, /17\.2M \/ 19\.4M \/ 9\.2M/);
    assert.match(src, /setTradeSol\(""\)/);
    assert.match(src, /prepareClaim/);
    assert.match(src, /deskClaim\("creator"\)/);
    assert.match(src, /deskClaim\("partner"\)/);
    assert.match(src, /reloadAt/);
    assert.match(src, /Refreshing launched tokens/);
    const copy = readFileSync(path.join(process.cwd(), "src/components/CopyCa.tsx"), "utf8");
    assert.match(copy, /full = false/);
    assert.match(copy, /full \? "break-all" : "truncate"/);
    const launch = readFileSync(path.join(process.cwd(), "src/app/api/launch/route.ts"), "utf8");
    assert.match(launch, /liveDbcConfig/);
    assert.equal(launch.includes("sphaDbcConfig"), false);
  });

  it("splits the 1% curve fee 50/25/25 creator / owner / treasury", () => {
    const fee = splitFee(1, false);
    assert.equal(fee.dev, 0.5);
    assert.equal(fee.owner, 0.25);
    assert.equal(fee.treasury, 0.25);
    assert.equal(fee.referral, 0);
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /startingFeeBps: 100/);
    assert.match(dbc, /creatorTradingFeePercentage: 50/);
    assert.match(dbc, /MigrationFeeOption.FixedBps100/);
  });
});
