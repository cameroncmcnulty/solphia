import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("public desk yard", () => {
  it("hides the pad launcher behind an in-construction trading bot page", () => {
    const page = readFileSync(path.join(process.cwd(), "src/app/launch/page.tsx"), "utf8");
    const yard = readFileSync(path.join(process.cwd(), "src/components/DeskYard.tsx"), "utf8");
    const nav = readFileSync(path.join(process.cwd(), "src/components/Nav.tsx"), "utf8");
    const tabs = readFileSync(path.join(process.cwd(), "src/components/BottomNav.tsx"), "utf8");
    const home = readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf8");
    assert.match(page, /DeskYard/);
    assert.equal(page.includes("CopyCa"), false);
    assert.equal(page.includes("PadPitch"), false);
    assert.match(yard, /IN CONSTRUCTION/);
    assert.match(yard, /AUTONOMOUS TRADING BOT/);
    assert.match(yard, /PAD OFFLINE/);
    assert.match(yard, /NO PUBLIC CA/);
    assert.equal(yard.toLowerCase().includes("phantom"), false);
    assert.match(nav, /\["\/launch", "Bot"\]/);
    assert.equal(nav.includes('"/launch", "Launch"'), false);
    assert.match(tabs, /label: "Bot"/);
    assert.equal(tabs.includes('label: "Launch"'), false);
    assert.match(home, />\s*Bot\s*</);
    assert.equal(home.includes("Launch pad and Shill Zone are open now"), false);
    const swap = readFileSync(path.join(process.cwd(), "src/app/swap/page.tsx"), "utf8");
    assert.match(swap, /LaunchPad/);
    assert.equal(swap.includes("DeskYard"), false);
    assert.equal(swap.includes("../launch/page"), false);
  });
});
