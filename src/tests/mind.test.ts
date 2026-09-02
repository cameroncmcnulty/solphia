import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blankSnapshot } from "../lib/feeds/normalize";
import { emptyState } from "../lib/store";
import { scoreToken } from "../lib/risk/engine";
import { extractFeatures, hardPickGates } from "../lib/mind/features";
import { emptyMind, learnFromFill, noteOpen, pPay, scorePick } from "../lib/mind/engine";
import { tickPaper } from "../lib/paper/engine";
import type { TokenSnapshot } from "../lib/types";

function elite(over: Partial<TokenSnapshot> = {}): TokenSnapshot {
  return blankSnapshot({
    mint: "Pick111111111111111111111111111111111111111",
    name: "Pick",
    symbol: "PICK",
    venue: "pumpfun",
    createdAt: Date.now() - 12 * 60 * 1000,
    priceUsd: 0.0002,
    marketCapUsd: 90_000,
    liquidityUsd: 48_000,
    volume1h: 70_000,
    uniqueTraders1h: 62,
    buys1h: 55,
    sells1h: 22,
    bondingProgress: 0.76,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    lpLockedOrBurned: true,
    top10HolderPct: 21,
    bundleRatio: 0.08,
    organicBuyRatio: 0.9,
    deployerDeathRate: 0.12,
    deployerTokenCount: 1,
    socials: { telegram: "https://t.me/realroom", twitter: "https://x.com/realroom" },
    ...over,
  });
}

describe("Solphia Picks mind", () => {
  it("refuses a 90-second coin even if the tape looks busy", () => {
    const t = elite({ createdAt: Date.now() - 90_000, uniqueTraders1h: 80 });
    const g = hardPickGates(t, 88);
    assert.equal(g.ok, false);
    assert.match(g.reason, /5 minutes|sniper/i);
  });

  it("requires a Telegram URL — mention count is not a substitute", () => {
    const t = elite({ socials: {}, replyCount: 900 });
    const g = hardPickGates(t, 88);
    assert.equal(g.ok, false);
    assert.match(g.reason, /Telegram/i);
  });

  it("stands down on bot-heavy flow", () => {
    const t = elite({ bundleRatio: 0.4, organicBuyRatio: 0.2 });
    const g = hardPickGates(t, 88);
    assert.equal(g.ok, false);
  });

  it("starts extremely picky: empty features and junk coins are a no", () => {
    const mind = emptyMind();
    assert.ok(pPay(mind, new Array(16).fill(0)) < mind.pickThreshold);
    const junk = blankSnapshot({
      mint: "Junk111111111111111111111111111111111111111",
      name: "Junk",
      symbol: "JNK",
      venue: "pumpfun",
      createdAt: Date.now() - 2 * 60 * 1000,
      uniqueTraders1h: 8,
      bondingProgress: 0.05,
      bundleRatio: 0.5,
      socials: {},
    });
    const pick = scorePick(mind, junk, 40);
    assert.equal(pick.ok, false);
  });

  it("can clear hard gates on a research-shaped setup", () => {
    const t = elite();
    const report = scoreToken(t);
    const g = hardPickGates(t, report.score);
    assert.equal(g.ok, true, `${g.ok ? "" : g.reason} score=${report.score} pGrad=${report.pGrad}`);
    const mind = emptyMind();
    const pick = scorePick(mind, t, report.score);
    assert.equal(pick.ok, true, pick.reason);
    assert.ok(pick.p >= mind.pickThreshold);
  });

  it("gets stricter after losing picks, not looser", () => {
    const mind = emptyMind();
    const start = mind.pickThreshold;
    const t = elite();
    const { x } = extractFeatures(t, Date.now(), 85);
    noteOpen(mind, t.mint, x, "solphia_pick");
    for (let i = 0; i < 8; i++) {
      noteOpen(mind, t.mint, x, "solphia_pick");
      learnFromFill(mind, t.mint, -0.2, "solphia_pick");
    }
    assert.ok(mind.pickThreshold >= start, `threshold ${mind.pickThreshold} vs ${start}`);
    assert.ok(mind.pickLosses >= 6);
  });

  it("does not fire picks on the copy-only demo desk", () => {
    const state = emptyState();
    const t = elite();
    const { entries } = tickPaper(state, [t], Date.now(), {
      copy: true,
      launch: false,
      migrate: false,
      scalp: false,
      picks: false,
    });
    assert.equal(entries.some((e) => e.strategy === "solphia_pick"), false);
  });

  it("still refuses a first-block bag even with picks armed", () => {
    const state = emptyState();
    const t = elite({
      createdAt: Date.now() - 40_000,
      bundleRatio: 0.3,
      uniqueTraders1h: 9,
      smartMoneyInflow: true,
      copiedBy: ["Cented"],
    });
    const { entries } = tickPaper(state, [t], Date.now(), {
      copy: true,
      launch: true,
      migrate: true,
      scalp: false,
      picks: true,
    });
    assert.equal(entries.length, 0);
  });

  it("can take a Pick when the desk is on and every gate clears", () => {
    const state = emptyState();
    const t = elite();
    const { entries } = tickPaper(state, [t], Date.now(), {
      copy: false,
      launch: false,
      migrate: false,
      scalp: false,
      picks: true,
    });
    assert.ok(entries.length <= 1);
    if (entries.length) assert.equal(entries[0].strategy, "solphia_pick");
  });
});
