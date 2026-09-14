import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  airdropWeight,
  boostPct,
  emptyCircle,
  joinCircle,
  postMessage,
  runAirdrop,
  spotsLeft,
} from "../lib/circle/engine";
import { CIRCLE_BOOST_PCT } from "../lib/circle/types";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const C = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";

describe("founders circle", () => {
  it("caps seats and weights airdrops by referral boost", () => {
    const book = emptyCircle();
    book.cap = 2;
    const a = joinCircle(book, { pubkey: A, email: "a@solphia.io" });
    const b = joinCircle(book, { pubkey: B, email: "b@solphia.io", referrer: A });
    const c = joinCircle(book, { pubkey: C, email: "c@solphia.io" });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(c.ok, false);
    if (!c.ok) assert.equal(c.error, "full");
    assert.equal(spotsLeft(book), 0);
    assert.equal(boostPct(book, A), CIRCLE_BOOST_PCT);
    assert.equal(airdropWeight(book, A), 1.05);
    assert.equal(airdropWeight(book, B), 1);
    const drop = runAirdrop(book, 105);
    assert.equal(drop.ok, true);
    if (!drop.ok) return;
    const shareA = drop.shares.find((s) => s.pubkey === A)?.amount || 0;
    const shareB = drop.shares.find((s) => s.pubkey === B)?.amount || 0;
    assert.ok(shareA > shareB);
    assert.ok(Math.abs(shareA + shareB - 105) < 1e-6);
  });

  it("blocks empty chat from non-members", () => {
    const book = emptyCircle();
    const miss = postMessage(book, { owner: A, text: "hi" });
    assert.equal(miss.ok, false);
    joinCircle(book, { pubkey: A, email: "a@solphia.io" });
    const ok = postMessage(book, { owner: A, text: "hello circle" });
    assert.equal(ok.ok, true);
  });
});
