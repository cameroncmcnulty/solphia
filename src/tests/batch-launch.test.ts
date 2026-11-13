import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { sniperStats } from "../lib/tools/snipers";
import { pngMagic, renderTokenPng } from "../lib/tools/tokenArt";
import {
  BATCH_LAUNCH_FUND_LAMPORTS,
  BATCH_SUPPLY,
  buildIdentities,
  curveTokensFor,
  DEFAULT_NARRATIVE,
  DEFAULT_RANDOM,
  randomIdentity,
  scheduleTimes,
  teamBpsAt,
  teamTokensFor,
  tickerOk,
} from "../lib/tools/identities";

describe("tools data launcher", () => {
  it("defaults to 100 narrative plus 150 random over 3 hours", () => {
    assert.equal(DEFAULT_NARRATIVE, 100);
    assert.equal(DEFAULT_RANDOM, 150);
    assert.equal(DEFAULT_NARRATIVE + DEFAULT_RANDOM, 250);
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
    }
    assert.ok(rows.some((r) => r.kind === "narrative"));
    assert.ok(rows.some((r) => r.kind === "random"));
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
    assert.equal(stats.snipers, 2);
    assert.equal(stats.curveSol, 1.2);
  });

  it("funds each launch wallet with a fixed exact amount and never writes the shared pad curve", () => {
    assert.equal(BATCH_LAUNCH_FUND_LAMPORTS, 110_000_000);
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /buildHookedDbcLaunchTx/);
    assert.match(dbc, /hookedCurveConfig/);
    assert.match(dbc, /createConfigAndPoolWithTransferHook/);
    assert.equal(dbc.includes("book.dbcConfig"), false);
    const engine = readFileSync(path.join(process.cwd(), "src/lib/tools/batchLaunch.ts"), "utf8");
    assert.match(engine, /harvestKeypair/);
    assert.match(engine, /buildHookedDbcLaunchTx/);
    assert.match(engine, /buildProjectSliceMintTx/);
    assert.match(engine, /Keypair.generate/);
    assert.equal(engine.includes("buildSphaDbcLaunchTx"), false);
    assert.equal(engine.includes("sphaMint"), false);
    const cron = readFileSync(path.join(process.cwd(), "src/app/api/cron/tick/route.ts"), "utf8");
    assert.match(cron, /tickBatchLaunch/);
    const nav = readFileSync(path.join(process.cwd(), "src/lib/admin/nav.ts"), "utf8");
    assert.match(nav, /id: "tools"/);
    const sections = readFileSync(path.join(process.cwd(), "src/components/admin/sections/index.tsx"), "utf8");
    assert.match(sections, /ToolsSection/);
  });
});
