import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOLPHIA_TOKEN, solphiaTokenDesk } from "../lib/token/solphia";

describe("solphia token desk", () => {
  it("is $SOLPHIA* with CA pending until mint is set", () => {
    const d = solphiaTokenDesk();
    assert.equal(d.symbol, "SOLPHIA");
    assert.equal(SOLPHIA_TOKEN.mint, "");
    assert.equal(d.caReady, false);
    const burned = d.stats.find((s) => s.k === "Burned");
    assert.ok(burned);
    assert.equal(burned?.v, "—");
    assert.ok(d.stats.length >= 8);
  });
});
