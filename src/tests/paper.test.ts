import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closePartial, closePosition, openPaperBuy, tickPaper } from "../lib/paper/engine";
import { tokenPriceUsd } from "../lib/paper/price";
import { emptyState } from "../lib/store";
import { blankSnapshot } from "../lib/feeds/normalize";
import { applyFee } from "../lib/risk/engine";

describe("paper engine", () => {
  it("opens a buy, marks a winner, and nets fees plus slippage", () => {
    const state = emptyState();
    const token = blankSnapshot({
      mint: "Mint111111111111111111111111111111111111111",
      name: "Winner",
      symbol: "WIN",
      venue: "pumpswap",
      priceUsd: 1,
      marketCapUsd: 120_000,
      liquidityUsd: 50_000,
      uniqueTraders1h: 100,
      volume1h: 80_000,
      buys1h: 90,
      sells1h: 20,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      lpLockedOrBurned: true,
      bundleRatio: 0.1,
      organicBuyRatio: 0.85,
      bondingProgress: 1,
      graduated: true,
      createdAt: Date.now() - 20 * 60 * 1000,
      socials: { twitter: "x", telegram: "t", website: "w" },
    });
    const fill = openPaperBuy({
      state,
      token,
      strategy: "scalp",
      score: 82,
      reason: "test",
    });
    assert.ok(fill);
    assert.equal(state.paper.positions.length, 1);
    assert.ok(state.paper.cashUsd < 1000);
    assert.ok(fill!.feeUsd > 0);
    const pos = state.paper.positions[0];
    const exit = closePosition({ state, pos, price: 1.5, reason: "test-tp" });
    assert.ok((exit.pnlUsd || 0) > 0);
    assert.ok((exit.pnlPct || 0) < 0.5, "fees/slippage must drag PnL under raw 50%");
    assert.equal(state.paper.positions.length, 0);
    assert.equal(state.paper.winCount, 1);
  });

  it("refuses a second position in the same mint", () => {
    const state = emptyState();
    const token = blankSnapshot({
      mint: "Same111111111111111111111111111111111111111",
      name: "Same",
      symbol: "SAME",
      priceUsd: 1,
      marketCapUsd: 80_000,
    });
    const a = openPaperBuy({ state, token, strategy: "scalp", score: 80, reason: "a" });
    const b = openPaperBuy({ state, token, strategy: "scalp", score: 80, reason: "b" });
    assert.ok(a);
    assert.equal(b, null);
  });

  it("auto-skips vetoed rugs on a tick", () => {
    const state = emptyState();
    const rug = blankSnapshot({
      mint: "Rug1111111111111111111111111111111111111111",
      name: "Rug",
      symbol: "RUG",
      priceUsd: 1,
      marketCapUsd: 90_000,
      uniqueTraders1h: 200,
      volume1h: 100_000,
      banned: true,
      deployerDeathRate: 0.95,
      deployerTokenCount: 20,
    });
    const { entries } = tickPaper(state, [rug]);
    assert.equal(entries.length, 0);
    assert.equal(state.paper.positions.length, 0);
    assert.equal(state.paper.equityUsd, 1000);
  });

  it("keeps the 0.35% fee invariant on notional", () => {
    assert.equal(applyFee(250, 35), 0.875);
  });

  it("does not invent a Raydium price from a 1B supply guess", () => {
    assert.equal(tokenPriceUsd(blankSnapshot({ mint: "x".repeat(44), name: "T", symbol: "T", venue: "raydium", marketCapUsd: 1_000_000 })), 0);
    assert.ok(tokenPriceUsd(blankSnapshot({ mint: `${"p".repeat(40)}pump`, name: "P", symbol: "P", venue: "pumpfun", marketCapUsd: 1_000_000 })) > 0);
  });

  it("demo desks only copy coins a followed wallet is actually in", () => {
    const state = emptyState();
    const random = blankSnapshot({
      mint: "Rand111111111111111111111111111111111111111",
      name: "Random",
      symbol: "RND",
      venue: "pumpswap",
      priceUsd: 0.02,
      marketCapUsd: 80_000,
      liquidityUsd: 50_000,
      uniqueTraders1h: 120,
      volume1h: 90_000,
      buys1h: 100,
      sells1h: 20,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      lpLockedOrBurned: true,
      organicBuyRatio: 0.9,
      bundleRatio: 0.1,
      bondingProgress: 1,
      graduated: true,
      createdAt: Date.now() - 20 * 60 * 1000,
    });
    const copied = blankSnapshot({
      ...random,
      mint: "Copy111111111111111111111111111111111111111",
      symbol: "COPY",
      name: "Copy",
      smartMoneyInflow: true,
      copiedBy: ["Cented"],
    });
    const { entries } = tickPaper(state, [random, copied], Date.now(), {
      copy: true,
      launch: false,
      migrate: false,
      scalp: false,
    });
    assert.ok(entries.length >= 1);
    assert.ok(entries.every((e) => e.strategy === "copy_trade"));
    assert.ok(entries.every((e) => e.mint === copied.mint));
  });

  it("writes off a copied coin that disappears from the book", () => {
    const state = emptyState();
    const token = blankSnapshot({
      mint: "Dead111111111111111111111111111111111111111",
      name: "Dead",
      symbol: "DEAD",
      venue: "pumpfun",
      priceUsd: 0.001,
      marketCapUsd: 40_000,
      liquidityUsd: 12_000,
      uniqueTraders1h: 40,
      volume1h: 20_000,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      smartMoneyInflow: true,
      copiedBy: ["Decu"],
    });
    const fill = openPaperBuy({ state, token, strategy: "copy_trade", score: 72, reason: "copy Decu" });
    assert.ok(fill);
    const openedAt = Date.now() - 120_000;
    state.paper.positions[0].openedAt = openedAt;
    const { exits } = tickPaper(state, [], Date.now(), { copy: true, launch: false, migrate: false, scalp: false });
    assert.equal(exits.length, 1);
    assert.equal(exits[0].reason, "illiquid");
    assert.ok((exits[0].pnlUsd || 0) < 0);
    assert.equal(state.paper.positions.length, 0);
  });

  it("scales out half at 2x and leaves a trailing remainder", () => {
    const state = emptyState();
    const token = blankSnapshot({
      mint: "Moon111111111111111111111111111111111111111",
      name: "Moon",
      symbol: "MOON",
      venue: "pumpswap",
      priceUsd: 1,
      marketCapUsd: 80_000,
      liquidityUsd: 40_000,
      uniqueTraders1h: 80,
      volume1h: 50_000,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      lpLockedOrBurned: true,
      smartMoneyInflow: true,
      copiedBy: ["Decu"],
    });
    const fill = openPaperBuy({ state, token, strategy: "copy_trade", score: 80, reason: "copy Decu" });
    assert.ok(fill);
    const pos = state.paper.positions[0];
    const qty0 = pos.qty;
    const sold = closePartial({ state, pos, price: 2.2, fraction: 0.5, reason: "take-profit-2x" });
    assert.ok((sold.pnlUsd || 0) > 0);
    assert.equal(state.paper.positions.length, 1);
    assert.ok(state.paper.positions[0].qty < qty0);
    assert.ok(state.paper.positions[0].trailArmed);
  });

  it("turns her off after the daily loss cap", () => {
    const state = emptyState();
    state.paper.fills.push({
      id: "loss",
      mint: "x".repeat(44),
      symbol: "X",
      name: "X",
      strategy: "copy_trade",
      side: "sell",
      at: Date.now(),
      priceUsd: 1,
      qty: 1,
      sizeUsd: 1,
      feeUsd: 0,
      slippageUsd: 0,
      pnlUsd: -150,
      reason: "stop-loss",
      riskScore: 70,
      venue: "pumpfun",
    });
    const token = blankSnapshot({
      mint: "Copy111111111111111111111111111111111111111",
      name: "Copy",
      symbol: "COPY",
      venue: "pumpswap",
      priceUsd: 0.02,
      marketCapUsd: 80_000,
      liquidityUsd: 50_000,
      uniqueTraders1h: 120,
      volume1h: 90_000,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      lpLockedOrBurned: true,
      smartMoneyInflow: true,
      copiedBy: ["Cented"],
    });
    const { entries, alerts } = tickPaper(state, [token], Date.now(), {
      copy: true,
      launch: false,
      migrate: false,
      scalp: false,
    });
    assert.equal(entries.length, 0);
    assert.ok(alerts.some((a) => a.kind === "halt"));
    assert.ok((state.paper.haltedUntil || 0) > Date.now());
  });

  it("scales 25% at 1.5x on the next tick", () => {
    const state = emptyState();
    const token = blankSnapshot({
      mint: "Moon111111111111111111111111111111111111111",
      name: "Moon",
      symbol: "MOON",
      venue: "pumpswap",
      priceUsd: 1,
      marketCapUsd: 80_000,
      liquidityUsd: 40_000,
      uniqueTraders1h: 80,
      volume1h: 50_000,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      lpLockedOrBurned: true,
      smartMoneyInflow: true,
      copiedBy: ["Decu"],
      graduated: true,
      bondingProgress: 1,
    });
    openPaperBuy({ state, token, strategy: "copy_trade", score: 80, reason: "copy Decu" });
    const live = { ...token, priceUsd: 1.6 };
    const { exits } = tickPaper(state, [live], Date.now(), { copy: true, launch: false, migrate: false, scalp: false });
    assert.ok(exits.some((e) => e.reason === "take-profit-1.5x"));
    assert.equal(state.paper.positions.length, 1);
    assert.ok((state.paper.positions[0].scaledOut || 0) >= 0.24);
  });
});
