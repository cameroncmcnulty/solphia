import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blankSnapshot } from "../lib/feeds/normalize";
import { DEFAULT_SETTINGS } from "../lib/config";
import { emptyState } from "../lib/store";
import { scoreToken } from "../lib/risk/engine";
import { graduationRead, armLaunch, armMigrate } from "../lib/desk/grad";
import { toxicFlow } from "../lib/desk/toxic";
import { copyDecision } from "../lib/desk/copyDecision";
import { policyCheck, type Intent } from "../lib/desk/intent";
import { applyShadow, emptyLab, sizeBudget } from "../lib/desk/shadow";
import { decide, riskVeto, scout } from "../lib/desk/consensus";
import { flattenNow } from "../lib/desk/rugClock";
import { execSize } from "../lib/desk/exec";
import { exitPlan } from "../lib/paper/exits";
import { tickPaper, openPaperBuy } from "../lib/paper/engine";
import type { PaperFill, TokenSnapshot } from "../lib/types";

function token(over: Partial<TokenSnapshot> = {}): TokenSnapshot {
  return blankSnapshot({
    mint: "So1phia1111111111111111111111111111111111111",
    name: "Test",
    symbol: "TEST",
    venue: "pumpfun",
    createdAt: Date.now() - 8 * 60 * 1000,
    priceUsd: 0.00012,
    marketCapUsd: 80_000,
    liquidityUsd: 45_000,
    volume1h: 60_000,
    uniqueTraders1h: 90,
    buys1h: 80,
    sells1h: 30,
    bondingProgress: 0.45,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    lpLockedOrBurned: true,
    top10HolderPct: 22,
    bundleRatio: 0.12,
    organicBuyRatio: 0.82,
    socials: { twitter: "https://x.com/x", telegram: "https://t.me/x" },
    ...over,
  });
}

function buyIntent(over: Partial<Intent> = {}): Intent {
  return {
    kind: "buy",
    mint: "So1phia1111111111111111111111111111111111111",
    symbol: "TEST",
    strategy: "copy_trade",
    sizeUsd: 40,
    maxSlipBps: 45,
    expiresAt: Date.now() + 4000,
    reason: "test",
    scout: "scout",
    risk: "allow",
    ...over,
  };
}

describe("P(grad) engine", () => {
  it("scores real SOL per unique buyer above bot-heavy churn", () => {
    const real = graduationRead(
      token({
        bondingProgress: 0.72,
        uniqueTraders1h: 28,
        bundleRatio: 0.08,
        organicBuyRatio: 0.9,
        deployerDeathRate: 0.15,
        createdAt: Date.now() - 9 * 60 * 1000,
      }),
    );
    const bots = graduationRead(
      token({
        bondingProgress: 0.72,
        uniqueTraders1h: 90,
        bundleRatio: 0.62,
        organicBuyRatio: 0.2,
        deployerDeathRate: 0.8,
        socials: {},
        uniqueEstimated: true,
        createdAt: Date.now() - 40 * 60 * 1000,
      }),
    );
    assert.ok(real.p > bots.p, `real ${real.p} vs bots ${bots.p}`);
    assert.ok(real.p >= 0.42, `expected armable, got ${real.p}`);
    assert.equal(armLaunch(bots), false);
  });

  it("does not arm launch on a 90-second coin even with flow", () => {
    const g = graduationRead(token({ createdAt: Date.now() - 90_000, uniqueTraders1h: 80, bondingProgress: 0.4 }));
    assert.equal(armLaunch(g), false);
  });

  it("arms migrate on a filled curve even if p is middling", () => {
    const g = graduationRead(token({ bondingProgress: 0.91, uniqueTraders1h: 55 }));
    assert.equal(armMigrate(g, 0.91), true);
  });

  it("uses a Telegram URL as a P(grad) feature, not a mention count", () => {
    const withTg = graduationRead(token({ socials: { telegram: "https://t.me/realroom" }, uniqueTraders1h: 28, bondingProgress: 0.5 }));
    const mentions = graduationRead(token({ socials: {}, uniqueTraders1h: 28, bondingProgress: 0.5, replyCount: 400 }));
    assert.ok(withTg.telegram);
    assert.equal(mentions.telegram, false);
    assert.ok(withTg.p > mentions.p, `telegram ${withTg.p} vs mentions ${mentions.p}`);
  });

  it("puts P(grad) on the risk report and withholds launch without the bar", () => {
    const young = scoreToken(token({ createdAt: Date.now() - 90_000, bondingProgress: 0.4, uniqueTraders1h: 80 }));
    assert.ok(typeof young.pGrad === "number");
    assert.equal(young.allowedStrategies.includes("launch_snipe"), false);
  });
});

