import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyShill, extractCas, pinToken, postShill, pruneShill } from "../lib/shill/engine";
import { SHILL_CA_COOLDOWN_MS, SHILL_PIN_MS, SHILL_PIN_SOL, SHILL_PIN_SLOTS } from "../lib/shill/types";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const CA = "So11111111111111111111111111111111111111112";

describe("shill zone", () => {
  it("pulls a CA out of chat and cools down the next one", () => {
    assert.deepEqual(extractCas(`ape ${CA} now`), [CA]);
    const book = emptyShill();
    const a = postShill(book, { owner: A, text: `buy ${CA}`, token: { mint: CA, symbol: "SOL", name: "Solana" }, now: 1 });
    assert.equal(a.ok, true);
    const b = postShill(book, { owner: A, text: `again ${CA}`, now: 1 + SHILL_CA_COOLDOWN_MS - 1 });
    assert.equal(b.ok, false);
    if (!b.ok) assert.equal(b.error, "ca_cooldown");
    const c = postShill(book, { owner: A, text: `later ${CA}`, now: 1 + SHILL_CA_COOLDOWN_MS + 1 });
    assert.equal(c.ok, true);
  });

  it("pins five tokens for 3h then reports the next free slot", () => {
    const book = emptyShill();
    const t0 = 10_000;
    for (let i = 0; i < SHILL_PIN_SLOTS; i++) {
      const r = pinToken(book, {
        owner: A,
        token: { mint: CA, symbol: "SOL", name: "Solana" },
        sig: `pinsig${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
        paidSol: SHILL_PIN_SOL,
        now: t0 + i,
      });
      assert.equal(r.ok, true);
    }
    const full = pinToken(book, {
      owner: B,
      token: { mint: CA, symbol: "SOL", name: "Solana" },
      sig: "pinsigfullxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: t0 + 10,
    });
    assert.equal(full.ok, false);
    if (!full.ok) {
      assert.equal(full.error, "full");
      assert.ok((full.nextFreeAt || 0) >= t0 + SHILL_PIN_MS);
    }
    pruneShill(book, t0 + SHILL_PIN_SLOTS + SHILL_PIN_MS + 1);
    assert.equal(book.pins.length, 0);
  });
});
