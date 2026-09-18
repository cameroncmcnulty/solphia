import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addJob,
  airdropWeight,
  boostPct,
  emptyCircle,
  hasAccess,
  joinCircle,
  postMessage,
  pruneCircle,
  reactMessage,
  removeJob,
  runAirdrop,
} from "../lib/circle/engine";
import { CIRCLE_BOOST_PCT } from "../lib/circle/types";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const C = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";

describe("founders circle", () => {
  it("does not hard-cap seats and weights airdrops by referral boost", () => {
    const book = emptyCircle();
    const a = joinCircle(book, { pubkey: A, email: "a@solphia.io" });
    const b = joinCircle(book, { pubkey: B, email: "b@solphia.io", referrer: A });
    const c = joinCircle(book, { pubkey: C, email: "c@solphia.io" });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(c.ok, true);
    assert.equal(boostPct(book, A), CIRCLE_BOOST_PCT);
    assert.equal(airdropWeight(book, A), 1.05);
    assert.equal(airdropWeight(book, B), 1);
    const drop = runAirdrop(book, 205);
    assert.equal(drop.ok, true);
    if (!drop.ok) return;
    const shareA = drop.shares.find((s) => s.pubkey === A)?.amount || 0;
    const shareB = drop.shares.find((s) => s.pubkey === B)?.amount || 0;
    assert.ok(shareA > shareB);
  });

  it("blocks empty chat from non-members", () => {
    const book = emptyCircle();
    const miss = postMessage(book, { owner: A, text: "hi" });
    assert.equal(miss.ok, false);
    joinCircle(book, { pubkey: A, email: "a@solphia.io" });
    const ok = postMessage(book, { owner: A, text: "hello circle" });
    assert.equal(ok.ok, true);
  });

  it("drops chat older than the keep window", () => {
    const book = emptyCircle();
    joinCircle(book, { pubkey: A, email: "a@solphia.io", now: 1 });
    postMessage(book, { owner: A, text: "old", now: 1 });
    postMessage(book, { owner: A, text: "fresh", now: Date.now() });
    pruneCircle(book);
    assert.equal(book.messages.length, 1);
    assert.equal(book.messages[0].text, "fresh");
  });

  it("keeps an empty jobs board until a listing is posted", () => {
    const book = emptyCircle();
    assert.equal(book.jobs.length, 0);
    const miss = addJob(book, { title: "  " });
    assert.equal(miss.ok, false);
    const ok = addJob(book, { title: "Protocol engineer", blurb: "Curve and desk.", href: "https://solphia.io" });
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.equal(book.jobs[0].title, "Protocol engineer");
    assert.equal(removeJob(book, ok.job.id), true);
    assert.equal(book.jobs.length, 0);
  });

  it("lets a vip wallet in without inviting anyone", () => {
    const book = emptyCircle();
    const a = joinCircle(book, { pubkey: A, email: "a@solphia.io", vip: true });
    assert.equal(a.ok, true);
    if (!a.ok) return;
    assert.equal(hasAccess(a.member), true);
  });

  it("unlocks both seats when the invitee registers", () => {
    const book = emptyCircle();
    const a = joinCircle(book, { pubkey: A, email: "a@solphia.io" });
    assert.equal(a.ok, true);
    if (!a.ok) return;
    assert.equal(hasAccess(a.member), false);
    const b = joinCircle(book, { pubkey: B, email: "b@solphia.io", referrer: A });
    assert.equal(b.ok, true);
    if (!b.ok) return;
    assert.equal(hasAccess(book.members[A]), true);
    assert.equal(hasAccess(book.members[B]), true);
    assert.equal(book.members[A].invitedPubkey, B);
    const c = joinCircle(book, { pubkey: C, email: "c@solphia.io", referrer: A });
    assert.equal(c.ok, true);
    if (!c.ok) return;
    assert.equal(hasAccess(c.member), false);
  });

  it("toggles reactions as grouped emoji chips", () => {
    const book = emptyCircle();
    joinCircle(book, { pubkey: A, email: "a@solphia.io" });
    joinCircle(book, { pubkey: B, email: "b@solphia.io" });
    const posted = postMessage(book, { owner: A, text: "gm" });
    assert.equal(posted.ok, true);
    if (!posted.ok) return;
    assert.equal(reactMessage(book, { owner: A, id: posted.message.id, emoji: "❤️" }), true);
    assert.equal(reactMessage(book, { owner: B, id: posted.message.id, emoji: "❤️" }), true);
    assert.deepEqual(posted.message.reactions["❤️"], [A, B]);
    assert.equal(reactMessage(book, { owner: A, id: posted.message.id, emoji: "❤️" }), true);
    assert.deepEqual(posted.message.reactions["❤️"], [B]);
  });
});
