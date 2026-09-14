import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCoin, emptyLaunchBook } from "../lib/launch/engine";
import {
  ROCKET_MS,
  buyBoost,
  fillHouseBoosts,
  liveBoosts,
  rankedBoosts,
  rocketSol,
  tickBoosts,
} from "../lib/launch/boost";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";

function bookWithCoins() {
  const book = emptyLaunchBook();
  for (let i = 0; i < 12; i++) {
    const r = createCoin(book, {
      creator: i % 2 ? A : B,
      name: `Coin${i}`,
      symbol: `CX${i}`.slice(0, 10),
      now: 1 + i,
    });
    assert.equal(r.ok, true);
  }
  return book;
}

describe("rocket boosts", () => {
  it("prices rockets and goes live for 24h with no slot cap", () => {
    assert.equal(rocketSol(3), 0.15);
    const book = bookWithCoins();
    const t0 = 1_000_000;
    for (let i = 0; i < 12; i++) {
      const r = buyBoost(book, {
        owner: A,
        coinId: book.coins[i].id,
        rockets: 1,
        sig: `siglive${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
        paidSol: 0.05,
        now: t0,
      });
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.boost.status, "live");
    }
    assert.equal(liveBoosts(book, t0).length, 12);
    assert.equal(rankedBoosts(book, t0).length, 12);
  });

  it("stacks rockets on the same coin and drops them after 24h", () => {
    const book = bookWithCoins();
    const t0 = 5_000_000;
    buyBoost(book, {
      owner: A,
      coinId: book.coins[0].id,
      rockets: 2,
      sig: "s1yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      paidSol: 0.1,
      now: t0,
    });
    buyBoost(book, {
      owner: B,
      coinId: book.coins[0].id,
      rockets: 3,
      sig: "s2yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      paidSol: 0.15,
      now: t0,
    });
    const ranked = rankedBoosts(book, t0);
    assert.equal(ranked[0].rockets, 5);
    tickBoosts(book, t0 + ROCKET_MS + 1);
    assert.equal(rankedBoosts(book, t0 + ROCKET_MS + 1).length, 0);
  });

  it("rejects a reused signature", () => {
    const book = bookWithCoins();
    const sig = "dupsigxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const a = buyBoost(book, { owner: A, coinId: book.coins[0].id, rockets: 1, sig, paidSol: 0.05, now: 9 });
    const b = buyBoost(book, { owner: A, coinId: book.coins[1].id, rockets: 1, sig, paidSol: 0.05, now: 10 });
    assert.equal(a.ok, true);
    assert.equal(b.ok, false);
  });

  it("house-fills from the top 10 until 8-10 live, and refills at 6-7", () => {
    const book = bookWithCoins();
    const t0 = 9_000_000;
    const top = book.coins.slice(0, 10).map((c) => ({ id: c.id, mint: c.mint, symbol: c.symbol }));
    assert.equal(fillHouseBoosts(book, top, t0), true);
    const n = rankedBoosts(book, t0).length;
    assert.ok(n >= 8 && n <= 10);
    assert.equal(fillHouseBoosts(book, top, t0), false);
    const keep = rankedBoosts(book, t0).slice(0, 6);
    for (const b of liveBoosts(book, t0)) {
      if (!keep.some((k) => k.coinId === b.coinId)) b.status = "done";
    }
    assert.ok(rankedBoosts(book, t0).length <= 6);
    assert.equal(fillHouseBoosts(book, top, t0 + 1), true);
    assert.ok(rankedBoosts(book, t0 + 1).length >= 8);
  });
});
