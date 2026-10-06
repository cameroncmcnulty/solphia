import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import { CIRCLE_BOOST_PCT, airdropMultiplier } from "../lib/circle/types";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const C = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";

describe("founders circle", () => {
  it("lets people in without an invite and weights airdrops by referral count", () => {
    const book = emptyCircle();
    const a = joinCircle(book, { pubkey: A, email: "a@solphia.io" });
    const b = joinCircle(book, { pubkey: B, email: "b@solphia.io", referrer: A });
    const c = joinCircle(book, { pubkey: C, email: "c@solphia.io" });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(c.ok, true);
    if (!a.ok) return;
    assert.equal(hasAccess(a.member), true);
    assert.equal(boostPct(book, A), CIRCLE_BOOST_PCT);
    assert.equal(airdropWeight(book, A), 1.1);
    assert.equal(airdropWeight(book, B), 1);
    const drop = runAirdrop(book, 210);
    assert.equal(drop.ok, true);
    if (!drop.ok) return;
    const shareA = drop.shares.find((s) => s.pubkey === A)?.amount || 0;
    const shareB = drop.shares.find((s) => s.pubkey === B)?.amount || 0;
    assert.ok(shareA > shareB);
  });

  it("caps seats and hides the cap number from public copy", () => {
    const book = emptyCircle();
    book.cap = 2;
    assert.equal(joinCircle(book, { pubkey: A, email: "a@solphia.io" }).ok, true);
    assert.equal(joinCircle(book, { pubkey: B, email: "b@solphia.io" }).ok, true);
    const full = joinCircle(book, { pubkey: C, email: "c@solphia.io" });
    assert.equal(full.ok, false);
    if (!full.ok) assert.equal(full.error, "full");
    const vip = joinCircle(book, { pubkey: C, email: "c@solphia.io", vip: true });
    assert.equal(vip.ok, true);
    const page = readFileSync(join(process.cwd(), "src/app/circle/page.tsx"), "utf8");
    const hang = readFileSync(join(process.cwd(), "src/components/CircleHangout.tsx"), "utf8");
    assert.match(page, /Limited spots/);
    assert.match(hang, /Limited spots/);
    assert.equal(page.includes("1000"), false);
    assert.equal(hang.includes("1000"), false);
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

  it("welcomes founders as an elite class of early BELIEVERS", () => {
    const hang = readFileSync(join(process.cwd(), "src/components/CircleHangout.tsx"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/app/circle/page.tsx"), "utf8");
    assert.match(hang, /BELIEVERS/);
    assert.match(hang, /You made the cut/);
    assert.match(hang, /FOUNDING CLASS/);
    assert.match(page, /early BELIEVERS/);
    assert.match(page, /Enter the founding class/);
    assert.match(page, /Limited spots/);
    assert.equal(page.includes("One invite unlocks"), false);
    assert.equal(page.includes("invite one believer"), false);
  });

  it("lets a vip wallet in without inviting anyone", () => {
    const book = emptyCircle();
    const a = joinCircle(book, { pubkey: A, email: "a@solphia.io", vip: true });
    assert.equal(a.ok, true);
    if (!a.ok) return;
    assert.equal(hasAccess(a.member), true);
  });

  it("counts every invite for airdrop weight without locking the next person out", () => {
    const book = emptyCircle();
    const a = joinCircle(book, { pubkey: A, email: "a@solphia.io" });
    assert.equal(a.ok, true);
    if (!a.ok) return;
    assert.equal(hasAccess(a.member), true);
    const b = joinCircle(book, { pubkey: B, email: "b@solphia.io", referrer: A });
    assert.equal(b.ok, true);
    if (!b.ok) return;
    assert.equal(hasAccess(book.members[A]), true);
    assert.equal(hasAccess(book.members[B]), true);
    assert.equal(book.members[A].invitedPubkey, B);
    const c = joinCircle(book, { pubkey: C, email: "c@solphia.io", referrer: A });
    assert.equal(c.ok, true);
    if (!c.ok) return;
    assert.equal(hasAccess(c.member), true);
    assert.equal(boostPct(book, A), CIRCLE_BOOST_PCT * 2);
    assert.equal(airdropWeight(book, A), 1.2);
    assert.equal(airdropMultiplier(1), 1.1);
    assert.equal(airdropMultiplier(20), 3);
    assert.equal(airdropMultiplier(99), 3);
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
