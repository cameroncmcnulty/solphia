import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closePosition, openPaperBuy, tickPaper } from "../lib/paper/engine";
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
});
