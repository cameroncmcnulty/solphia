import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

  it("lets admin-stored mint override the empty code default", () => {
    const mint = "So11111111111111111111111111111111111111112";
    assert.equal(sphaMintOf(""), "");
    assert.equal(sphaMintOf(mint), mint);
    assert.equal(solphiaTokenDesk(mint).caReady, true);
    assert.equal(solphiaTokenDesk(mint).mint, mint);
  });
});