describe("toxic flow", () => {
  it("stands down when the tape is churn, not buyers", () => {
    const t = toxicFlow(token({ uniqueTraders1h: 8, txns1h: 90, buys1h: 50, sells1h: 40 }));
    assert.equal(t.toxic, true);
  });

  it("lets organic unique flow through", () => {
    const t = toxicFlow(token());
    assert.equal(t.toxic, false);
  });
});

describe("copy the decision", () => {
  it("fades first-block bundle access we do not have", () => {
    const d = copyDecision(
      token({
        smartMoneyInflow: true,
        createdAt: Date.now() - 60_000,
        bundleRatio: 0.28,
        uniqueTraders1h: 8,
      }),
    );
    assert.equal(d.ok, false);
    assert.equal(d.fade, true);
  });

  it("copies a follower-visible setup", () => {
    const d = copyDecision(
      token({
        smartMoneyInflow: true,
        copiedBy: ["Cented"],
        createdAt: Date.now() - 12 * 60 * 1000,
        uniqueTraders1h: 40,
        bondingProgress: 0.5,
        bundleRatio: 0.1,
      }),
    );
    assert.equal(d.ok, true);
  });
});

describe("intent → policy", () => {
  it("refuses a live mint authority after graduation", () => {
    const state = emptyState();
    const r = policyCheck(buyIntent(), {
      book: state.paper,
      settings: state.settings,
      token: token({
        venue: "pumpswap",
        graduated: true,
        bondingProgress: 1,
        mintAuthorityRevoked: false,
      }),
      now: Date.now(),
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /mint/i);
  });

  it("does not treat Pump mint-authority as a rug before graduation", () => {
    const state = emptyState();
    const r = policyCheck(buyIntent(), {
      book: state.paper,
      settings: state.settings,
      token: token({ venue: "pumpfun", graduated: false, mintAuthorityRevoked: false }),
      now: Date.now(),
    });
    assert.equal(r.ok, true, r.reason);
  });

  it("refuses an expired intent", () => {
    const state = emptyState();
    const r = policyCheck(buyIntent({ expiresAt: Date.now() - 1 }), {
      book: state.paper,
      settings: state.settings,
      token: token(),
      now: Date.now(),
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /expired/i);
  });

  it("refuses size over the book cap", () => {
    const state = emptyState();
    const r = policyCheck(buyIntent({ sizeUsd: 500 }), {
      book: state.paper,
      settings: state.settings,
      token: token(),
      now: Date.now(),
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /size/i);
  });
});

describe("scout / risk consensus", () => {
  it("needs scout and risk to agree", () => {
    const now = Date.now();
    const copied = token({
      smartMoneyInflow: true,
      copiedBy: ["Cented"],
      createdAt: now - 15 * 60 * 1000,
      graduated: true,
      bondingProgress: 1,
      venue: "pumpswap",
    });
    const report = scoreToken(copied, now);
    const hit = scout({
      token: copied,
      report,
      desks: { copy: true, launch: false, migrate: false, scalp: false },
      now,
      settings: DEFAULT_SETTINGS,
    });
    assert.ok(hit);
    assert.equal(hit!.strategy, "copy_trade");
    const risk = riskVeto({ hit: hit!, now, settings: DEFAULT_SETTINGS });
    assert.equal(risk.ok, true);
  });

  it("risk vetoes toxic tape even if scout liked the copy", () => {
    const now = Date.now();
    const ugly = token({
      smartMoneyInflow: true,
      copiedBy: ["Cented"],
      createdAt: now - 15 * 60 * 1000,
      uniqueTraders1h: 6,
      txns1h: 90,
      buys1h: 48,
      sells1h: 42,
      graduated: true,
      bondingProgress: 1,
      venue: "pumpswap",
    });
    const report = scoreToken(ugly, now);
    const hit = scout({
      token: ugly,
      report,
      desks: { copy: true, launch: false, migrate: false, scalp: false },
      now,
      settings: DEFAULT_SETTINGS,
    });
    if (!hit) return;
    const risk = riskVeto({ hit, now, settings: DEFAULT_SETTINGS });
    assert.equal(risk.ok, false);
  });
});

describe("exec size budget", () => {
  it("gives copy full size and launch a probe until promoted", () => {
    const lab = emptyLab();
    assert.equal(sizeBudget(lab.copy, 80, false), 80);
    assert.equal(sizeBudget(lab.launch, 80, false), 20);
    assert.equal(sizeBudget(lab.launch, 80, true), 0);
    lab.launch.demoted = true;
    assert.equal(sizeBudget(lab.launch, 80, false), 0);
    const probe = execSize({ strategy: "launch_snipe", baseUsd: 80, lab, live: false });
    assert.equal(probe.ok, false);
  });
});

describe("shadow promote / demote", () => {
  it("demotes a desk that burns 15% of start", () => {
    const lab = emptyLab();
    const fill: PaperFill = {
      id: "s",
      mint: "x".repeat(44),
      symbol: "X",
      name: "X",
      strategy: "launch_snipe",
      side: "sell",
      at: Date.now(),
      priceUsd: 1,
      qty: 1,
      sizeUsd: 1,
      feeUsd: 0,
      slippageUsd: 0,
      pnlUsd: -160,
      reason: "stop-loss",
      riskScore: 70,
      venue: "pumpfun",
    };
    applyShadow(lab, fill, 1000);
    assert.equal(lab.launch.demoted, true);
    assert.equal(lab.launch.enabled, false);
  });

  it("promotes launch after two green days and five winning trades", () => {
    const lab = emptyLab();
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      applyShadow(
        lab,
        {
          id: `s${i}`,
          mint: "x".repeat(44),
          symbol: "X",
          name: "X",
          strategy: "launch_snipe",
          side: "sell",
          at: now,
          priceUsd: 1,
          qty: 1,
          sizeUsd: 1,
          feeUsd: 0,
          slippageUsd: 0,
          pnlUsd: 12,
          reason: "take-profit-2x",
          riskScore: 80,
          venue: "pumpfun",
        },
        1000,
        now - (i < 3 ? 2 * 86400000 : 0),
      );
    }
    assert.ok(lab.launch.trades >= 5);
    assert.ok(lab.launch.shadowPnlUsd > 0);
  });
});

describe("rug clock + exit machine", () => {
  it("flattens on creator dump without inventing same-block edges", () => {
    const f = flattenNow(token({ devSoldPct: 0.4 }));
    assert.equal(f.flatten, true);
  });

  it("flattens when bundle share jumps on the next tick", () => {
    const prev = { bonding: 0.4, bundle: 0.08, pGrad: 0.4, at: Date.now() - 20_000 };
    const f = flattenNow(token({ bundleRatio: 0.28 }), prev);
    assert.equal(f.flatten, true);
    assert.equal(f.reason, "bundle-woke");
  });

  it("flattens a creator spraying three names in twenty minutes", () => {
    const f = flattenNow(token({ creatorRecentLaunches: 3 }));
    assert.equal(f.reason, "creator-spray");
  });

  it("kills 25% off the local high when underwater", () => {
    const state = emptyState();
    const t = token({
      smartMoneyInflow: true,
      copiedBy: ["Decu"],
      priceUsd: 1,
      venue: "pumpswap",
      graduated: true,
      bondingProgress: 1,
    });
    const fill = openPaperBuy({ state, token: t, strategy: "copy_trade", score: 80, reason: "copy" });
    assert.ok(fill);
    const pos = state.paper.positions[0];
    pos.trailPeakUsd = 2;
    pos.markUsd = 1.4;
    pos.entryUsd = 1.8;
    const plan = exitPlan(pos, t, 70, state.settings, Date.now());
    assert.equal(plan?.reason, "kill-from-high");
  });

  it("scales 25% at 1.5x", () => {
    const state = emptyState();
    const t = token({
      smartMoneyInflow: true,
      copiedBy: ["Decu"],
      priceUsd: 1,
      venue: "pumpswap",
      graduated: true,
      bondingProgress: 1,
    });
    openPaperBuy({ state, token: t, strategy: "copy_trade", score: 80, reason: "copy" });
    const pos = state.paper.positions[0];
    pos.markUsd = pos.entryUsd * 1.55;
    const plan = exitPlan(pos, t, 80, state.settings, Date.now());
    assert.equal(plan?.reason, "take-profit-1.5x");
    assert.ok((plan?.fraction || 0) > 0.2 && (plan?.fraction || 0) < 0.3);
  });
});

describe("tick refuses more than it fires", () => {
  it("does not copy a first-block bundle", () => {
    const state = emptyState();
    const t = token({
      mint: "Fade111111111111111111111111111111111111111",
      symbol: "FADE",
      smartMoneyInflow: true,
      copiedBy: ["Cented"],
      createdAt: Date.now() - 50_000,
      bundleRatio: 0.3,
      uniqueTraders1h: 8,
      venue: "pumpfun",
      bondingProgress: 0.05,
      priceUsd: 0.001,
    });
    const { entries, alerts } = tickPaper(state, [t], Date.now(), {
      copy: true,
      launch: false,
      migrate: false,
      scalp: false,
    });
    assert.equal(entries.length, 0);
    assert.ok(alerts.some((a) => a.kind === "deny" || a.kind === "bundle"));
    assert.ok(state.lab.copy.denied >= 1);
  });

  it("does not snipe a 90-second coin even with launch desk on", () => {
    const state = emptyState();
    const t = token({
      mint: "New1111111111111111111111111111111111111111",
      symbol: "NEW",
      createdAt: Date.now() - 90_000,
      bondingProgress: 0.12,
      uniqueTraders1h: 70,
      priceUsd: 0.0002,
    });
    const { entries } = tickPaper(state, [t], Date.now(), {
      copy: false,
      launch: true,
      migrate: false,
      scalp: false,
    });
    assert.equal(entries.length, 0);
    assert.equal(state.paper.positions.length, 0);
  });

  it("still copies a follower-visible leader buy", () => {
    const state = emptyState();
    const t = token({
      mint: "Copy111111111111111111111111111111111111111",
      symbol: "COPY",
      name: "Copy",
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
      smartMoneyInflow: true,
      copiedBy: ["Cented"],
    });
    const { entries } = tickPaper(state, [t], Date.now(), {
      copy: true,
      launch: false,
      migrate: false,
      scalp: false,
    });
    assert.ok(entries.length >= 1);
    assert.equal(entries[0].strategy, "copy_trade");
  });
});

describe("decide is policy-gated", () => {
  it("returns an intent only after scout, risk, and policy clear", () => {
    const state = emptyState();
    const now = Date.now();
    const t = token({
      smartMoneyInflow: true,
      copiedBy: ["Cented"],
      createdAt: now - 20 * 60 * 1000,
      graduated: true,
      bondingProgress: 1,
      venue: "pumpswap",
      priceUsd: 0.02,
    });
    const report = scoreToken(t, now);
    const d = decide({
      token: t,
      report,
      desks: { copy: true, launch: false, migrate: false, scalp: false },
      now,
      settings: state.settings,
      book: state.paper,
      sizeUsd: 40,
      lab: state.lab,
    });
    assert.equal(d.ok, true);
    if (d.ok) {
      assert.equal(d.intent.kind, "buy");
      assert.ok(d.intent.expiresAt > now);
    }
  });
});
