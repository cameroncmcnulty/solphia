import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CURVE_SALE,
  DEV_FEE_BPS,
  GRADUATE_SOL,
  K,
  MAX_WALLET_BPS,
  OWNER_FEE_BPS,
  SWAP_FEE_BPS,
  TOKEN_SUPPLY,
  TREAS_FEE_BPS,
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  emptyCurve,
  feeOn,
  quoteBuy,
  quoteSell,
  splitFee,
  spotPriceSol,
} from "../lib/launch/curve";
import { buyCoin, createCoin, emptyLaunchBook, sellCoin, withdrawDev, withdrawOwner, setOwnerWallet } from "../lib/launch/engine";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
const OWN = "2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma";

describe("launch curve math", () => {
  it("keeps k invariant on buy and sell (virtual reserves)", () => {
    let c = emptyCurve();
    assert.equal(Math.round(c.virtualSol * c.virtualTokens), Math.round(K));
    const b = quoteBuy(c, 1);
    assert.equal(b.ok, true);
    if (!b.ok) return;
    c = b.newCurve;
    assert.ok(Math.abs(c.virtualSol * c.virtualTokens - K) / K < 1e-9);
    const s = quoteSell(c, b.tokensOut || 0);
    assert.equal(s.ok, true);
    if (!s.ok) return;
    c = s.newCurve;
    assert.ok(Math.abs(c.virtualSol * c.virtualTokens - K) / K < 1e-9);
    assert.ok(c.realSol < 1e-9);
  });

  it("splits 1.00% fee 50/25/25 with no remainder leak", () => {
    assert.equal(DEV_FEE_BPS + OWNER_FEE_BPS + TREAS_FEE_BPS, SWAP_FEE_BPS);
    const fee = feeOn(2);
    assert.equal(fee, 0.02);
    const p = splitFee(fee);
    assert.equal(Math.round((p.dev + p.owner + p.treasury) * 1e12) / 1e12, fee);
    assert.equal(p.dev, 0.01);
    assert.equal(p.owner, 0.005);
    assert.equal(p.treasury, 0.005);
  });

  it("buy then sell loses only fees plus curve impact, never fabricates SOL", () => {
    const c0 = emptyCurve();
    const b = quoteBuy(c0, 0.4);
    assert.ok(b.ok);
    if (!b.ok) return;
    const s = quoteSell(b.newCurve, b.tokensOut || 0);
    assert.ok(s.ok);
    if (!s.ok) return;
    const back = s.solOut || 0;
    assert.ok(back < 0.4);
    assert.ok(back > 0.4 - b.feeSol - s.feeSol - 0.05);
    assert.ok(s.newCurve.realSol >= -1e-9);
  });

  it("price rises on buys and never goes negative", () => {
    let c = emptyCurve();
    const p0 = spotPriceSol(c);
    for (const sol of [0.05, 0.2, 1, 3]) {
      const q = quoteBuy(c, sol);
      assert.equal(q.ok, true);
      if (!q.ok) return;
      assert.ok(spotPriceSol(q.newCurve) > p0);
      c = q.newCurve;
    }
  });

  it("rejects dust, oversize, and sells past sold supply", () => {
    const c = emptyCurve();
    assert.equal(quoteBuy(c, 0.001).ok, false);
    assert.equal(quoteBuy(c, 80).ok, false);
    assert.equal(quoteSell(c, 1).ok, false);
  });

  it("starts with pump-style virtual reserves", () => {
    assert.equal(VIRTUAL_SOL, 30);
    assert.equal(VIRTUAL_TOKENS, 1_073_000_191);
    assert.equal(TOKEN_SUPPLY, 1_000_000_000);
    assert.equal(CURVE_SALE, 800_000_000);
  });
});

