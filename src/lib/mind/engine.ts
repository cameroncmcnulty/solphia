import type { EngineSettings, Mind, MindWatch, Strategy, TokenSnapshot } from "../types";
import { FEATURE_KEYS, PRIORS, extractFeatures, hardPickGates, type FeatureVec } from "./features";
import { DEFAULT_SETTINGS } from "../config";

const PICK_FLOOR = 0.7;
const PICK_CEIL = 0.92;
const START_THRESHOLD = 0.76;
const START_INTERCEPT = -6.35;

function sigmoid(z: number) {
  if (z > 16) return 1;
  if (z < -16) return 0;
  return 1 / (1 + Math.exp(-z));
}

export function emptyMind(): Mind {
  return {
    version: 1,
    studied: 0,
    closed: 0,
    pickWins: 0,
    pickLosses: 0,
    intercept: START_INTERCEPT,
    weights: { ...PRIORS },
    pickThreshold: START_THRESHOLD,
    bars: {
      minPGradLaunch: DEFAULT_SETTINGS.minPGradLaunch,
      minPGradMigrate: DEFAULT_SETTINGS.minPGradMigrate,
      minScoreCopy: DEFAULT_SETTINGS.minScoreCopy,
      minScorePick: DEFAULT_SETTINGS.minScorePick,
      bundleVeto: DEFAULT_SETTINGS.bundleVeto,
    },
    recentPickPnl: [],
    streak: {},
    open: {},
    watch: {},
  };
}

export function mergeMind(raw?: Partial<Mind>): Mind {
  const base = emptyMind();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    weights: { ...PRIORS, ...(raw.weights || {}) },
    bars: { ...base.bars, ...(raw.bars || {}) },
    recentPickPnl: Array.isArray(raw.recentPickPnl) ? raw.recentPickPnl.slice(-20) : [],
    streak: raw.streak || {},
    open: raw.open || {},
    watch: raw.watch || {},
  };
}

export function logit(mind: Mind, x: FeatureVec): number {
  let z = mind.intercept;
  for (let i = 0; i < FEATURE_KEYS.length; i++) {
    z += (mind.weights[FEATURE_KEYS[i]] ?? PRIORS[FEATURE_KEYS[i]]) * (x[i] || 0);
  }
  return z;
}

export function pPay(mind: Mind, x: FeatureVec): number {
  return Math.round(sigmoid(logit(mind, x)) * 1000) / 1000;
}

export type PickRead = {
  ok: boolean;
  p: number;
  reason: string;
  x: FeatureVec;
};

export function scorePick(mind: Mind, token: TokenSnapshot, safetyScore: number, now = Date.now()): PickRead {
  const { x } = extractFeatures(token, now, safetyScore);
  const gates = hardPickGates(token, safetyScore, now);
  const p = pPay(mind, x);
  if (!gates.ok) return { ok: false, p, reason: gates.reason, x };
  if (p < mind.pickThreshold) {
    return {
      ok: false,
      p,
      reason: `Learned P(pay) ${(p * 100).toFixed(0)}% under her ${(mind.pickThreshold * 100).toFixed(0)}% bar.`,
      x,
    };
  }
  return {
    ok: true,
    p,
    reason: `Pick · P(pay) ${(p * 100).toFixed(0)}% · ${gates.reason}`,
    x,
  };
}

function pullToPrior(w: number, prior: number) {
  const shrunk = 0.97 * w + 0.03 * prior;
  const lo = prior >= 0 ? prior * 0.25 : prior * 3;
  const hi = prior >= 0 ? prior * 3 : prior * 0.25;
  return Math.max(Math.min(shrunk, Math.max(lo, hi)), Math.min(lo, hi));
}

/** Online update. Tiny learning rate, shrink to research priors, never gets eager. */
export function learn(mind: Mind, x: FeatureVec, label: 0 | 1, weight = 1) {
  const p = pPay(mind, x);
  const n = Math.max(1, mind.closed);
  const lr = (0.016 * weight) / Math.sqrt(1 + n / 40);
  const err = label - p;
  mind.intercept += lr * err * 0.35;
  mind.intercept = Math.max(-8.2, Math.min(-3.8, mind.intercept));
  for (let i = 0; i < FEATURE_KEYS.length; i++) {
    const k = FEATURE_KEYS[i];
    const prior = PRIORS[k];
    const next = (mind.weights[k] ?? prior) + lr * err * (x[i] || 0);
    mind.weights[k] = pullToPrior(next, prior);
  }
  mind.studied += 1;
}

export function noteOpen(mind: Mind, mint: string, x: FeatureVec, strategy: Strategy) {
  mind.open[mint] = { x, strategy, at: Date.now() };
}

