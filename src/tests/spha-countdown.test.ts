import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "path";
import {
  SPHA_COUNTDOWN_MIN_MS,
  SPHA_MINT_LEAD_MS,
  emptySphaCountdown,
  mergeSphaCountdown,
  pad2,
  parseSphaCountdown,
  publicSphaCountdown,
  sphaInMintWindow,
  sphaMintAt,
  sphaTimedOut,
  splitRemaining,
} from "../lib/token/countdown";
import { applyOpsConfig, emptyState } from "../lib/store";
import { sphaLaunchMints } from "../lib/token/omics";
import { sphaDeskStats } from "../lib/token/sphaDesk";

describe("spha countdown", () => {
  it("stays Coming soon until a launch time is armed", () => {
    const c = emptySphaCountdown();
    const pub = publicSphaCountdown(c, "", 1_000);
    assert.equal(pub.phase, "soon");
    assert.equal(pub.launchAt, 0);
    assert.equal(pub.remainingMs, 0);
    assert.equal(sphaInMintWindow(c, 1_000), false);
    assert.equal(sphaTimedOut(c, 1_000), false);
  });

  it("opens the mint window 10 minutes before T-0 and hides the CA from the public pack", () => {
    const now = 50_000_000;
    const launchAt = now + 12 * 60_000;
    const c = {
      ...emptySphaCountdown(),
      launchAt,
      armedAt: now,
      status: "armed" as const,
      pendingMint: "Pend11111111111111111111111111111111111111",
      at: now,
    };
    assert.equal(sphaMintAt(c), launchAt - SPHA_MINT_LEAD_MS);
    assert.equal(sphaInMintWindow(c, launchAt - SPHA_MINT_LEAD_MS), true);
    assert.equal(sphaTimedOut(c, launchAt - 1), false);
    const pub = publicSphaCountdown(c, "", launchAt - 1_000);
    assert.equal(pub.phase, "counting");
    assert.equal(pub.remainingMs, 1_000);
    assert.equal("pendingMint" in pub, false);
    assert.equal(JSON.stringify(pub).includes("Pend111"), false);
  });

  it("reveals live phase only after the public mint is set", () => {
    const now = 90_000_000;
    const c = {
      ...emptySphaCountdown(),
      launchAt: now - 10,
      status: "minted" as const,
      pendingMint: "Pend11111111111111111111111111111111111111",
      at: now,
    };
    assert.equal(publicSphaCountdown(c, "", now).phase, "counting");
    assert.equal(publicSphaCountdown(c, "Live11111111111111111111111111111111111111", now).phase, "live");
  });

  it("merges by stamp and never drops a pending CA", () => {
    const local = {
      ...emptySphaCountdown(),
      launchAt: 9,
      status: "minted" as const,
      pendingMint: "Pend11111111111111111111111111111111111111",
      at: 5,
    };
    const remote = { ...emptySphaCountdown(), launchAt: 0, status: "soon" as const, at: 3 };
    const merged = mergeSphaCountdown(local, remote);
    assert.equal(merged.pendingMint, "Pend11111111111111111111111111111111111111");
    assert.equal(merged.status, "minted");
  });

  it("overlays a newer armed countdown through ops without wiping a pending mint of equal stamp", () => {
    const local = emptyState();
    local.sphaCountdown = {
      ...emptySphaCountdown(),
      launchAt: 20,
      status: "minted",
      pendingMint: "Pend11111111111111111111111111111111111111",
      at: 8,
    };
    applyOpsConfig(local, {
      opsUpdatedAt: 9,
      sphaCountdown: { ...emptySphaCountdown(), launchAt: 0, status: "soon", at: 4 },
    });
    assert.equal(local.sphaCountdown?.pendingMint, "Pend11111111111111111111111111111111111111");
    applyOpsConfig(local, {
      opsUpdatedAt: 12,
      sphaCountdown: {
        ...emptySphaCountdown(),
        launchAt: 40,
        status: "armed",
        at: 12,
      },
    });
    assert.equal(local.sphaCountdown?.launchAt, 40);
    assert.equal(local.sphaCountdown?.pendingMint, "Pend11111111111111111111111111111111111111");
  });

  it("counts pending mint in dashboard mint lists and fills live desk stats after reveal", () => {
    const mints = sphaLaunchMints({
      sphaCountdown: { pendingMint: "Pend11111111111111111111111111111111111111" },
    });
    assert.deepEqual(mints, ["Pend11111111111111111111111111111111111111"]);
    const desk = sphaDeskStats("Live11111111111111111111111111111111111111", {
      priceUsd: 0.01,
      mcapUsd: 2_000_000,
      liqUsd: 4_000,
      curveSol: 12,
      supply: 200_000_000,
      circulating: 200_000_000,
      burned: 0,
    });
    assert.equal(desk.stats.find((s) => s.k === "Price")?.v, "$0.0100");
    assert.equal(desk.stats.find((s) => s.k === "Market cap")?.v, "$2.00M");
    assert.equal(desk.stats.find((s) => s.k === "Public market")?.v, "Bonding curve");
    assert.equal(desk.stats.find((s) => s.k === "Mint")?.v, "Revoked");
  });

  it("pads clock digits and keeps a 10 minute mint lead", () => {
    assert.equal(SPHA_MINT_LEAD_MS, 10 * 60_000);
    assert.ok(SPHA_COUNTDOWN_MIN_MS > SPHA_MINT_LEAD_MS);
    assert.equal(pad2(3), "03");
    assert.deepEqual(splitRemaining(90_000), { d: 0, h: 0, m: 1, s: 30 });
    const parsed = parseSphaCountdown({ sphaCountdown: { launchAt: 5, status: "armed", at: 2 } });
    assert.equal(parsed?.launchAt, 5);
  });

  it("wires the public countdown, launcher clock, cron tick, and pending record", () => {
    const tokenPage = readFileSync(path.join(process.cwd(), "src/app/token/page.tsx"), "utf8");
    assert.match(tokenPage, /SphaCountdown/);
    assert.match(tokenPage, /Coming soon|phase/);
    const cd = readFileSync(path.join(process.cwd(), "src/components/SphaCountdown.tsx"), "utf8");
    assert.match(cd, /COMING SOON/);
    assert.match(cd, /TealConfetti/);
    assert.match(cd, /CopyCa/);
    const launch = readFileSync(path.join(process.cwd(), "src/components/admin/SphaLaunch.tsx"), "utf8");
    assert.match(launch, /Arm official countdown/);
    assert.match(launch, /tickCountdown/);
    assert.match(launch, /pending: Boolean/);
    const route = readFileSync(path.join(process.cwd(), "src/app/api/admin/spha/route.ts"), "utf8");
    assert.match(route, /action: z.literal\("schedule"\)/);
    assert.match(route, /confirmOfficial: z.literal\(true\)/);
    assert.match(route, /pending = Boolean\(b.pending && official\)/);
    assert.match(route, /s.sphaMint = b.mint/);
    const cron = readFileSync(path.join(process.cwd(), "src/app/api/cron/tick/route.ts"), "utf8");
    assert.match(cron, /tickSphaCountdown/);
    const pub = readFileSync(path.join(process.cwd(), "src/app/api/spha/route.ts"), "utf8");
    assert.match(pub, /publicSphaCountdown/);
    assert.equal(pub.includes("pendingMint"), false);
    const persist = readFileSync(path.join(process.cwd(), "src/lib/persist.ts"), "utf8");
    assert.match(persist, /sphaCountdown: "solphia:spha-countdown"/);
    assert.match(persist, /kvSetNxEx/);
  });
});
