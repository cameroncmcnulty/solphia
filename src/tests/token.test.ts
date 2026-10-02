import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SOLPHIA_TOKEN, sphaMintOf, solphiaTokenDesk } from "../lib/token/solphia";

describe("solphia token desk", () => {
  it("is $SPHA with CA pending until mint is set", () => {
    const d = solphiaTokenDesk();
    assert.equal(d.symbol, "SPHA");
    assert.equal(SOLPHIA_TOKEN.mint, "");
    assert.equal(d.caReady, false);
    const burned = d.stats.find((s) => s.k === "Burned");
    assert.ok(burned);
    assert.equal(burned?.v, "—");
    assert.ok(d.stats.length >= 8);
  });

  it("ships Q4 as swap market and Shill Zone, Q1 as autonomous bot plus engagement rewards", () => {
    const src = readFileSync(join(process.cwd(), "src/components/SphaRoadmap.tsx"), "utf8");
    assert.match(src, /swap market, Shill Zone, and token launcher/);
    assert.equal(src.includes("trading bot and token launcher"), false);
    assert.match(src, /Launch of autonomous trading bot/);
    assert.match(src, /Increased engagement rewards/);
  });

  it("lets admin-stored mint override the empty code default", () => {
    const mint = "So11111111111111111111111111111111111111112";
    assert.equal(sphaMintOf(""), "");
    assert.equal(sphaMintOf(mint), mint);
    assert.equal(solphiaTokenDesk(mint).caReady, true);
    assert.equal(solphiaTokenDesk(mint).mint, mint);
  });
});
