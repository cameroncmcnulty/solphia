import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

describe("launched token manage + swap picker", () => {
  it("loads wallet holdings into the swap picker with balances", () => {
    const widget = read("src/components/SwapWidget.tsx");
    assert.match(widget, /\/api\/sol\/holdings\?pubkey=/);
    assert.match(widget, /bag\?\.launched/);
    assert.match(widget, /setHeld\(nextHeld\)/);
    assert.match(widget, /fmtTok\(bals\[row\.mint\] \|\| 0\)/);
  });

  it("keeps Token-2022 launched mints in holdings even when the program listing misses them", () => {
    const holdings = read("src/app/api/sol/holdings/route.ts");
    assert.match(holdings, /sphaLaunchMints/);
    assert.match(holdings, /tokenUiAmount\(conn, pubkey, mint\)/);
    assert.match(holdings, /launched: launched\.slice\(0, 24\)/);
    const bal = read("src/lib/solana/tokenBalance.ts");
    assert.match(bal, /mint: mintPk, programId: t22/);
    const wallet = read("src/app/wallet/page.tsx");
    assert.match(wallet, /hideDust && !h\.sol && !h\.born/);
  });

  it("refetches the 200M desk on admin Refresh and claims creator or partner fees", () => {
    const provider = read("src/components/admin/AdminProvider.tsx");
    assert.match(provider, /reloadAt: number/);
    assert.match(provider, /setReloadAt\(Date\.now\(\)\)/);
    const desk = read("src/lib/admin/desk.ts");
    assert.match(desk, /sphaTestLaunches: mergeSphaTestLaunches/);
    const project = read("src/components/admin/ProjectWallets.tsx");
    assert.match(project, /tokens=\{launchedTokens\}/);
    const spha = read("src/components/admin/SphaLaunch.tsx");
    assert.match(spha, /reloadAt/);
    assert.match(spha, /deskClaim\("creator"\)/);
    assert.match(spha, /deskClaim\("partner"\)/);
    assert.match(spha, /Claim owner/);
    assert.match(spha, /Claim treasury/);
    assert.match(spha, /<SwapWidget/);
    assert.equal(spha.includes("Sell bag"), false);
    assert.equal(spha.includes("canSignProject"), false);
    assert.equal(spha.toLowerCase().includes("phantom"), false);
    const route = read("src/app/api/admin/spha/route.ts");
    assert.match(route, /action: z\.literal\("prepareClaim"\)/);
    assert.match(route, /buildDbcClaimCreatorTx/);
    assert.match(route, /buildDbcClaimPartnerTx/);
    assert.equal(route.includes("book.dbcConfig"), false);
  });
});
