import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { banShill, emptyShill, extractCas, fillHousePins, mergeShill, muteShill, pinToken, postShill, pruneShill } from "../lib/shill/engine";
import { SHILL_CA_COOLDOWN_MS, SHILL_HOUSE_PIN_MAX, SHILL_HOUSE_PIN_MIN, SHILL_PIN_MS, SHILL_PIN_SOL, SHILL_PIN_SLOTS } from "../lib/shill/types";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const CA = "So11111111111111111111111111111111111111112";

describe("shill zone", () => {
  it("blocks muted and banned wallets from posting", () => {
    const book = emptyShill();
    const now = 50_000;
    assert.equal(muteShill(book, A, 24 * 3600_000, now), true);
    const muted = postShill(book, { owner: A, text: "hi", now: now + 1000 });
    assert.equal(muted.ok, false);
    if (!muted.ok) assert.equal(muted.error, "muted");
    const later = postShill(book, { owner: A, text: "later", now: now + 24 * 3600_000 + 1 });
    assert.equal(later.ok, true);
    assert.equal(banShill(book, B, true, now), true);
    const banned = postShill(book, { owner: B, text: "nope", now: now + 10 });
    assert.equal(banned.ok, false);
    if (!banned.ok) assert.equal(banned.error, "banned");
  });

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

  it("merges two books so an empty isolate cannot wipe chat", () => {
    const live = emptyShill();
    const stale = emptyShill();
    const now = Date.now();
    postShill(live, { owner: A, text: "keep me", now });
    const wiped = mergeShill(emptyShill(), live);
    assert.equal(wiped.messages.length, 1);
    assert.equal(wiped.messages[0].text, "keep me");
    postShill(stale, { owner: B, text: "older", now: now - 1000 });
    const both = mergeShill(live, stale);
    assert.equal(both.messages.length, 2);
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

  it("keeps 2–3 house pins on the board without eating paid slots", () => {
    const book = emptyShill();
    const coins = [
      { mint: CA, symbol: "SOL", name: "Solana" },
      { mint: A, symbol: "AAA", name: "Alpha" },
      { mint: B, symbol: "BBB", name: "Beta" },
    ];
    assert.equal(fillHousePins(book, coins, 1_000), true);
    assert.ok(book.pins.length >= SHILL_HOUSE_PIN_MIN);
    assert.ok(book.pins.length <= SHILL_HOUSE_PIN_MAX);
    assert.ok(book.pins.every((p) => p.house));
    const paid = pinToken(book, {
      owner: A,
      token: { mint: CA, symbol: "SOL", name: "Solana" },
      sig: "userpinxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: 2_000,
    });
    assert.equal(paid.ok, true);
    book.pins = book.pins.filter((p) => !p.house).slice(0, 1);
    assert.equal(book.pins.length, 1);
    assert.equal(fillHousePins(book, coins, 3_000), true);
    assert.equal(book.pins.length, 2);
  });
});
