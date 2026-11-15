import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  AMOUNT_JITTER_MAX,
  buildHopForest,
  DELAY_MS_MAX,
  DELAY_MS_MIN,
  hopCount,
  jitterDelayMs,
  jitterLamports,
  mergeVault,
  normalizeScrambler,
  SCRAMBLER_HOPS_MAX,
  SCRAMBLER_HOPS_MIN,
  vaultSecrets,
  warmupCycles,
  warmupSol,
  WARMUP_CYCLES_MAX,
  WARMUP_CYCLES_MIN,
  WARMUP_SOL_MAX,
  WARMUP_SOL_MIN,
} from "../lib/tools/scrambler";
import {
  buildSniperIdentities,
  nameLinesUp,
  SNIPER_CREATED_ON,
  SNIPER_CREATOR_BUY_SOL,
  SNIPER_TELEGRAM,
  SNIPER_X,
  SNIPER_TEAM_BPS_MAX,
  tickerHandle,
  tickerLooksReal,
  tickerOk,
} from "../lib/tools/identities";

describe("data launcher V2 scrambler", () => {
  it("jitters amounts ±5–15% and never returns round SOL", () => {
    const used = new Set<number>();
    const base = 500_000_000;
    for (let i = 0; i < 40; i++) {
      const n = jitterLamports(base, { used });
      assert.notEqual(n, base);
      assert.equal(n % 10_000_000 === 0, false);
      const pct = Math.abs(n - base) / base;
      assert.ok(pct > 0);
      assert.ok(pct <= AMOUNT_JITTER_MAX + 0.08);
    }
    assert.ok(used.size >= 30);
  });

  it("jitters hop delays inside 10s–10min and never lands on 10/30/60s", () => {
    const used = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const d = jitterDelayMs(DELAY_MS_MIN, DELAY_MS_MAX, used);
      assert.ok(d >= DELAY_MS_MIN);
      assert.ok(d <= DELAY_MS_MAX);
      assert.equal(d % 10_000 === 0, false);
    }
  });

  it("builds 4–7 hop paths and branches so finals do not share the exact route", () => {
    assert.equal(SCRAMBLER_HOPS_MIN, 4);
    assert.equal(SCRAMBLER_HOPS_MAX, 7);
    const n = hopCount(4, 7);
    assert.ok(n >= 4 && n <= 7);
    const ids = ["a", "b", "c", "d"];
    const forest = buildHopForest(ids, { hopsMin: 4, hopsMax: 7, branch: true });
    assert.equal(forest.length, 4);
    const signatures = forest.map((p) => p.nodes.map((n) => `${n.role}:${n.hopIndex}:${n.shared ? 1 : 0}`).join(">"));
    assert.equal(new Set(signatures).size > 1, true);
    for (const path of forest) {
      assert.ok(path.hops >= 4 && path.hops <= 7);
      assert.equal(path.nodes[path.nodes.length - 1]?.role, "final");
      assert.equal(path.nodes.filter((n) => n.role === "hop").length, path.hops);
    }
  });

  it("keeps warmup optional, small, and 2–5 cycles", () => {
    const s = normalizeScrambler({ warmup: false });
    assert.equal(s.warmup, false);
    assert.equal(s.hopsMin, 4);
    assert.equal(s.hopsMax, 7);
    for (let i = 0; i < 20; i++) {
      const c = warmupCycles();
      assert.ok(c >= WARMUP_CYCLES_MIN && c <= WARMUP_CYCLES_MAX);
      const sol = warmupSol();
      assert.ok(sol >= WARMUP_SOL_MIN && sol <= WARMUP_SOL_MAX + 0.002);
    }
  });

  it("merges the wallet vault and refuses to wipe existing secrets", () => {
    const prev = {
      AAA: { secret: "keep-me", role: "hop" as const, createdAt: 1, tokenId: "t1", hopIndex: 0 },
    };
    const empty = mergeVault(prev, {});
    assert.equal(empty.AAA?.secret, "keep-me");
    const overwrite = mergeVault(prev, {
      AAA: { secret: "attacker", role: "final", createdAt: 9, tokenId: "x", hopIndex: 3 },
      BBB: { secret: "new", role: "final", createdAt: 2, tokenId: "t2", hopIndex: 4 },
    });
    assert.equal(overwrite.AAA?.secret, "keep-me");
    assert.equal(overwrite.BBB?.secret, "new");
    assert.deepEqual(vaultSecrets(overwrite), { AAA: "keep-me", BBB: "new" });
  });

  it("isolates V2 from V1 keys and never wipes the vault", () => {
    const v2 = readFileSync(path.join(process.cwd(), "src/lib/tools/batchLaunchV2.ts"), "utf8");
    const v1 = readFileSync(path.join(process.cwd(), "src/lib/tools/batchLaunch.ts"), "utf8");
    assert.match(v2, /KEYS.batchLaunchV2/);
    assert.match(v2, /KEYS.batchLaunchV2Keys/);
    assert.match(v2, /mergeVault/);
    assert.match(v2, /stopToken/);
    assert.match(v2, /advanceScramble/);
    assert.match(v2, /armScramble/);
    assert.match(v2, /DUMP_SLIPPAGE_BPS/);
    assert.match(v2, /minSol: 0/);
    assert.equal(v2.includes("dumpHot"), false);
    assert.equal(v2.includes("tokenDumpHot"), false);
    assert.match(v2, /KEEP_FOR_STOP_LAMPORTS/);
    assert.match(v2, /liquidating/);
    const dumpFn = v2.slice(v2.indexOf("async function dumpAndAdvance"), v2.indexOf("function tokenWalletPks"));
    assert.equal(dumpFn.includes("sellAllHoldings"), false);
    assert.equal(dumpFn.includes("dumpHot"), false);
    const stopFn = v2.slice(
      v2.indexOf("export async function stopCampaign"),
      v2.indexOf("export async function resetCampaign"),
    );
    assert.match(stopFn, /minSol: 0/);
    assert.match(stopFn, /liquidating/);
    const finishFn = v2.slice(v2.indexOf("async function finishTickState"), v2.indexOf("export async function tickBatchLaunch"));
    assert.equal(finishFn.includes("closeOutCampaign"), false);
    assert.equal(v2.includes("saveKeys({})"), false);
    const resetFn = v2.slice(v2.indexOf("export async function resetCampaign"));
    assert.equal(resetFn.slice(0, 700).includes("saveKeys({})"), false);
    assert.equal(resetFn.slice(0, 700).includes("saveVault({})"), false);
    assert.match(v2, /Existing secrets always win/);
    assert.equal(v1.includes("batchLaunchV2"), false);
    const ui = readFileSync(path.join(process.cwd(), "src/components/admin/sections/DataLauncherV2.tsx"), "utf8");
    assert.match(ui, /stopToken/);
    assert.match(ui, /STOP/);
    assert.match(ui, /SCRAMBLER/);
    assert.match(ui, /launcher-v2/);
    const route = readFileSync(path.join(process.cwd(), "src/app/api/admin/tools/launcher-v2/route.ts"), "utf8");
    assert.match(route, /stopToken/);
    assert.match(route, /extractV2ToTreasury/);
    assert.match(route, /batchLaunchV2/);
    const cron = readFileSync(path.join(process.cwd(), "src/app/api/cron/tick/route.ts"), "utf8");
    assert.match(cron, /batchLaunchV2/);
  });

  it("uses exact hot tickers and live socials on V2 identities", () => {
    assert.equal(SNIPER_CREATED_ON, "https://www.meteora.ag");
    assert.equal(SNIPER_X, "https://x.com/solphiaio");
    assert.equal(SNIPER_TELEGRAM, "https://t.me/solphiaio");
    assert.equal(SNIPER_CREATOR_BUY_SOL, 0.05);
    assert.equal(SNIPER_TEAM_BPS_MAX, 500);
    const rows = buildSniperIdentities({
      narrative: 1,
      random: 1,
      hits: [{ symbol: "PEPE", name: "Pepe", theme: "pepe" }],
      used: [],
    });
    const pepe = rows.find((r) => r.kind === "narrative");
    assert.equal(pepe?.symbol, "PEPE");
    assert.equal(pepe?.name, "Pepe");
    assert.equal(pepe?.x, SNIPER_X);
    assert.equal(pepe?.telegram, SNIPER_TELEGRAM);
    assert.equal(pepe?.website, `https://solphia.io/c/${tickerHandle("PEPE")}`);
    assert.match(pepe?.blurb || "", /^\$PEPE /);
    assert.ok((pepe?.teamBps || 0) >= 300 && (pepe?.teamBps || 0) <= 500);
    const mew = buildSniperIdentities({
      narrative: 1,
      random: 0,
      hits: [{ symbol: "MEW", name: "Cat in a dogs world", theme: "cat" }],
      used: [],
    })[0];
    assert.equal(mew?.symbol, "MEW");
    assert.equal(mew?.name, "Cat in a dogs world");
    assert.equal(mew?.website, `https://solphia.io/c/${tickerHandle("MEW")}`);
    const reused = buildSniperIdentities({
      narrative: 2,
      random: 0,
      hits: [{ symbol: "PEPE", name: "Pepe", theme: "pepe" }],
      used: ["PEPE"],
    });
    assert.equal(reused.some((r) => r.symbol === "PEPE" || r.symbol === "PEPE2"), false);
    assert.equal(reused.every((r) => tickerLooksReal(r.symbol) && nameLinesUp(r.symbol, r.name)), true);
    assert.equal(nameLinesUp("PEPE", "Pepe"), true);
    assert.equal(nameLinesUp("APE", "Baby Ape"), true);
    assert.equal(nameLinesUp("WIF", "dogwifhat"), true);
    assert.equal(nameLinesUp("MEW", "Cat in a dogs world"), true);
    assert.equal(nameLinesUp("PNUT", "Peanut"), true);
    assert.equal(nameLinesUp("BOME", "Book of Meme"), true);
    assert.equal(tickerLooksReal("PEPE"), true);
    assert.equal(tickerLooksReal("PEPE2"), false);
    assert.equal(tickerLooksReal("THE"), false);
    const many = buildSniperIdentities({ narrative: 12, random: 8, used: [] });
    const ticks = new Set(many.map((r) => r.symbol));
    assert.equal(ticks.size, many.length);
    for (const row of many) {
      assert.equal(tickerOk(row.symbol), true);
      assert.equal(tickerLooksReal(row.symbol), true);
      assert.equal(/^[A-Z]{2,8}\d{1,3}$/.test(row.symbol), false);
      assert.ok(row.name.length >= 2 && row.name.length <= 24);
      assert.equal(row.website, `https://solphia.io/c/${tickerHandle(row.symbol)}`);
      assert.match(row.blurb, new RegExp(`^\\$${row.symbol}\\b`));
      assert.equal(nameLinesUp(row.symbol, row.name), true);
      assert.ok(row.id.includes(`_${row.symbol}_`));
    }
    const again = buildSniperIdentities({ narrative: 8, random: 0, used: many.map((r) => r.symbol) });
    assert.equal(again.some((r) => r.symbol === "PEPE"), false);
    assert.equal(again.every((r) => tickerLooksReal(r.symbol)), true);
    assert.equal(again.every((r) => !/^[A-Z]{2,8}\d{1,3}$/.test(r.symbol)), true);
    assert.equal(again.every((r) => !many.some((m) => m.symbol === r.symbol)), true);
    assert.equal(again.every((r) => nameLinesUp(r.symbol, r.name)), true);
  });

  it("launches V2 as sniper-visible SPL with live socials and no transfer hook", () => {
    const v2 = readFileSync(path.join(process.cwd(), "src/lib/tools/batchLaunchV2.ts"), "utf8");
    const v1 = readFileSync(path.join(process.cwd(), "src/lib/tools/batchLaunch.ts"), "utf8");
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    const ids = readFileSync(path.join(process.cwd(), "src/lib/tools/identities.ts"), "utf8");
    const ui = readFileSync(path.join(process.cwd(), "src/components/admin/sections/DataLauncherV2.tsx"), "utf8");
    assert.match(v2, /buildSniperDbcLaunchTx/);
    assert.match(v2, /buildSniperIdentities/);
    assert.match(v2, /SNIPER_CREATED_ON/);
    assert.match(v2, /SNIPER_CREATOR_BUY_SOL/);
    assert.equal(v2.includes("buildHookedDbcLaunchTx"), false);
    assert.equal(v2.includes("buildProjectSliceMintTx"), false);
    assert.match(v1, /buildHookedDbcLaunchTx/);
    assert.match(dbc, /sniperCurveConfig/);
    assert.match(dbc, /buildSniperDbcLaunchTx/);
    assert.match(dbc, /createConfigAndPool\(/);
    assert.match(dbc, /TokenType\.SPLToken/);
    assert.match(dbc, /TokenAuthorityOption\.Immutable/);
    assert.equal(dbc.includes("book.dbcConfig"), false);
    assert.match(ids, /SNIPER_CREATED_ON = "https:\/\/www\.meteora\.ag"/);
    assert.match(ids, /SNIPER_X = "https:\/\/x\.com\/solphiaio"/);
    assert.match(ids, /SNIPER_TELEGRAM = "https:\/\/t\.me\/solphiaio"/);
    assert.match(ids, /sniperNarrativeIdentity/);
    assert.match(ids, /uniqueSniperTicker\(base.length >= 2 \? base : "MEME"/);
    assert.match(ids, /tickerLooksReal/);
    assert.match(ids, /nameLinesUp/);
    assert.match(ui, /vanilla SPL/);
    assert.match(ui, /no transfer hook/);
    assert.match(ui, /createdOn meteora/);
    assert.equal(ui.includes("sniper buys hit 1 SOL"), false);
    assert.equal(ui.includes("dump 1 SOL"), false);
    assert.match(ui, /Bags stay live until you click STOP/);
    assert.match(ui, /STOP the campaign/);
    assert.match(ui, /0\.05 SOL creator buy/);
    assert.match(ui, /LOAD \$SPHA MATCH DEFAULTS/);
    const oldWallets = readFileSync(path.join(process.cwd(), "src/components/admin/sections/OldWalletsPanel.tsx"), "utf8");
    assert.match(oldWallets, /OPEN SOL INCINERATOR/);
    assert.match(oldWallets, /sol-incinerator\.com\/tools/);
    assert.match(oldWallets, /RECLAIM RENT TO TREASURY/);
    assert.match(oldWallets, /OLD WALLETS/);
    assert.match(v2, /reclaimOldWalletsToTreasury/);
    assert.match(v2, /listOldWallets/);
    assert.match(v2, /createBurnInstruction/);
    assert.match(v2, /INCINERATOR_URL/);
    const launchFn = v2.slice(v2.indexOf("async function launchOne"), v2.indexOf("function nextQueued"));
    assert.ok(launchFn.indexOf("buildDbcPoolMetadataTx") < launchFn.indexOf("SNIPER_CREATOR_BUY_SOL"));
    const picker = readFileSync(path.join(process.cwd(), "src/components/admin/sections/Tools.tsx"), "utf8");
    assert.match(picker, /Bags stay live until/);
    assert.match(picker, /OldWalletsPanel/);
    const v1Ui = readFileSync(path.join(process.cwd(), "src/components/admin/sections/DataLauncherV1.tsx"), "utf8");
    assert.match(v1Ui, /WINDOW HOURS/);
    assert.equal(v1.includes("dumpAndAdvance"), false);
    assert.equal(v1.includes("dumpHot"), false);
    assert.match(v1, /DUMP_MIN_SOL/);
    const tokenMeta = readFileSync(path.join(process.cwd(), "src/app/api/tools/token-meta/[id]/route.ts"), "utf8");
    assert.match(tokenMeta, /SNIPER_CREATED_ON/);
    const community = readFileSync(path.join(process.cwd(), "src/app/c/[handle]/page.tsx"), "utf8");
    assert.match(community, /on Solphia/);
    assert.match(community, /SNIPER_X/);
    assert.match(community, /SNIPER_TELEGRAM/);
    const route = readFileSync(path.join(process.cwd(), "src/app/api/admin/tools/launcher-v2/route.ts"), "utf8");
    assert.match(route, /reclaimOldWallets/);
  });
});