export function learnFromFill(
  mind: Mind,
  mint: string,
  pnlPct: number,
  strategy: string,
  features?: number[],
  complete = true,
) {
  const open = mind.open[mint];
  const x = features && features.length ? features : open?.x;
  const strat = strategy || open?.strategy || "copy_trade";
  if (complete) delete mind.open[mint];
  if (x && x.length) {
    const label: 0 | 1 = pnlPct > 0.005 ? 1 : 0;
    const weight = Math.min(2.2, 0.7 + Math.abs(pnlPct) * 5) * (complete ? 1 : 0.45);
    learn(mind, x, label, weight);
  }
  if (!complete) return;
  mind.closed += 1;
  if (!mind.streak) mind.streak = {};
  if (pnlPct <= 0) {
    mind.streak[strat] = (mind.streak[strat] || 0) + 1;
    tighten(mind, strat);
    if (mind.streak[strat] >= 3) tighten(mind, strat);
  } else {
    mind.streak[strat] = 0;
  }
  if (strat === "solphia_pick" || open?.strategy === "solphia_pick") {
    if (pnlPct > 0.005) mind.pickWins += 1;
    else mind.pickLosses += 1;
    mind.recentPickPnl = [...mind.recentPickPnl, pnlPct].slice(-20);
    retuneThreshold(mind);
  }
}

function retuneThreshold(mind: Mind) {
  const recent = mind.recentPickPnl;
  if (recent.length < 6) return;
  const exp = recent.reduce((s, n) => s + n, 0) / recent.length;
  // Only smarter. Losses raise the bar. Wins never lower it.
  if (exp < 0) mind.pickThreshold = Math.min(PICK_CEIL, mind.pickThreshold + 0.02);
}

function tighten(mind: Mind, strategy: string) {
  if (strategy === "sol_usd" || strategy === "scalp") return;
  if (strategy === "copy_trade") mind.bars.minScoreCopy = Math.min(88, mind.bars.minScoreCopy + 1);
  if (strategy === "launch_snipe") mind.bars.minPGradLaunch = Math.min(0.65, +(mind.bars.minPGradLaunch + 0.01).toFixed(3));
  if (strategy === "migration_snipe") mind.bars.minPGradMigrate = Math.min(0.72, +(mind.bars.minPGradMigrate + 0.01).toFixed(3));
  if (strategy === "solphia_pick") mind.bars.minScorePick = Math.min(92, mind.bars.minScorePick + 1);
  mind.bars.bundleVeto = Math.max(0.28, +(mind.bars.bundleVeto - 0.01).toFixed(3));
}

export function studyMarket(
  mind: Mind,
  tokens: TokenSnapshot[],
  safety: Map<string, number>,
  now = Date.now(),
) {
  for (const token of tokens) {
    const score = safety.get(token.mint) ?? 50;
    const { x, grad } = extractFeatures(token, now, score);
    if (grad.p < 0.22 && !token.smartMoneyInflow) continue;
    const prev = mind.watch[token.mint];
    if (!prev) {
      mind.watch[token.mint] = { mint: token.mint, at: now, p: grad.p, x, graduated: token.graduated };
      continue;
    }
    prev.graduated = prev.graduated || token.graduated;
    if (now - prev.at < 25 * 60 * 1000) continue;
    const ageMin = (now - (token.createdAt || now)) / 60000;
    const dumped = (token.priceChange1h || 0) <= -0.35 || (token.priceChange5m || 0) <= -0.22;
    if (token.graduated || prev.graduated) {
      learn(mind, prev.x, 1, 0.22);
      delete mind.watch[token.mint];
    } else if (dumped) {
      learn(mind, prev.x, 0, 0.35);
      tighten(mind, "launch_snipe");
      delete mind.watch[token.mint];
    } else if (ageMin > 50 && (token.bondingProgress || 0) < 0.3) {
      learn(mind, prev.x, 0, 0.22);
      if (prev.p >= 0.62) {
        mind.bars.minPGradLaunch = Math.min(0.65, +(mind.bars.minPGradLaunch + 0.005).toFixed(3));
        mind.pickThreshold = Math.min(PICK_CEIL, +(mind.pickThreshold + 0.004).toFixed(3));
      }
      delete mind.watch[token.mint];
    }
  }
  const keys = Object.keys(mind.watch);
  if (keys.length > 80) {
    const oldest = keys.sort((a, b) => mind.watch[a].at - mind.watch[b].at).slice(0, keys.length - 80);
    for (const k of oldest) delete mind.watch[k];
  }
  mind.studied = Math.max(mind.studied, keys.length);
}

export function applyBars(mind: Mind, settings: EngineSettings) {
  settings.minPGradLaunch = Math.max(settings.minPGradLaunch, mind.bars.minPGradLaunch);
  settings.minPGradMigrate = Math.max(settings.minPGradMigrate, mind.bars.minPGradMigrate);
  settings.minScoreCopy = Math.max(settings.minScoreCopy, mind.bars.minScoreCopy);
  settings.minScorePick = Math.max(settings.minScorePick, mind.bars.minScorePick);
  settings.bundleVeto = Math.min(settings.bundleVeto, mind.bars.bundleVeto);
}

export function publicMind(mind: Mind) {
  return {
    studied: mind.studied,
    closed: mind.closed,
    pickWins: mind.pickWins,
    pickLosses: mind.pickLosses,
    pickThreshold: mind.pickThreshold,
    bars: mind.bars,
    streak: mind.streak || {},
    deniedBias: "refuse-first",
  };
}

export type { MindWatch };
