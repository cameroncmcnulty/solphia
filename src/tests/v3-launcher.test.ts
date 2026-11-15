import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildV3Brand, buildV3Tokenomics, V3_SUPPLIES } from "../lib/tools/v3/idea";
import { buildV3SiteKit, V3_LAYOUTS } from "../lib/tools/v3/site";
import { isReservedV3Host, v3HandleOf, v3HostFromHeader, v3WebsiteOf } from "../lib/tools/v3/host";
import { SNIPER_CREATED_ON } from "../lib/tools/identities";
import { SPHA_MINT_LEAD_MS } from "../lib/token/countdown";

function read(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("data launcher V3 SPHA replica", () => {
  it("builds a brand whose tokenomics slices sum to supply and 10000 bps", () => {
    const omics = buildV3Tokenomics("dog in a hat");
    assert.equal(V3_SUPPLIES.includes(omics.supply as (typeof V3_SUPPLIES)[number]), true);
    const bps = omics.slices.reduce((n, s) => n + s.bps, 0);
    const tokens = omics.slices.reduce((n, s) => n + s.tokens, 0);
    assert.equal(bps, 10_000);
    assert.equal(tokens, omics.supply);
    assert.equal(omics.curveTokens + omics.teamTokens, omics.supply);
    assert.ok(omics.slices.some((s) => s.id === "lp"));
    assert.ok(omics.slices.some((s) => s.id === "dev"));
  });

  it("turns an idea into a ticker.solphia.io website and matching name", () => {
    const brand = buildV3Brand("a dogwifhat called $WIF that barks at snipers");
    assert.equal(brand.symbol, "WIF");
    assert.equal(brand.website, "https://wif.solphia.io");
    assert.equal(brand.handle, "wif");
    assert.match(brand.blurb, /WIF/);
    assert.ok(brand.about.length > 20);
    assert.equal(brand.roadmap.length, 3);
    const kit = buildV3SiteKit(brand);
    assert.equal(V3_LAYOUTS.includes(kit.layout), true);
    assert.ok(kit.faq.length >= 3);
    assert.ok(kit.features.length >= 3);
    assert.ok(kit.buySteps.length >= 3);
    assert.ok(kit.artPrompt.length > 40);
    assert.ok(kit.heroPrompt.length > 40);
    const blob = JSON.stringify(kit).toLowerCase();
    assert.equal(blob.includes("phantom"), false);
    assert.equal(blob.includes("solphia"), false);
  });

  it("reserves protocol hosts so www.solphia.io is not a meme site", () => {
    assert.equal(isReservedV3Host("www"), true);
    assert.equal(isReservedV3Host("admin"), true);
    assert.equal(v3HostFromHeader("pepe.solphia.io"), "pepe");
    assert.equal(v3HostFromHeader("www.solphia.io"), "www");
    assert.equal(v3HandleOf("PEPE"), "pepe");
    assert.equal(v3WebsiteOf("PEPE"), "https://pepe.solphia.io");
  });

  it("keeps isolated persist keys and never wipes secrets", () => {
    const persist = read("src/lib/persist.ts");
    assert.match(persist, /batchLaunchV3:/);
    assert.match(persist, /batchLaunchV3Keys/);
    assert.match(persist, /batchLaunchV3Lock/);
    assert.match(persist, /batchLaunchV3Archive/);
    assert.match(persist, /batchLaunchV3MintInflight/);
    const project = read("src/lib/tools/v3/project.ts");
    assert.match(project, /Existing secrets are never overwritten or wiped/);
    assert.match(project, /if \(!pk \|\| !secret \|\| merged\[pk\]\) continue/);
    assert.equal(project.includes("saveKeys({})"), false);
    assert.equal(project.includes("treasuryAddress"), false);
    assert.equal(project.includes("ownerAddress"), false);
  });

  it("replicas the official $SPHA T-30 mint path on an isolated wallet", () => {
    const launch = read("src/lib/tools/v3/launch.ts");
    const project = read("src/lib/tools/v3/project.ts");
    assert.match(launch, /buildV3SphaDbcLaunchTx/);
    assert.match(project, /V3_FIRST_BUY_SOL = 0\.05/);
    assert.match(project, /V3_MIN_LAUNCH_SOL = 0\.2/);
    assert.match(launch, /maybeFirstBuy/);
    assert.match(launch, /buildDbcPoolMetadataTx/);
    assert.match(launch, /buildTeamMintTx/);
    const mintFn = launch.slice(launch.indexOf("export async function mintPending"), launch.indexOf("async function finalizePending"));
    assert.ok(mintFn.indexOf("buildDbcPoolMetadataTx") < mintFn.indexOf("maybeFirstBuy"));
    assert.match(launch, /feeClaimer: payer/);
    assert.match(launch, /leftoverReceiver: payer/);
    assert.equal(launch.includes("treasuryAddress"), false);
    assert.equal(launch.includes("createCoin"), false);
    assert.equal(launch.includes("withLaunch"), false);
    assert.equal(launch.includes("sphaMint"), false);
    assert.equal(launch.includes("loadProjectServerKeypair"), false);
    assert.match(launch, /Never sends to protocol treasury/);
    const dbc = read("src/lib/launch/dbc.ts");
    assert.match(dbc, /buildV3SphaDbcLaunchTx/);
    assert.match(dbc, /createConfigAndPoolWithTransferHook/);
    assert.match(dbc, /SPHA_TRANSFER_HOOK/);
    assert.match(dbc, /creatorTradingFeePercentage: 50/);
    assert.match(dbc, /initialMarketCap: 40/);
    assert.match(dbc, /migrationMarketCap: 585/);
    assert.equal(dbc.includes("book.dbcConfig"), false);
  });

  it("seals the public CA until T-0 and uses createdOn meteora.ag", () => {
    const project = read("src/lib/tools/v3/project.ts");
    assert.match(project, /SNIPER_CREATED_ON/);
    assert.match(project, /mint: live && p\.mint \? p\.mint : ""/);
    assert.equal(SPHA_MINT_LEAD_MS, 30 * 60_000);
    assert.equal(SNIPER_CREATED_ON, "https://www.meteora.ag");
    const site = read("src/components/MemeCoinSite.tsx");
    assert.match(site, /CA publishes on this page at T-0/);
    assert.match(site, /TOKENOMICS|Tokenomics/);
    assert.match(site, /How to buy/);
    assert.equal(site.toLowerCase().includes("phantom"), false);
    assert.equal(site.toLowerCase().includes("solphia"), false);
    const meta = read("src/app/api/m/[ticker]/meta/route.ts");
    assert.match(meta, /SNIPER_CREATED_ON/);
    assert.match(meta, /createdOn/);
  });

  it("builds unique high-tech layouts with Imagine art instead of a Solphia clone", () => {
    const site = read("src/components/MemeCoinSite.tsx");
    const css = read("src/components/meme-site.css");
    const dna = read("src/lib/tools/v3/site.ts");
    const imagine = read("src/lib/tools/v3/imagine.ts");
    const project = read("src/lib/tools/v3/project.ts");
    for (const layout of ["cinema", "terminal", "studio", "neon", "glass", "brutal", "orbital", "pulse"]) {
      assert.match(site, new RegExp(layout));
      assert.match(css, new RegExp(`mc-${layout}`));
      assert.match(dna, new RegExp(layout));
    }
    assert.match(site, /mc-cta/);
    assert.match(site, /mc-faq/);
    assert.match(site, /mc-marquee/);
    assert.match(site, /pointermove/);
    assert.match(css, /mc-cursor/);
    assert.equal(site.includes("font-display"), false);
    assert.equal(site.includes("text-acid"), false);
    assert.equal(site.includes("pump-card"), false);
    assert.match(imagine, /grok-imagine-image-2\.0/);
    assert.match(imagine, /response_format: "b64_json"/);
    assert.match(imagine, /quality: "medium"/);
    assert.match(project, /generateV3Art/);
    assert.match(project, /buildV3SiteKit/);
    assert.match(project, /enrichSiteKit/);
    assert.match(dna, /Never mention Solphia, Phantom/);
  });

  it("manages many sites: list, open dashboard, delete without wiping keys, tick every armed site", () => {
    const project = read("src/lib/tools/v3/project.ts");
    const launch = read("src/lib/tools/v3/launch.ts");
    const route = read("src/app/api/admin/tools/launcher-v3/route.ts");
    const ui = read("src/components/admin/sections/DataLauncherV3.tsx");
    assert.match(project, /export type V3Book/);
    assert.match(project, /export async function listSites/);
    assert.match(project, /export async function openSite/);
    assert.match(project, /export async function deleteSite/);
    assert.match(project, /p\.status = "deleted"/);
    assert.match(project, /function livingId/);
    assert.match(project, /if \(!p \|\| p.status === "deleted"\) return emptyProject/);
    assert.match(project, /rows.filter\(\(r\) => r.id !== id\)/);
    assert.equal(project.includes("saveKeys({})"), false);
    assert.match(project, /findProjectByHandle/);
    assert.match(project, /status !== "deleted"/);
    assert.match(launch, /listTickableSites/);
    assert.match(launch, /withActiveId/);
    assert.match(route, /"open", "delete"/);
    assert.match(route, /openSite/);
    assert.match(route, /deleteSite/);
    assert.match(ui, /OPEN DASHBOARD/);
    assert.match(ui, /DELETE/);
    assert.match(ui, /action: "open"|act\("open"/);
    assert.match(ui, /act\("delete"/);
    assert.match(ui, /status !== "deleted"/);
    assert.match(ui, /Launch wallet keys stay saved|keys stay saved/i);
  });

  it("wires Tools V3, cron, host rewrite, and the dashboard STOP/SEND", () => {
    const picker = read("src/components/admin/sections/Tools.tsx");
    assert.match(picker, /DATA LAUNCHER V3/);
    assert.match(picker, /DataLauncherV3/);
    assert.match(picker, /ticker.solphia.io/);
    const ui = read("src/components/admin/sections/DataLauncherV3.tsx");
    assert.match(ui, /CEX DEPOSIT ADDRESS/);
    assert.match(ui, /BUILD SITE \+ WALLET/);
    assert.match(ui, /Arm countdown/);
    assert.match(ui, /STOP/);
    assert.match(ui, /SEND SOL/);
    assert.match(ui, /T-30/);
    assert.match(ui, /<SwapWidget/);
    assert.match(ui, /owner=\{p\.launchWallet\}/);
    assert.match(ui, /action: "sign"/);
    assert.match(ui, /walletTab/);
    const route = read("src/app/api/admin/tools/launcher-v3/route.ts");
    assert.match(route, /draftProject/);
    assert.match(route, /armCountdown/);
    assert.match(route, /stopLaunch/);
    assert.match(route, /sendLaunchSol/);
    assert.match(route, /signLaunchTx/);
    assert.match(route, /tickV3/);
    const launch = read("src/lib/tools/v3/launch.ts");
    assert.match(launch, /export async function signLaunchTx/);
    assert.match(launch, /Transaction is not from the launch wallet/);
    const project = read("src/lib/tools/v3/project.ts");
    assert.match(project, /export async function isV3LaunchWallet/);
    const build = read("src/app/api/swap/build/route.ts");
    assert.match(build, /isV3LaunchWallet/);
    const quote = read("src/app/api/swap/quote/route.ts");
    assert.match(quote, /isV3LaunchWallet/);
    const cron = read("src/app/api/cron/tick/route.ts");
    assert.match(cron, /tickV3/);
    assert.match(cron, /batchLaunchV3/);
    const mw = read("src/middleware.ts");
    assert.match(mw, /v3HostFromHeader/);
    assert.match(mw, /\/m\/\$\{sub\}/);
    const shell = read("src/components/Shell.tsx");
    assert.match(shell, /isMeme/);
    const page = read("src/app/m/[ticker]/page.tsx");
    assert.match(page, /MemeCoinSite/);
  });
});
