import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "path";
import {
  SPHA_COUNTDOWN_MIN_MS,
  SPHA_MINT_LEAD_MS,
  SPHA_REHEARSAL_LEAD_MS,
  SPHA_REHEARSAL_MS,
  emptySphaCountdown,
  formatSphaLaunchWhen,
  mergeSphaCountdown,
  pad2,
  parseSphaCountdown,
  publicSphaCountdown,
  sphaInMintWindow,
  sphaMintAt,
  sphaTimedOut,
  splitRemaining,
  toDatetimeLocalValue,
} from "../lib/token/countdown";
import { applyOpsConfig, emptyState } from "../lib/store";
import { SPHA_BLURB, SPHA_DEFAULT_IMAGE, SPHA_TELEGRAM, SPHA_TGE_LAUNCH_AT_MS, SPHA_WEBSITE, SPHA_X, sphaLaunchMints } from "../lib/token/omics";
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

  it("opens the mint window 30 minutes before T-0 and hides the CA from the public pack", () => {
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

  it("pads clock digits and keeps a 30 minute mint lead", () => {
    assert.equal(SPHA_MINT_LEAD_MS, 30 * 60_000);
    assert.equal(SPHA_COUNTDOWN_MIN_MS, 30 * 60_000 + 30_000);
    assert.ok(SPHA_COUNTDOWN_MIN_MS > SPHA_MINT_LEAD_MS);
    assert.equal(pad2(3), "03");
    assert.deepEqual(splitRemaining(90_000), { d: 0, h: 0, m: 1, s: 30 });
    const parsed = parseSphaCountdown({ sphaCountdown: { launchAt: 5, status: "armed", at: 2 } });
    assert.equal(parsed?.launchAt, 5);
  });

  it("pins the official TGE to Thursday Nov 12 2026 4pm MST with mint at 3:30pm MST", () => {
    assert.equal(SPHA_TGE_LAUNCH_AT_MS, Date.parse("2026-11-12T16:00:00-07:00"));
    assert.equal(sphaMintAt({ ...emptySphaCountdown(), launchAt: SPHA_TGE_LAUNCH_AT_MS }), Date.parse("2026-11-12T15:30:00-07:00"));
    const label = formatSphaLaunchWhen(SPHA_TGE_LAUNCH_AT_MS);
    assert.match(label, /Nov/);
    assert.match(label, /12/);
    assert.match(label, /4:00/);
    assert.ok(toDatetimeLocalValue(SPHA_TGE_LAUNCH_AT_MS).startsWith("2026-11-1"));
    assert.equal(SPHA_BLURB, "Solphia is a utility token on Solana.");
    assert.equal(SPHA_DEFAULT_IMAGE, "https://solphia.io/spha-mark.png");
    assert.equal(SPHA_WEBSITE, "https://solphia.io");
    assert.equal(SPHA_X, "https://x.com/solphiaio");
    assert.equal(SPHA_TELEGRAM, "https://t.me/solphiaio");
  });

  it("keeps a 2 minute local rehearsal clock and never ships pendingMint on the public route", () => {
    assert.equal(SPHA_REHEARSAL_MS, 2 * 60_000);
    assert.ok(SPHA_REHEARSAL_LEAD_MS < SPHA_REHEARSAL_MS);
    const parsed = parseSphaCountdown({
      sphaCountdown: { launchAt: 9, status: "armed", rehearsal: true, pendingMint: "Pend11111111111111111111111111111111111111", at: 2 },
    });
    assert.equal(parsed?.rehearsal, true);
    const pub = readFileSync(path.join(process.cwd(), "src/app/api/spha/route.ts"), "utf8");
    assert.equal(pub.includes("pendingMint"), false);
    const persist = readFileSync(path.join(process.cwd(), "src/lib/store.ts"), "utf8");
    assert.match(persist, /if \(local\.rehearsal\) return/);
    const auto = readFileSync(path.join(process.cwd(), "src/lib/token/sphaAutoLaunch.ts"), "utf8");
    assert.match(auto, /Local rehearsal only/);
    assert.match(auto, /TESTSPHA/);
    assert.match(auto, /rehearsalMint/);
    const sphaAdmin = readFileSync(path.join(process.cwd(), "src/app/api/admin/spha/route.ts"), "utf8");
    assert.match(sphaAdmin, /TESTSPHA/);
    assert.match(auto, /st\.sphaLaunch = undefined/);
  });

  it("wires the public countdown, launcher clock, cron tick, and pending record", () => {
    const tokenPage = readFileSync(path.join(process.cwd(), "src/app/token/page.tsx"), "utf8");
    assert.match(tokenPage, /SphaCountdown/);
    assert.match(tokenPage, /Coming soon|phase/);
    const cd = readFileSync(path.join(process.cwd(), "src/components/SphaCountdown.tsx"), "utf8");
    assert.match(cd, /COMING SOON/);
    assert.match(cd, /TealConfetti/);
    assert.match(cd, /CopyCa/);
    assert.match(cd, /spha-cd-buy/);
    assert.match(cd, /\/swap\?mint=/);
    assert.match(cd, /formatSphaLaunchWhen/);
    assert.match(cd, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 100\)/);
    const launch = readFileSync(path.join(process.cwd(), "src/components/admin/SphaLaunch.tsx"), "utf8");
    assert.match(launch, /Arm official countdown/);
    assert.match(launch, /tickCountdown/);
    assert.match(launch, /pending: Boolean/);
    assert.match(launch, /confirmMainnet: true/);
    assert.match(launch, /T-30/);
    assert.match(launch, /SPHA_TGE_LAUNCH_AT_MS/);
    const route = readFileSync(path.join(process.cwd(), "src/app/api/admin/spha/route.ts"), "utf8");
    assert.match(route, /action: z.literal\("schedule"\)/);
    assert.match(route, /confirmOfficial: z.literal\(true\)/);
    assert.match(route, /confirmMainnet: z.literal\(true\)/);
    assert.match(route, /st\.sphaNetwork = "mainnet-beta"/);
    assert.match(route, /pending = Boolean\(b.pending && official\)/);
    assert.match(route, /s.sphaMint = b.mint/);
    const cron = readFileSync(path.join(process.cwd(), "src/app/api/cron/tick/route.ts"), "utf8");
    assert.match(cron, /tickSphaCountdown/);
    const pub = readFileSync(path.join(process.cwd(), "src/app/api/spha/route.ts"), "utf8");
    assert.match(pub, /publicSphaCountdown/);
    assert.equal(pub.includes("pendingMint"), false);
    assert.match(pub, /SPHA_BLURB/);
    assert.match(pub, /SPHA_WEBSITE/);
    const persist = readFileSync(path.join(process.cwd(), "src/lib/persist.ts"), "utf8");
    assert.match(persist, /sphaCountdown: "solphia:spha-countdown"/);
    assert.match(persist, /kvSetNxEx/);
    assert.match(persist, /sphaMintInflight/);
    const auto = readFileSync(path.join(process.cwd(), "src/lib/token/sphaAutoLaunch.ts"), "utf8");
    assert.match(auto, /Official mint requires the durable store/);
    assert.match(auto, /buildSphaDbcLaunchTx/);
    assert.match(auto, /network: "mainnet-beta"/);
    assert.match(auto, /sphaMintInflight/);
    assert.match(auto, /pinSphaTokenMeta/);
    const socials = readFileSync(path.join(process.cwd(), "src/components/SphaSocials.tsx"), "utf8");
    assert.match(socials, /website/);
    assert.match(socials, /SiteMark/);
    assert.match(tokenPage, /website=/);
  });
});