describe("fair launch book", () => {
  it("creates a free fair launch with no team allocation", () => {
    const book = emptyLaunchBook();
    const r = createCoin(book, { creator: A, name: "Neon Fox", symbol: "nFOX", blurb: "fair" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.coin.curve.tokensSold, 0);
    assert.equal(r.coin.holders[A], undefined);
    assert.equal(r.coin.devRewardsSol, 0);
  });

  it("credits the buyer and splits fees, then lets the creator withdraw", () => {
    const book = emptyLaunchBook();
    setOwnerWallet(book, OWN);
    const made = createCoin(book, { creator: A, name: "Neon Fox", symbol: "NFOX" });
    assert.ok(made.ok);
    if (!made.ok) return;
    const t0 = made.coin.createdAt + 70_000;
    const buy = buyCoin(book, { id: made.coin.id, owner: B, sol: 0.4, now: t0 });
    assert.equal(buy.ok, true);
    if (!buy.ok) return;
    assert.ok((buy.coin.holders[B]?.tokens || 0) > 0);
    assert.ok(buy.coin.devRewardsSol > 0);
    assert.ok(book.ownerEarningsSol > 0);
    const d = withdrawDev(book, { id: made.coin.id, owner: A });
    assert.equal(d.ok, true);
    if (!d.ok) return;
    assert.ok(d.sol > 0);
    assert.equal(made.coin.devRewardsSol, 0);
    const o = withdrawOwner(book, { owner: OWN });
    assert.equal(o.ok, true);
    if (!o.ok) return;
    assert.equal(book.ownerEarningsSol, 0);
  });

  it("blocks snipes over 1 SOL in the first minute and the 2% wallet cap", () => {
    const book = emptyLaunchBook();
    const made = createCoin(book, { creator: A, name: "Slow", symbol: "SLOW" });
    assert.ok(made.ok);
    if (!made.ok) return;
    const sniper = buyCoin(book, { id: made.coin.id, owner: B, sol: 2, now: made.coin.createdAt + 1_000 });
    assert.equal(sniper.ok, false);
    const ok = buyCoin(book, { id: made.coin.id, owner: B, sol: 0.5, now: made.coin.createdAt + 1_000 });
    assert.equal(ok.ok, true);
    const later = buyCoin(book, { id: made.coin.id, owner: B, sol: 40, now: made.coin.createdAt + 70_000 });
    assert.equal(later.ok, false);
    assert.equal(MAX_WALLET_BPS, 200);
  });

  it("round-trips a holder: sell returns SOL and does not mint extra tokens", () => {
    const book = emptyLaunchBook();
    const made = createCoin(book, { creator: A, name: "Loop", symbol: "LOOP" });
    assert.ok(made.ok);
    if (!made.ok) return;
    const t0 = made.coin.createdAt + 70_000;
    const buy = buyCoin(book, { id: made.coin.id, owner: B, sol: 0.4, now: t0 });
    assert.ok(buy.ok);
    if (!buy.ok) return;
    const tokens = buy.coin.holders[B].tokens;
    const sold = buy.coin.curve.tokensSold;
    const sell = sellCoin(book, { id: made.coin.id, owner: B, tokens, now: t0 + 1 });
    assert.equal(sell.ok, true);
    if (!sell.ok) return;
    assert.ok((sell.coin.holders[B].tokens || 0) < 1e-6);
    assert.ok(Math.abs(sell.coin.curve.tokensSold - (sold - tokens)) < 1e-6);
    assert.ok((sell.fill.sol || 0) > 0);
  });

  it("cannot sell more than the wallet holds, and stranger cannot drain creator rewards", () => {
    const book = emptyLaunchBook();
    const made = createCoin(book, { creator: A, name: "Lock", symbol: "LOCK" });
    assert.ok(made.ok);
    if (!made.ok) return;
    const t0 = made.coin.createdAt + 70_000;
    buyCoin(book, { id: made.coin.id, owner: B, sol: 1, now: t0 });
    const steal = sellCoin(book, { id: made.coin.id, owner: B, tokens: 1e18, now: t0 });
    assert.equal(steal.ok, false);
    const drain = withdrawDev(book, { id: made.coin.id, owner: B });
    assert.equal(drain.ok, false);
  });

  it("graduates once real SOL on the curve clears the threshold", () => {
    const book = emptyLaunchBook();
    const made = createCoin(book, { creator: A, name: "Grad", symbol: "GRAD" });
    assert.ok(made.ok);
    if (!made.ok) return;
    const now = made.coin.createdAt + 70_000;
    const buyers = Array.from({ length: 220 }, (_, i) =>
      `2${i.toString(36).padStart(31, "x")}`.slice(0, 32).replace(/[0lIO]/g, "2"),
    );
    for (let i = 0; i < buyers.length && made.coin.status === "curve"; i++) {
      buyCoin(book, { id: made.coin.id, owner: buyers[i], sol: 0.5, now: now + i * 1000 });
    }
    assert.equal(made.coin.status, "graduated");
    assert.ok(made.coin.pool && made.coin.pool.sol > 0 && made.coin.pool.tokens > 0);
    const after = buyCoin(book, { id: made.coin.id, owner: B, sol: 1, now: now + 99_000 });
    assert.equal(after.ok, false);
  });

  it("is deterministic: same buys produce the same tokens", () => {
    function run() {
      const book = emptyLaunchBook();
      const made = createCoin(book, { creator: A, name: "Det", symbol: "DET", now: 1_700_000_000_000 });
      if (!made.ok) throw new Error("create");
      const b = buyCoin(book, { id: made.coin.id, owner: B, sol: 0.4, now: 1_700_000_080_000 });
      if (!b.ok) throw new Error("buy");
      return b.fill.tokens;
    }
    assert.equal(run(), run());
  });
});
