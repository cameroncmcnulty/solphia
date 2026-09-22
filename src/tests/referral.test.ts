import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEV_FEE_BPS, OWNER_FEE_BPS, REF_FEE_BPS, REFERRED_OWNER_BPS, REFERRED_TREAS_BPS, SWAP_FEE_BPS, TREAS_FEE_BPS, feeOn, splitFee } from "../lib/launch/curve";
import { bindReferrer, buyCoin, createCoin, emptyLaunchBook, recordOnchainFill, withdrawReferral } from "../lib/launch/engine";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const OWN = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";

describe("referral split", () => {
  it("keeps 50/25/25 with no inviter, and 50/25/12.5/12.5 when invited", () => {
    assert.equal(DEV_FEE_BPS + OWNER_FEE_BPS + TREAS_FEE_BPS, SWAP_FEE_BPS);
    assert.equal(DEV_FEE_BPS + REF_FEE_BPS + REFERRED_OWNER_BPS + REFERRED_TREAS_BPS, SWAP_FEE_BPS);
    const fee = feeOn(2);
    const plain = splitFee(fee);
    assert.equal(plain.referral, 0);
    assert.equal(plain.dev, 0.01);
    const ref = splitFee(fee, true);
    assert.equal(ref.dev, 0.01);
    assert.equal(ref.referral, 0.005);
    assert.equal(ref.owner, 0.0025);
    assert.equal(ref.treasury, 0.0025);
    assert.equal(Math.round((ref.dev + ref.referral + ref.owner + ref.treasury) * 1e12) / 1e12, fee);
  });
});

describe("referral book", () => {
  it("locks the first inviter and ignores a later one or self", () => {
    const book = emptyLaunchBook();
    const first = bindReferrer(book, A, OWN);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.bound, true);
    assert.equal(first.account.referrer, OWN);
    const again = bindReferrer(book, A, B);
    assert.equal(again.ok, true);
    if (again.ok) {
      assert.equal(again.bound, false);
      assert.equal(again.account.referrer, OWN);
    }
    const self = bindReferrer(book, B, B);
    assert.equal(self.ok, true);
    if (self.ok) assert.equal(self.bound, false);
  });

  it("binds a username invite the same as a wallet invite", () => {
    const book = emptyLaunchBook();
    const named = createCoin(book, { creator: OWN, name: "Host", symbol: "HOST" });
    assert.equal(named.ok, true);
    book.accounts[OWN].username = "cam";
    const r = bindReferrer(book, A, "cam");
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.bound, true);
      assert.equal(r.account.referrer, OWN);
    }
  });

  it("pays the inviter 25% of swap fees for life on top of 50% to the dev", () => {
    const book = emptyLaunchBook();
    bindReferrer(book, A, OWN);
    const made = createCoin(book, { creator: A, name: "Ref Coin", symbol: "REFC", now: 1_700_000_000_000 });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    assert.equal(made.coin.referrer, OWN);
    const t0 = made.coin.createdAt + 70_000;
    const buy = buyCoin(book, { id: made.coin.id, owner: B, sol: 0.4, now: t0 });
    assert.equal(buy.ok, true);
    if (!buy.ok) return;
    const fee = feeOn(0.4);
    assert.ok(Math.abs(buy.coin.devRewardsSol - fee * 0.5) < 1e-9);
    assert.ok(Math.abs((buy.coin.referralFeesSol || 0) - fee * 0.25) < 1e-9);
    assert.ok(Math.abs((book.accounts[OWN]?.referralRewardsSol || 0) - fee * 0.25) < 1e-9);
    assert.ok(Math.abs(buy.coin.ownerFeesSol - fee * 0.125) < 1e-9);

    const two = createCoin(book, { creator: A, name: "Second", symbol: "SEC2", now: t0 + 1_000 });
    assert.equal(two.ok, true);
    if (!two.ok) return;
    const buy2 = buyCoin(book, { id: two.coin.id, owner: B, sol: 0.4, now: t0 + 80_000 });
    assert.equal(buy2.ok, true);
    if (!buy2.ok) return;
    assert.ok(Math.abs((book.accounts[OWN]?.referralRewardsSol || 0) - fee * 0.5) < 1e-9);

    const out = withdrawReferral(book, { owner: OWN });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.ok(out.sol > 0);
    assert.equal(book.accounts[OWN].referralRewardsSol, 0);
  });

  it("credits the inviter on an on-chain fill, not only paper curve buys", () => {
    const book = emptyLaunchBook();
    bindReferrer(book, A, OWN);
    const made = createCoin(book, { creator: A, name: "Live", symbol: "LIVE", now: 1_700_000_000_000 });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    const rec = recordOnchainFill(book, {
      id: made.coin.id,
      owner: B,
      side: "buy",
      sol: 1,
      tokens: 1000,
      feeSol: 0.01,
      now: made.coin.createdAt + 80_000,
    });
    assert.equal(rec.ok, true);
    if (!rec.ok) return;
    assert.ok(Math.abs((book.accounts[OWN]?.referralRewardsSol || 0) - 0.0025) < 1e-9);
    assert.ok(Math.abs(rec.coin.devRewardsSol - 0.005) < 1e-9);
  });
});
