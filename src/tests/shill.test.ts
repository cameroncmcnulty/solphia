import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { banShill, emptyShill, extractCas, fillHousePins, mergeShill, muteShill, pinToken, postShill, pruneShill, voteBoard, voteShill } from "../lib/shill/engine";
import {
  SHILL_CA_COOLDOWN_MS,
  SHILL_HOUSE_PIN_MAX,
  SHILL_HOUSE_PIN_MIN,
  SHILL_HOUSE_REPLACE_MS,
  SHILL_HOUSE_STAGGER_MS,
  SHILL_HOUSE_SPREAD_MS,
  SHILL_PIN_MS,
  SHILL_PIN_SOL,
  SHILL_PIN_SLOTS,
  SHILL_VOTE_COOLDOWN_MS,
  SHILL_VOTE_MS,
} from "../lib/shill/types";

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

  it("keeps house pins until they expire, then restocks one after a short wait", () => {
    const book = emptyShill();
    const coins = [
      { mint: CA, symbol: "SOL", name: "Solana" },
      { mint: A, symbol: "AAA", name: "Alpha" },
      { mint: B, symbol: "BBB", name: "Beta" },
    ];
    assert.equal(fillHousePins(book, coins, 1_000), true);
    assert.equal(book.pins.length, SHILL_HOUSE_PIN_MIN);
    for (const p of book.pins) {
      assert.equal(p.endsAt - p.at, SHILL_PIN_MS);
    }
    const firstIds = book.pins.map((p) => p.id);
    assert.equal(fillHousePins(book, coins, 2_000), false, "must not reshuffle live house pins");
    assert.deepEqual(book.pins.map((p) => p.id), firstIds);

    const keeper = book.pins[0];
    book.pins[1].endsAt = 3_000;
    pruneShill(book, 3_001);
    assert.equal(book.pins.filter((p) => p.house).length, 1);
    assert.equal(fillHousePins(book, coins, 3_001), false, "wait a couple minutes after expiry");
    assert.equal(fillHousePins(book, coins, 3_001 + SHILL_HOUSE_REPLACE_MS), true);
    assert.equal(book.pins.filter((p) => p.house).length, 2);
    assert.ok(book.pins.some((p) => p.id === keeper.id));

    assert.equal(fillHousePins(book, coins, 3_001 + SHILL_HOUSE_REPLACE_MS + 1), false);
    assert.equal(fillHousePins(book, coins, 3_001 + SHILL_HOUSE_REPLACE_MS + SHILL_HOUSE_STAGGER_MS), true);
    assert.equal(book.pins.filter((p) => p.house).length, SHILL_HOUSE_PIN_MAX);
    assert.equal(fillHousePins(book, coins, 9e12), false);

    const paid = pinToken(book, {
      owner: A,
      token: { mint: CA, symbol: "SOL", name: "Solana" },
      sig: "userpinxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: SHILL_PIN_SOL,
      now: 4_000,
    });
    assert.equal(paid.ok, true);
    assert.ok(book.pins.filter((p) => p.house).length <= SHILL_HOUSE_PIN_MAX);
  });

  it("clamps a house pin that somehow lasted past 3h and keeps pin order stable", () => {
    const book = emptyShill();
    const coins = [
      { mint: CA, symbol: "SOL", name: "Solana" },
      { mint: A, symbol: "AAA", name: "Alpha" },
      { mint: B, symbol: "BBB", name: "Beta" },
    ];
    const t0 = 10_000;
    fillHousePins(book, coins, t0);
    const order = book.pins.map((p) => p.id);
    book.pins[0].endsAt = t0 + 5 * 3600_000;
    pruneShill(book, t0 + 1_000);
    assert.ok(book.pins[0].endsAt - book.pins[0].at <= SHILL_PIN_MS);
    assert.deepEqual(book.pins.map((p) => p.id), order);
  });

  it("staggers initial house pins so they expire hours apart", () => {
    const book = emptyShill();
    const coins = [
      { mint: CA, symbol: "SOL", name: "Solana" },
      { mint: A, symbol: "AAA", name: "Alpha" },
      { mint: B, symbol: "BBB", name: "Beta" },
    ];
    const t0 = Date.now();
    fillHousePins(book, coins, t0);
    const house = book.pins.filter((p) => p.house).sort((a, b) => a.at - b.at);
    assert.ok(house.length >= 2);
    assert.ok(house[1].at - house[0].at >= SHILL_HOUSE_SPREAD_MS - 1);
    assert.ok(house[1].endsAt - house[0].endsAt >= SHILL_HOUSE_SPREAD_MS - 1);
  });

  it("counts 24h votes and enforces one upvote per hour", () => {
    const book = emptyShill();
    const t0 = 1_000_000;
    const a = voteShill(book, { owner: A, mint: CA, token: { mint: CA, symbol: "SOL", name: "Solana" }, now: t0 });
    assert.equal(a.ok, true);
    const again = voteShill(book, { owner: A, mint: CA, now: t0 + SHILL_VOTE_COOLDOWN_MS - 1 });
    assert.equal(again.ok, false);
    const later = voteShill(book, { owner: A, mint: CA, now: t0 + SHILL_VOTE_COOLDOWN_MS });
    assert.equal(later.ok, true);
    if (later.ok) assert.equal(later.votes, 2);
    voteShill(book, { owner: B, mint: A, token: { mint: A, symbol: "AAA", name: "Alpha" }, now: t0 });
    const board = voteBoard(book, t0);
    assert.equal(board[0].mint, CA);
    assert.equal(board[0].votes, 2);
    pruneShill(book, t0 + SHILL_VOTE_COOLDOWN_MS + SHILL_VOTE_MS + 1);
    assert.equal(voteBoard(book, t0 + SHILL_VOTE_COOLDOWN_MS + SHILL_VOTE_MS + 1).length, 0);
  });
});
