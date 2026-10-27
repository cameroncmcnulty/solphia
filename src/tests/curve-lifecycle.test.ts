import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CURVE_SALE,
  GRADUATE_SOL,
  K,
  LP_RESERVE,
  MAX_WALLET_BPS,
  MIN_TRADE_SOL,
  SWAP_FEE_BPS,
  TOKEN_SUPPLY,
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  curveSaleCap,
  emptyCurve,
  feeOn,
  graduatePool,
  progressPct,
  quoteBuy,
  quoteSell,
  splitFee,
  spotPriceSol,
} from "../lib/launch/curve";
import { buyCoin, createCoin, emptyLaunchBook, sellCoin } from "../lib/launch/engine";
import { dbcEnabled, liveDbcConfig, PAD_DBC_CONFIG } from "../lib/launch/dbcIds";

const A = "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o";
const B = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";

function kOf(c: { virtualSol: number; virtualTokens: number }) {
  return c.virtualSol * c.virtualTokens;
}

describe("bonding curve lifecycle", () => {
  it("opens as a constant-product virtual AMM with 1B supply and 800M on the curve", () => {
    const c = emptyCurve();
    assert.equal(c.phase, "curve");
    assert.equal(c.realSol, 0);
    assert.equal(c.tokensSold, 0);
    assert.equal(c.virtualSol, VIRTUAL_SOL);
    assert.equal(c.virtualTokens, VIRTUAL_TOKENS);
    assert.ok(Math.abs(kOf(c) - K) / K < 1e-12);
    assert.equal(TOKEN_SUPPLY, 1_000_000_000);
    assert.equal(CURVE_SALE, 800_000_000);
    assert.equal(LP_RESERVE, 200_000_000);
    assert.equal(curveSaleCap(c), CURVE_SALE);
    assert.equal(progressPct(c), 0);
    const openFdv = spotPriceSol(c) * TOKEN_SUPPLY;
    assert.ok(openFdv > 27 && openFdv < 29, `open FDV should be ~28 SOL, got ${openFdv}`);
  });

  it("takes 1% on a buy, holds k, and raises price", () => {
    const c0 = emptyCurve();
    const p0 = spotPriceSol(c0);
    const q = quoteBuy(c0, 1);
    assert.equal(q.ok, true);
    if (!q.ok) return;
    assert.equal(q.feeSol, 0.01);
    assert.equal(feeOn(1), 0.01);
    const split = splitFee(q.feeSol);
    assert.equal(split.dev, 0.005);
    assert.equal(split.owner, 0.0025);
    assert.equal(split.treasury, 0.0025);
    assert.ok((q.tokensOut || 0) > 30_000_000);
    assert.ok((q.tokensOut || 0) < 40_000_000);
    assert.ok(Math.abs(kOf(q.newCurve) - K) / K < 1e-9);
    assert.ok(spotPriceSol(q.newCurve) > p0);
    assert.ok(q.newCurve.realSol > 0.98 && q.newCurve.realSol < 0.991);
  });

  it("buy then full sell returns less SOL than paid, never fabricates SOL, and restores k", () => {
    const buy = quoteBuy(emptyCurve(), 0.5);
    assert.equal(buy.ok, true);
    if (!buy.ok) return;
    const sell = quoteSell(buy.newCurve, buy.tokensOut || 0);
    assert.equal(sell.ok, true);
    if (!sell.ok) return;
    assert.ok((sell.solOut || 0) < 0.5);
    assert.ok((sell.solOut || 0) > 0.5 - buy.feeSol - sell.feeSol - 0.02);
    assert.ok(sell.newCurve.realSol >= -1e-9);
    assert.ok(Math.abs(kOf(sell.newCurve) - K) / K < 1e-8);
  });

  it("graduates at 85 SOL of net curve SOL, then keeps buying and selling on the same curve", () => {
    const book = emptyLaunchBook();
    const made = createCoin(book, { creator: A, name: "Life", symbol: "LIFE" });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    const now = made.coin.createdAt + 70_000;
    const buyers = Array.from({ length: 240 }, (_, i) =>
      `2${i.toString(36).padStart(31, "x")}`.slice(0, 32).replace(/[0lIO]/g, "2"),
    );
    let lastOk = true;
    for (let i = 0; i < buyers.length && made.coin.status === "curve"; i++) {
      const r = buyCoin(book, { id: made.coin.id, owner: buyers[i], sol: 0.5, now: now + i * 1000 });
      lastOk = r.ok;
      if (!r.ok) break;
    }
    assert.equal(lastOk, true);
    assert.equal(made.coin.status, "graduated");
    assert.equal(made.coin.curve.phase, "graduated");
    assert.ok(made.coin.curve.realSol >= GRADUATE_SOL);
    assert.ok(progressPct(made.coin.curve) >= 1);
    assert.equal(curveSaleCap(made.coin.curve), TOKEN_SUPPLY);
    const pool = graduatePool(made.coin.curve);
    assert.ok(pool);
    if (!pool) return;
    assert.ok(pool.sol > 80);
    assert.ok(pool.tokens > 150_000_000);
    assert.ok(made.coin.curve.tokensSold < CURVE_SALE + 1);
    const afterBuy = buyCoin(book, { id: made.coin.id, owner: B, sol: 1, now: now + 400_000 });
    assert.equal(afterBuy.ok, true);
    if (!afterBuy.ok) return;
    assert.ok(afterBuy.fill.tokens > 0);
    assert.equal(afterBuy.coin.curve.phase, "graduated");
    const afterSell = sellCoin(book, { id: made.coin.id, owner: B, tokens: afterBuy.fill.tokens, now: now + 401_000 });
    assert.equal(afterSell.ok, true);
    if (!afterSell.ok) return;
    assert.ok(afterSell.fill.sol > 0);
    assert.equal(afterSell.coin.curve.phase, "graduated");
    const walletCap = (TOKEN_SUPPLY * MAX_WALLET_BPS) / 10_000;
    assert.equal(walletCap, 50_000_000);
  });

  it("rejects dust and keeps the first-minute 1 SOL sniper cap", () => {
    assert.equal(quoteBuy(emptyCurve(), MIN_TRADE_SOL - 0.001).ok, false);
    const book = emptyLaunchBook();
    const made = createCoin(book, { creator: A, name: "Snipe", symbol: "SNP" });
    assert.equal(made.ok, true);
    if (!made.ok) return;
    const snipe = buyCoin(book, { id: made.coin.id, owner: B, sol: 1.01, now: made.coin.createdAt + 1_000 });
    assert.equal(snipe.ok, false);
    if (!snipe.ok) assert.equal(snipe.error, "anti_snipe");
    const ok = buyCoin(book, { id: made.coin.id, owner: B, sol: 1, now: made.coin.createdAt + 1_000 });
    assert.equal(ok.ok, true);
  });
});

