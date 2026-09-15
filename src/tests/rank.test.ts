import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLaunchBook, mergeLaunch } from "../lib/launch/engine";
import {
  RANK_MAX,
  creditRank,
  rankFromXp,
  rankTier,
  resetRank,
  setFavourite,
  setIntro,
  setRankTo,
  xpProgress,
  xpToReach,
} from "../lib/rank/engine";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";

describe("rank engine", () => {
  it("starts at rank 1 and makes 100 a long grind", () => {
    assert.equal(rankFromXp(0), 1);
    assert.equal(xpToReach(1), 0);
    assert.ok(xpToReach(10) > 1_000);
    assert.ok(xpToReach(50) > xpToReach(10) * 8);
    assert.ok(xpToReach(RANK_MAX) > 80_000);
    assert.equal(rankFromXp(xpToReach(25)), 25);
    assert.equal(rankFromXp(xpToReach(RANK_MAX)), 100);
  });

  it("caps chat XP per day so the board cannot be farmed overnight", () => {
    const book = emptyLaunchBook();
    const now = Date.parse("2026-09-15T12:00:00Z");
    let added = 0;
    for (let i = 0; i < 40; i++) {
      const r = creditRank(book, A, "chat", { now });
      assert.equal(r.ok, true);
      if (r.ok) added += r.added;
    }
    assert.equal(added, 140);
    assert.ok((book.accounts[A].xp || 0) < xpToReach(10));
  });

  it("credits launch, circle once, referral, and swap with a daily swap cap", () => {
    const book = emptyLaunchBook();
    const now = 1_700_000_000_000;
    const launch = creditRank(book, A, "launch", { now });
    assert.equal(launch.ok, true);
    if (launch.ok) assert.equal(launch.added, 2400);
    const extra = creditRank(book, A, "launch", { now });
    assert.equal(extra.ok, true);
    if (extra.ok) assert.equal(extra.added, 400);
    const circle = creditRank(book, A, "circle", { now });
    assert.equal(circle.ok, true);
    if (circle.ok) assert.equal(circle.added, 2200);
    const again = creditRank(book, A, "circle", { now });
    assert.equal(again.ok, true);
    if (again.ok) assert.equal(again.added, 0);
    const ref = creditRank(book, B, "referral", { now });
    assert.equal(ref.ok, true);
    if (ref.ok) assert.equal(ref.added, 1600);
    let swap = 0;
    for (let i = 0; i < 20; i++) {
      const r = creditRank(book, A, "swap", { sol: 1, now });
      if (r.ok) swap += r.added;
    }
    assert.equal(swap, 420);
  });

  it("lets admin snap a rank and reset it", () => {
    const book = emptyLaunchBook();
    const set = setRankTo(book, A, 40);
    assert.equal(set.ok, true);
    if (set.ok) {
      assert.equal(set.rank, 40);
      assert.equal(rankFromXp(set.xp), 40);
    }
    const gone = resetRank(book, A);
    assert.equal(gone.ok, true);
    assert.equal(rankFromXp(book.accounts[A].xp || 0), 1);
  });

  it("stores intro and a favourite CA", () => {
    const book = emptyLaunchBook();
    const intro = setIntro(book, A, "  I launch bags  ");
    assert.equal(intro.ok, true);
    assert.equal(book.accounts[A].intro, "I launch bags");
    const fav = setFavourite(book, A, { mint: B, symbol: "BAG", name: "Bag" });
    assert.equal(fav.ok, true);
    assert.equal(book.accounts[A].favMint, B);
    assert.equal(rankTier(1).title, "Spark");
    assert.equal(rankTier(100).title, "Solphia");
    const p = xpProgress(0);
    assert.equal(p.rank, 1);
    assert.ok(p.need > 0);
  });

  it("keeps intro, banner, favourite, and XP across launch merges", () => {
    const local = emptyLaunchBook();
    local.accounts[A] = {
      pubkey: A,
      referralRewardsSol: 0,
      intro: "bags only",
      banner: "/api/media?u=https://example.com/b.jpg",
      favMint: B,
      favSymbol: "BAG",
      xp: 5000,
    };
    const remote = emptyLaunchBook();
    remote.accounts[A] = { pubkey: A, referralRewardsSol: 1, username: "old" };
    const merged = mergeLaunch(local, remote);
    const acc = merged.accounts[A];
    assert.equal(acc.intro, "bags only");
    assert.equal(acc.banner, "/api/media?u=https://example.com/b.jpg");
    assert.equal(acc.favMint, B);
    assert.equal(acc.favSymbol, "BAG");
    assert.equal(acc.xp, 5000);
    assert.equal(acc.referralRewardsSol, 1);
  });
});
