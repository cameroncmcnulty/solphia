import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCoin, emptyLaunchBook } from "../lib/launch/engine";
import {
  BOOST_SLOTS,
  buyBoost,
  liveBoosts,
  ownerBoosts,
  queueEtaMs,
  queuedBoosts,
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
  it("prices rockets and fills 10 live slots then queues", () => {
    assert.equal(rocketSol(3), 0.15);
    const book = bookWithCoins();
    const t0 = 1_000_000;
    for (let i = 0; i < BOOST_SLOTS; i++) {
      const r = buyBoost(book, {
        owner: A,
        coinId: book.coins[i].id,
        rockets: 1,
        sig: `siglive${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
        paidSol: 0.05,
        now: t0,
      });
      assert.equal(r.ok, true);
    }
    assert.equal(liveBoosts(book, t0).length, BOOST_SLOTS);
    const extra = buyBoost(book, {
      owner: B,
      coinId: book.coins[10].id,
      rockets: 3,
      sig: "sigqueue0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: 0.15,
      now: t0,
    });
    assert.equal(extra.ok, true);
    if (!extra.ok) return;
    assert.equal(extra.boost.status, "queued");
    assert.equal(queuedBoosts(book, t0).length, 1);
    const eta = queueEtaMs(book, extra.boost.id, t0);
    assert.ok(eta > 0);
  });

  it("promotes the queue when a live boost expires", () => {
    const book = bookWithCoins();
    const t0 = 5_000_000;
    for (let i = 0; i < BOOST_SLOTS; i++) {
      buyBoost(book, {
        owner: A,
        coinId: book.coins[i].id,
        rockets: 1,
        sig: `s${i}yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`,
        paidSol: 0.05,
        now: t0,
      });
    }
    buyBoost(book, {
      owner: B,
      coinId: book.coins[10].id,
      rockets: 2,
      sig: "swaitxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: 0.1,
      now: t0,
    });
    const later = t0 + 30 * 60_000 + 1;
    tickBoosts(book, later);
    const live = liveBoosts(book, later);
    assert.equal(live.length, 1);
    assert.equal(live[0].owner, B);
    const mine = ownerBoosts(book, B, later);
    assert.equal(mine.live.length, 1);
    assert.equal(mine.queued.length, 0);
  });

  it("rejects a reused signature", () => {
    const book = bookWithCoins();
    const sig = "dupsigxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const a = buyBoost(book, { owner: A, coinId: book.coins[0].id, rockets: 1, sig, paidSol: 0.05, now: 9 });
    const b = buyBoost(book, { owner: A, coinId: book.coins[1].id, rockets: 1, sig, paidSol: 0.05, now: 10 });
    assert.equal(a.ok, true);
    assert.equal(b.ok, false);
  });
});