describe("live DBC pad after the curve", () => {
  it("pins the shared SPL config and migrates to DAMM v2 at 585 SOL FDV with 1% forever", () => {
    assert.equal(dbcEnabled(), true);
    assert.equal(liveDbcConfig(), PAD_DBC_CONFIG);
    assert.equal(PAD_DBC_CONFIG, "HqT26zWiJmoDfgjDNbKCh1bQRe8w7RhJetnNXMRSKH3h");
    const dbc = readFileSync(path.join(process.cwd(), "src/lib/launch/dbc.ts"), "utf8");
    assert.match(dbc, /initialMarketCap: 40/);
    assert.match(dbc, /migrationMarketCap: 585/);
    assert.match(dbc, /MigrationOption\.MET_DAMM_V2/);
    assert.match(dbc, /MigrationFeeOption\.FixedBps100/);
    assert.match(dbc, /startingFeeBps: 100/);
    assert.match(dbc, /endingFeeBps: 100/);
    assert.match(dbc, /creatorTradingFeePercentage: 50/);
    assert.match(dbc, /partnerPermanentLockedLiquidityPercentage: 100/);
    assert.match(dbc, /leftover: 0/);
    assert.match(dbc, /totalTokenSupply: 1_000_000_000/);
    const pad = readFileSync(path.join(process.cwd(), "src/lib/swap/pad.ts"), "utf8");
    assert.match(pad, /quoteDbcTrade/);
    assert.match(pad, /buildDbcTradeTx/);
    const ids = readFileSync(path.join(process.cwd(), "src/lib/launch/dbcIds.ts"), "utf8");
    assert.match(ids, /export const DBC_LIVE = true/);
    assert.match(ids, /function liveDbcConfig/);
    assert.equal(ids.includes("return _bookConfig"), false);
  });

  it("keeps the 1% fee constant on the in-house split after graduate", () => {
    assert.equal(SWAP_FEE_BPS, 100);
    const fee = feeOn(2);
    const plain = splitFee(fee, false);
    assert.equal(plain.dev + plain.owner + plain.treasury + plain.referral, fee);
    const referred = splitFee(fee, true);
    assert.equal(referred.dev, plain.dev);
    assert.equal(referred.treasury, plain.treasury);
    assert.equal(referred.owner + referred.referral, plain.owner);
    assert.ok(referred.referral > 0);
  });
});
