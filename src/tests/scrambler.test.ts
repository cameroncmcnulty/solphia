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
});
