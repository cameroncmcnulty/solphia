import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createCoin, emptyLaunchBook } from "../lib/launch/engine";
import {
  HOUSE_INITIAL,
  HOUSE_KEEP_MIN,
  HOUSE_SPREAD_MS,
  HOUSE_STAGGER_MS,
  MEGA_ROCKETS,
  ROCKET_MS,
  buyBoost,
  dropPadHouseBoosts,
  fillHouseBoosts,
  liveBoosts,
  organicizeHouseBoosts,
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

  it("house-fills a few market coins with staggered start times and does not reshuffle live rows", () => {
    const book = emptyLaunchBook();
    const t0 = 9_000_000;
    const market = Array.from({ length: 12 }, (_, i) => ({
      id: `m${i}`,
      mint: `MarketMint${i}11111111111111111111111111111`.slice(0, 44),
      symbol: `M${i}`,
      name: `Market${i}`,
    }));
    assert.equal(fillHouseBoosts(book, market, t0), true);
    const live = liveBoosts(book, t0);
    assert.ok(live.length >= 2 && live.length <= HOUSE_INITIAL);
    const bought = live.map((b) => b.boughtAt).sort((a, b) => a - b);
    for (let i = 1; i < bought.length; i++) {
      assert.ok(bought[i] > bought[i - 1], "house boosts must not share a start time");
      assert.ok(bought[i] - bought[i - 1] >= HOUSE_SPREAD_MS / 2, "house boosts must be hours apart");
    }
    assert.ok(live.length <= HOUSE_KEEP_MIN);
    const ids = live.map((b) => b.id);
    assert.equal(fillHouseBoosts(book, market, t0), false);
    assert.deepEqual(
      liveBoosts(book, t0).map((b) => b.id),
      ids,
    );
    assert.equal(fillHouseBoosts(book, market, t0 + HOUSE_STAGGER_MS), true);
    assert.ok(liveBoosts(book, t0 + HOUSE_STAGGER_MS).length >= live.length);
    assert.ok(ids.every((id) => liveBoosts(book, t0 + HOUSE_STAGGER_MS).some((b) => b.id === id)));
  });

  it("never house-boosts pad launches and drops ones that slipped in", () => {
    const book = bookWithCoins();
    const t0 = 12_000_000;
    const pad = book.coins.slice(0, 8).map((c) => ({
      id: c.id,
      mint: c.mint,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      born: true,
    }));
    assert.equal(fillHouseBoosts(book, pad, t0), false);
    assert.equal(rankedBoosts(book, t0).length, 0);
    const marketMint = "MarketKeep111111111111111111111111111111111";
    buyBoost(book, {
      owner: "solphia",
      coinId: book.coins[0].id,
      mint: book.coins[0].mint,
      rockets: 10,
      sig: "housepadxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: 0,
      now: t0,
      house: true,
    });
    buyBoost(book, {
      owner: "solphia",
      coinId: marketMint,
      mint: marketMint,
      symbol: "KEEP",
      rockets: 30,
      sig: "housemarketxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      paidSol: 0,
      now: t0,
      house: true,
    });
    assert.equal(dropPadHouseBoosts(book), true);
    const left = liveBoosts(book, t0);
    assert.equal(left.length, 1);
    assert.equal(left[0].mint, marketMint);
  });

  it("spreads a clustered house batch instead of resetting it", () => {
    const book = emptyLaunchBook();
    const t0 = 15_000_000;
    for (let i = 0; i < 3; i++) {
      buyBoost(book, {
        owner: "solphia",
        coinId: `c${i}`,
        mint: `ClusterMint${i}1111111111111111111111111111`.slice(0, 44),
        rockets: 10,
        sig: `cluster${i}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
        paidSol: 0,
        now: t0,
        house: true,
      });
    }
    const ids = liveBoosts(book, t0).map((b) => b.id);
    assert.equal(organicizeHouseBoosts(book, t0), true);
    const live = liveBoosts(book, t0);
    assert.deepEqual(
      live.map((b) => b.id).sort(),
      [...ids].sort(),
    );
    const bought = live.map((b) => b.boughtAt).sort((a, b) => a - b);
    for (let i = 1; i < bought.length; i++) {
      assert.ok(bought[i] > bought[i - 1]);
      assert.ok(bought[i] - bought[i - 1] >= HOUSE_SPREAD_MS / 2);
    }
    assert.equal(organicizeHouseBoosts(book, t0), false);
  });

  it("plants a mega 500 pack in the first house batch", () => {
    const book = emptyLaunchBook();
    const t0 = 11_000_000;
    const market = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i}`,
      mint: `MegaMint${i}1111111111111111111111111111111`.slice(0, 44),
      symbol: `G${i}`,
    }));
    assert.equal(fillHouseBoosts(book, market, t0), true);
    const megas = rankedBoosts(book, t0).filter((r) => r.rockets >= MEGA_ROCKETS);
    assert.ok(megas.length >= 1);
    assert.ok(megas.length <= 2);
    assert.equal(megas[0].mega, true);
  });

  it("lets a user search a CA instead of hunting the tape", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/BoostBuy.tsx"), "utf8");
    assert.match(src, /Paste any Solana CA/);
    assert.match(src, /\/api\/launch\/lookup/);
    assert.equal(src.includes("Open a token below"), false);
  });

  it("charges boosts with a live 50/50 owner and treasury split", () => {
    const src = readFileSync(path.join(process.cwd(), "src/app/api/launch/boost/route.ts"), "utf8");
    assert.match(src, /mode: "even"/);
    assert.match(src, /unsignedHousePay/);
    assert.match(src, /creditEvenIncome/);
  });
});
