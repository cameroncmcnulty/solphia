import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCoin, emptyLaunchBook } from "../lib/launch/engine";
import {
  MEGA_ROCKETS,
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
  it("prices packs and goes live for 24h with no slot cap", () => {
    assert.equal(rocketSol(10), 0.5);
    assert.equal(rocketSol(30), 1);
    assert.equal(rocketSol(100), 2);
    assert.equal(rocketSol(500), 3);
    const book = bookWithCoins();
    const t0 = 1_000_000;
    for (let i = 0; i < 12; i++) {
      const r = buyBoost(book, {
        owner: A,
        coinId: book.coins[i].id,
        rockets: 10,
        sig: `siglive${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
        paidSol: 0.5,
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
      rockets: 10,
      sig: "s1yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      paidSol: 0.5,
      now: t0,
    });
    buyBoost(book, {
      owner: B,
      coinId: book.coins[0].id,
      rockets: 30,
      sig: "s2yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      paidSol: 1,
      now: t0 + 10,
    });
    const ranked = rankedBoosts(book, t0 + 10);
    assert.equal(ranked[0].rockets, 40);
    const latest = rankedBoosts(book, t0 + 10, "latest");
    assert.equal(latest[0].coinId, book.coins[0].id);
    tickBoosts(book, t0 + 10 + ROCKET_MS + 1);
    assert.equal(rankedBoosts(book, t0 + 10 + ROCKET_MS + 1).length, 0);
  });

  it("marks a 500-rocket pack as mega", () => {
    const book = bookWithCoins();
    const r = buyBoost(book, {
      owner: A,
      coinId: book.coins[0].id,
      rockets: MEGA_ROCKETS,
      sig: "megaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: 3,
      now: 8,
    });
    assert.equal(r.ok, true);
    const ranked = rankedBoosts(book, 8);
    assert.equal(ranked[0].mega, true);
    assert.equal(ranked[0].rockets, 500);
  });

  it("rejects a reused signature", () => {
    const book = bookWithCoins();
    const sig = "dupsigxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const a = buyBoost(book, { owner: A, coinId: book.coins[0].id, rockets: 10, sig, paidSol: 0.5, now: 9 });
    const b = buyBoost(book, { owner: A, coinId: book.coins[1].id, rockets: 10, sig, paidSol: 0.5, now: 10 });
    assert.equal(a.ok, true);
    assert.equal(b.ok, false);
  });

  it("house-fills from the top 10 until 8-10 live, and refills at 6-7", () => {
    const book = bookWithCoins();
    const t0 = 9_000_000;
    const top = book.coins.slice(0, 10).map((c) => ({ id: c.id, mint: c.mint, symbol: c.symbol, name: c.name, image: c.image }));
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

  it("plants 1–2 mega 500 packs so the rail can spark", () => {
    const book = bookWithCoins();
    const t0 = 11_000_000;
    const top = book.coins.slice(0, 10).map((c) => ({ id: c.id, mint: c.mint, symbol: c.symbol, name: c.name, image: c.image }));
    assert.equal(fillHouseBoosts(book, top, t0), true);
    const megas = rankedBoosts(book, t0).filter((r) => r.rockets >= MEGA_ROCKETS);
    assert.ok(megas.length >= 1);
    assert.ok(megas.length <= 2);
    assert.equal(megas[0].mega, true);
  });
});
