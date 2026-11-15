import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { sniperStats } from "../lib/tools/snipers";
import { pngMagic, renderTokenPng } from "../lib/tools/tokenArt";
import {
  BATCH_LAUNCH_FUND_LAMPORTS,
  BATCH_RELAY_LAMPORTS,
  BATCH_SUPPLY,
  buildIdentities,
  curveTokensFor,
  DEFAULT_NARRATIVE,
  DEFAULT_NARRATIVE_PCT,
  DEFAULT_RANDOM,
  DEFAULT_TOTAL,
  DEFAULT_WINDOW_MINUTES,
  DEFAULT_WINDOW_MS,
  DUMP_DELAY_MS,
  DUMP_MIN_SOL,
  DUMP_SLIPPAGE_BPS,
  dumpHot,
  isInsufficientFunds,
  randomIdentity,
  scheduleTimes,
  splitMix,
  teamBpsAt,
  teamTokensFor,
  tickerOk,
  windowMsFromBody,
  windowMsFromMinutes,
} from "../lib/tools/identities";

describe("tools data launcher", () => {
  it("defaults to 100 narrative plus 150 random over 3 hours", () => {
    assert.equal(DEFAULT_NARRATIVE, 100);
    assert.equal(DEFAULT_RANDOM, 150);
    assert.equal(DEFAULT_TOTAL, 250);
    assert.equal(DEFAULT_NARRATIVE_PCT, 40);
    assert.equal(DEFAULT_WINDOW_MINUTES, 180);
    assert.equal(DEFAULT_WINDOW_MS, 180 * 60_000);
    assert.equal(DUMP_DELAY_MS, 30_000);
    assert.equal(DUMP_MIN_SOL, 1);
    assert.equal(DUMP_SLIPPAGE_BPS, 9_900);
    assert.equal(dumpHot({ bagQuoteSol: 0.4, sniperBuySol: 0.2 }), false);
    assert.equal(dumpHot({ sniperBuySol: 1 }), true);
    assert.equal(dumpHot({ sniperVolumeSol: 1.2 }), true);
    assert.equal(dumpHot({ bagQuoteSol: 1 }), true);
    assert.equal(windowMsFromMinutes(10), 10 * 60_000);
    assert.equal(windowMsFromMinutes(1), 60_000);
    assert.equal(windowMsFromMinutes(1440), 1440 * 60_000);
    assert.equal(windowMsFromBody({ windowMinutes: 10 }), 600_000);
    assert.equal(windowMsFromBody({ windowHours: 3 }), DEFAULT_WINDOW_MS);
    assert.deepEqual(splitMix(250, 40), { narrative: 100, random: 150 });
    assert.deepEqual(splitMix(10, 100), { narrative: 10, random: 0 });
    assert.deepEqual(splitMix(10, 0), { narrative: 0, random: 10 });
    assert.equal(splitMix(7, 50).narrative + splitMix(7, 50).random, 7);
  });

  it("builds unique tickers and matching names for mixed identities", () => {
    const rows = buildIdentities({ narrative: 8, random: 12 });
    assert.equal(rows.length, 20);
    const ticks = new Set(rows.map((r) => r.symbol));
    assert.equal(ticks.size, 20);
    for (const row of rows) {
      assert.equal(tickerOk(row.symbol), true);
      assert.ok(row.name.length >= 2 && row.name.length <= 24);
      assert.ok(row.x.startsWith("https://x.com/"));
      assert.ok(row.telegram.startsWith("https://t.me/"));
      assert.ok(row.website.startsWith("https://solphia.io/c/"));
      assert.ok(row.teamBps >= 300 && row.teamBps <= 2000);
      assert.equal(curveTokensFor(row.teamBps) + teamTokensFor(row.teamBps), BATCH_SUPPLY);
      assert.ok(row.blurb.includes("on Solphia"));
    }
    assert.ok(rows.some((r) => r.kind === "narrative"));
    assert.ok(rows.some((r) => r.kind === "random"));
    const used = new Set(rows.map((r) => r.symbol));
    const next = buildIdentities({ narrative: 8, random: 12, used });
    assert.equal(next.length, 20);
    assert.equal(next.some((r) => used.has(r.symbol)), false);
    const hits = [
      { symbol: "PEPE", name: "Pepe", theme: "pepe" },
      { symbol: "WOJAK", name: "Wojak", theme: "meme" },
    ];
    const first = buildIdentities({ narrative: 8, random: 4, hits });
    const wojak = first.find((r) => r.name === "Wojak");
    const pepe = first.find((r) => r.name === "Pepe");
    assert.ok(wojak);
    assert.ok(pepe);
    assert.match(wojak!.symbol, /^WOJAK[MLBD]/);
    assert.match(pepe!.symbol, /^PEPE[PFRE]/);
    assert.equal(first.some((r) => r.symbol === "WOJAK"), false);
    assert.equal(first.some((r) => r.symbol === "PEPE"), false);
    assert.ok(wojak!.blurb.includes("on Solphia"));
    assert.ok(pepe!.blurb.includes("on Solphia"));
    const second = buildIdentities({ narrative: 8, random: 4, hits, used: first.map((r) => r.symbol) });
    const all = [...first, ...second].map((r) => r.symbol);
    assert.equal(new Set(all).size, all.length);
    assert.equal(second.some((r) => first.some((r0) => r0.symbol === r.symbol)), false);
  });

  it("makes random word names like Cat and The World", () => {
    const used = new Set<string>();
    const names: string[] = [];
    for (let i = 0; i < 40; i++) names.push(randomIdentity(used).name);
    assert.ok(names.some((n) => /^[A-Z][a-z]+$/.test(n) || /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n)));
  });

  it("spreads launches across the window with gaps", () => {
    const now = 1_700_000_000_000;
    const window = 3 * 60 * 60 * 1000;
    const times = scheduleTimes(250, window, now, 8_000);
    assert.equal(times.length, 250);
    assert.equal(times[0], now);
    assert.ok(times[times.length - 1]! <= now + window + 8_000);
    for (let i = 1; i < times.length; i++) assert.ok(times[i]! >= times[i - 1]!);
    const span = times[times.length - 1]! - times[0]!;
    assert.ok(span > 60_000);
    const short = scheduleTimes(8, windowMsFromMinutes(10), now, 8_000);
    assert.equal(short.length, 8);
    assert.ok(short[short.length - 1]! <= now + 10 * 60_000 + 8_000);
  });

  it("keeps project mint between 3 and 20 percent", () => {
    for (let i = 0; i < 20; i++) {
      const bps = teamBpsAt(i / 19);
      assert.ok(bps >= 300 && bps <= 2000);
      const team = teamTokensFor(bps);
      const curve = curveTokensFor(bps);
      assert.equal(team + curve, BATCH_SUPPLY);
      assert.ok(team >= BATCH_SUPPLY * 0.03 - 1);
      assert.ok(team <= BATCH_SUPPLY * 0.2 + 1);
    }
  });

  it("renders a unique PNG per token", () => {
    const a = renderTokenPng("npepe_PEPEZ_aaa111", "PEPEZ", "pepe");
    const b = renderTokenPng("rcat_CAT_bbb222", "CAT", "cat");
    assert.equal(pngMagic(a), true);
    assert.equal(pngMagic(b), true);
    assert.notEqual(a.equals(b), true);
  });

  it("counts sniper buys and sells off the creator", () => {
    const stats = sniperStats({
      creator: "CREATOR",
      fills: [
        { id: "1", at: 1, owner: "CREATOR", side: "buy", sol: 0.05, tokens: 1, feeSol: 0, priceSol: 1 },
        { id: "2", at: 2, owner: "SNIPE", side: "buy", sol: 0.2, tokens: 2, feeSol: 0, priceSol: 1 },
        { id: "3", at: 3, owner: "SNIPE", side: "sell", sol: 0.1, tokens: 1, feeSol: 0, priceSol: 1 },
        { id: "4", at: 4, owner: "BOT", side: "buy", sol: 0.4, tokens: 3, feeSol: 0, priceSol: 1 },
      ],
    }, 1.2);
    assert.equal(stats.buys, 2);
    assert.equal(stats.sells, 1);
    assert.equal(stats.volumeSol, 0.7);
    assert.equal(stats.buySol, 0.6);
    assert.equal(stats.snipers, 2);
    assert.equal(stats.curveSol, 1.2);
  });

  it("funds each launch wallet with a fixed exact amount and never writes the shared pad curve", () => {
    assert.equal(BATCH_LAUNCH_FUND_LAMPORTS, 110_000_000);
    assert.equal(BATCH_RELAY_LAMPORTS, 500_000_000);
    assert.notEqual(BATCH_LAUNCH_FUND_LAMPORTS, BATCH_RELAY_LAMPORTS);
    assert.equal(isInsufficientFunds("insufficient funds for rent"), true);
    assert.equal(isInsufficientFunds("custom program error: 0x1"), true);
    assert.equal(isInsufficientFunds("Launch landed"), false);
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /buildHookedDbcLaunchTx/);
    assert.match(dbc, /hookedCurveConfig/);
    assert.match(dbc, /createConfigAndPoolWithTransferHook/);
    assert.equal(dbc.includes("book.dbcConfig"), false);
    const engine = readFileSync(path.join(process.cwd(), "src/lib/tools/batchLaunch.ts"), "utf8");
    assert.match(engine, /loadTreasuryKeypair/);
    assert.match(engine, /buildHookedDbcLaunchTx/);
    assert.match(engine, /buildProjectSliceMintTx/);
    assert.match(engine, /Keypair.generate/);
    assert.equal(engine.includes("dumpAndAdvance"), false);
    assert.equal(engine.includes("dumpHot"), false);
    assert.equal(engine.includes("DUMP_DELAY_MS"), false);
    assert.equal(engine.includes("BATCH_FIRST_BUY_SOL"), false);
    assert.equal(engine.includes('side: "buy"'), false);
    assert.match(engine, /drainCampaignWalletsToTreasury/);
    assert.match(engine, /listOldWallets/);
    assert.match(engine, /reclaimOldWalletsToTreasury/);
    assert.match(engine, /createBurnInstruction/);
    assert.match(engine, /INCINERATOR_URL/);
    assert.match(engine, /const merged: KeyPack = \{ \.\.\.prev, \.\.\.pack \}/);
    const resetFn = engine.slice(engine.indexOf("export async function resetCampaign"));
    assert.equal(resetFn.slice(0, 600).includes("saveKeys({})"), false);
    const launchFn = engine.slice(engine.indexOf("async function launchOne"), engine.indexOf("function nextQueued"));
    assert.match(launchFn, /c.fundLamports/);
    assert.match(launchFn, /buildProjectSliceMintTx/);
    assert.match(launchFn, /buildDbcPoolMetadataTx/);
    assert.equal(launchFn.includes("dumpAt"), false);
    assert.equal(engine.includes("buildSphaDbcLaunchTx"), false);
    assert.equal(engine.includes("sphaMint"), false);
    const ids = readFileSync(path.join(process.cwd(), "src/lib/tools/identities.ts"), "utf8");
    assert.match(ids, /base.length <= 6 \? `\$\{base\}\$\{twist\[0\]/);
    assert.match(ids, /rides the \$\{theme\} meta on Solphia/);
    const toolsUi = readFileSync(path.join(process.cwd(), "src/components/admin/sections/DataLauncherV1.tsx"), "utf8");
    assert.match(toolsUi, /WINDOW HOURS/);
    assert.match(toolsUi, /NARRATIVE/);
    assert.match(toolsUi, /RANDOM WORDS/);
    assert.match(toolsUi, /windowHours: hours/);
    assert.match(toolsUi, /3–20%/);
    assert.match(toolsUi, /EXTRACT TO TREASURY/);
    assert.match(toolsUi, /extractLaunched/);
    assert.equal(toolsUi.includes("WINDOW MINUTES"), false);
    assert.equal(toolsUi.includes("tools-mix"), false);
    assert.equal(toolsUi.includes("0.500 SOL"), false);
    assert.equal(toolsUi.includes("sniper buys hit 1 SOL"), false);
    assert.equal(toolsUi.includes("dump 1 SOL"), false);
    assert.equal(toolsUi.includes("LAUNCH ARCHIVE"), false);
    assert.equal(toolsUi.includes("WindDownHost"), false);
    const route = readFileSync(path.join(process.cwd(), "src/app/api/admin/tools/launcher/route.ts"), "utf8");
    assert.match(route, /windowHours/);
    assert.match(route, /extractLaunched/);
    assert.match(route, /extractLaunchedWalletsToOwner/);
    assert.match(route, /reclaimOldWallets/);
    assert.match(route, /listOldWallets/);
    const persist = readFileSync(path.join(process.cwd(), "src/lib/persist.ts"), "utf8");
    assert.match(persist, /batchLaunchV2/);
    assert.match(persist, /batchLaunchV2Keys/);
    const tokenMeta = readFileSync(path.join(process.cwd(), "src/app/api/tools/token-meta/[id]/route.ts"), "utf8");
    assert.match(tokenMeta, /SNIPER_CREATED_ON/);
    assert.match(tokenMeta, /loadCampaignV2/);
    const picker = readFileSync(path.join(process.cwd(), "src/components/admin/sections/Tools.tsx"), "utf8");
    assert.match(picker, /DATA LAUNCHER V1/);
    assert.match(picker, /DATA LAUNCHER V2/);
    assert.match(picker, /DATA LAUNCHER V3/);
    assert.match(picker, /DataLauncherV1/);
    assert.match(picker, /DataLauncherV2/);
    assert.match(picker, /DataLauncherV3/);
    const sweep = readFileSync(path.join(process.cwd(), "src/lib/tools/protocolSweep.ts"), "utf8");
    assert.match(sweep, /extractLaunchedWalletsToTreasury/);
    assert.match(sweep, /drainCampaignWalletsToTreasury/);
    const cron = readFileSync(path.join(process.cwd(), "src/app/api/cron/tick/route.ts"), "utf8");
    assert.match(cron, /tickBatchLaunch/);
    const nav = readFileSync(path.join(process.cwd(), "src/lib/admin/nav.ts"), "utf8");
    assert.match(nav, /id: "tools"/);
    const sections = readFileSync(path.join(process.cwd(), "src/components/admin/sections/index.tsx"), "utf8");
    assert.match(sections, /ToolsSection/);
  });
});
