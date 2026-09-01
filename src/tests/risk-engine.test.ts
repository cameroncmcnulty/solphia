import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFee, positionSizeUsd, scoreToken } from "../lib/risk/engine";
import { DEFAULT_SETTINGS } from "../lib/config";
import { blankSnapshot } from "../lib/feeds/normalize";
import type { TokenSnapshot } from "../lib/types";

function token(over: Partial<TokenSnapshot> = {}): TokenSnapshot {
  return blankSnapshot({
    mint: "So1phia1111111111111111111111111111111111111",
    name: "Test",
    symbol: "TEST",
    venue: "pumpfun",
    createdAt: Date.now() - 6 * 60 * 1000,
    priceUsd: 0.00012,
    marketCapUsd: 80_000,
    liquidityUsd: 45_000,
    volume1h: 60_000,
    uniqueTraders1h: 90,
    buys1h: 120,
    sells1h: 40,
    bondingProgress: 0.4,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    lpLockedOrBurned: true,
    top10HolderPct: 22,
    bundleRatio: 0.12,
    organicBuyRatio: 0.82,
    socials: { twitter: "https://x.com/x", telegram: "https://t.me/x", website: "https://x.com" },
    ...over,
  });
}

describe("risk engine", () => {
  it("scores a clean organic token in the A/S band", () => {
    const r = scoreToken(token());
    assert.equal(r.vetoed, false);
    assert.ok(r.score >= 78, `expected >=78 got ${r.score} ${r.summary}`);
    assert.ok(["A", "S"].includes(r.grade));
  });

  it("vetoes serial rug deployers and caps score at 12", () => {
    const r = scoreToken(
      token({
        deployerDeathRate: 0.92,
        deployerTokenCount: 12,
        freezeAuthorityRevoked: false,
      }),
    );
    assert.equal(r.vetoed, true);
    assert.ok(r.score <= 12);
    assert.ok(r.vetoReasons.length >= 1);
    assert.equal(r.allowedStrategies.length, 0);
  });

  it("caps unlocked LP after graduation", () => {
    const r = scoreToken(
      token({
        graduated: true,
        venue: "pumpswap",
        lpLockedOrBurned: false,
        bondingProgress: 1,
      }),
    );
    assert.ok(r.score <= 35);
    assert.ok(r.caps.some((c) => c.toLowerCase().includes("unlocked lp")));
  });

  it("allows migration snipe only near graduation with unique flow", () => {
    const r = scoreToken(
      token({
        bondingProgress: 0.9,
        graduated: false,
        uniqueTraders1h: 55,
        bundleRatio: 0.1,
        organicBuyRatio: 0.8,
        createdAt: Date.now() - 20 * 60 * 1000,
      }),
    );
    assert.ok(r.allowedStrategies.includes("migration_snipe"), r.summary);
  });

  it("blocks launch snipe on bundled fresh coins", () => {
    const r = scoreToken(
      token({
        createdAt: Date.now() - 60_000,
        uniqueTraders1h: 40,
        bundleRatio: 0.5,
        organicBuyRatio: 0.3,
      }),
    );
    assert.equal(r.allowedStrategies.includes("launch_snipe"), false);
  });

  it("sizes positions between 2% and 8% of equity", () => {
    const lo = positionSizeUsd(1000, 60, DEFAULT_SETTINGS);
    const hi = positionSizeUsd(1000, 100, DEFAULT_SETTINGS);
    assert.equal(lo, 20);
    assert.ok(hi <= 80);
    assert.equal(positionSizeUsd(1000, 40, DEFAULT_SETTINGS), 0);
  });

  it("charges 35 bps not the industry 100 bps", () => {
    assert.equal(applyFee(1000, 35), 3.5);
    assert.equal(applyFee(1000, 100), 10);
  });
});
