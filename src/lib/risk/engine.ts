import type { EngineSettings, RiskFactor, RiskReport, Strategy, TokenSnapshot } from "../types";
import { DEFAULT_SETTINGS } from "../config";
import { copyBlockReason } from "./copy";
import { armLaunch, armMigrate, graduationRead } from "../desk/grad";
import { toxicFlow } from "../desk/toxic";
import { hardPickGates } from "../mind/features";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function grade(score: number): RiskReport["grade"] {
  if (score >= 88) return "S";
  if (score >= 78) return "A";
  if (score >= 68) return "B";
  if (score >= 52) return "C";
  if (score >= 32) return "D";
  return "X";
}

function add(factors: RiskFactor[], id: string, label: string, delta: number, detail: string) {
  if (!delta) return;
  factors.push({ id, label, delta, detail });
}

export function ageMs(token: TokenSnapshot, now = Date.now()): number {
  return Math.max(0, now - (token.createdAt || now));
}

export function buySellRatio(token: TokenSnapshot): number {
  const sells = Math.max(token.sells1h, 1);
  return token.buys1h / sells;
}

/**
 * Safety score 0–100. Higher = safer.
 *
 * Calibrated against Solana memecoin history:
 * - 68.67% of Pump.fun tokens die on launch day (CoinGecko, 18.67M tokens)
 * - ~0.74% weekly graduation rate
 * - Survivors showed ~13x trades and ~19x first-hour volume
 * - Freeze-authority abuse, LP withdrawal, and pump-and-dump are the dominant rugs
 * - Industry terminals charge ~1% (100 bps). Solphia does not score fees; it scores survival.
 *
 * The engine is deliberately skeptical (base 38) and uses hard vetoes / caps so
 * the default action is "do not trade".
 */
export function scoreToken(token: TokenSnapshot, now = Date.now(), settings: EngineSettings = DEFAULT_SETTINGS): RiskReport {
  const factors: RiskFactor[] = [];
  const vetoReasons: string[] = [];
  const caps: string[] = [];
  let score = 38;
  const age = ageMs(token, now);
  const ageMin = age / 60000;
  const bsr = buySellRatio(token);
  const unique = token.uniqueTraders1h || 0;
  const bundle = token.bundleRatio ?? 0;
  const organic = token.organicBuyRatio ?? (bundle ? clamp(1 - bundle, 0, 1) : undefined);

  if (token.banned) vetoReasons.push("This token is banned on its launchpad.");
  if (token.nsfw && token.livestream) vetoReasons.push("Livestream launches like this rug more often than they pay.");
  if (token.freezeAuthorityRevoked === false) vetoReasons.push("They can still freeze your tokens.");
  if (token.mintAuthorityRevoked === false && token.graduated) {
    vetoReasons.push("They can still print more tokens.");
  }
  const bundleVeto = settings.bundleVeto ?? 0.38;
  if ((token.bundleRatio ?? 0) >= bundleVeto) {
    vetoReasons.push(`${Math.round((token.bundleRatio || 0) * 100)}% was bundled. She didn't copy.`);
  }
  if ((token.deployerDeathRate ?? 0) > 0.7 && (token.deployerTokenCount ?? 0) > 2) {
    vetoReasons.push("This creator's other coins mostly died.");
  }
  if (token.graduated && (token.devSoldPct ?? 0) > 0.3) {
    vetoReasons.push("Creator already sold into the graduation.");
  }
  if ((token.top10HolderPct ?? 0) >= 80) {
    vetoReasons.push("Top 10 wallets own this coin.");
  }

  if (token.mintAuthorityRevoked) add(factors, "mint", "Can't print extra tokens", 12, "Mint authority is off.");
  if (token.freezeAuthorityRevoked) add(factors, "freeze", "Can't freeze your bag", 12, "Freeze authority is off.");
  if (token.lpLockedOrBurned) add(factors, "lp", "Liquidity can't be yanked", 16, "LP locked or burned.");

  if (token.top10HolderPct != null) {
    if (token.top10HolderPct < 25) add(factors, "h10", "Dispersed holders", 10, `Top 10 hold ${token.top10HolderPct.toFixed(1)}%.`);
    else if (token.top10HolderPct < 40) add(factors, "h10", "Acceptable concentration", 5, `Top 10 hold ${token.top10HolderPct.toFixed(1)}%.`);
    else if (token.top10HolderPct > 70) add(factors, "h10", "Whale concentration", -18, `Top 10 hold ${token.top10HolderPct.toFixed(1)}%.`);
  }

  const uniqueW = token.uniqueEstimated ? 0.45 : 1;
  if (unique >= 200) add(factors, "u1h", "Dense first-hour flow", Math.round(14 * uniqueW), `${unique} unique traders.`);
  else if (unique >= 80) add(factors, "u1h", "Strong unique flow", Math.round(9 * uniqueW), `${unique} unique traders.`);
  else if (unique >= 30) add(factors, "u1h", "Decent unique flow", Math.round(5 * uniqueW), `${unique} unique traders.`);
  else if (unique > 0 && unique < 8) add(factors, "u1h", "Thin unique flow", -12, `${unique} unique traders.`);

  if (token.volume1h >= 50_000) add(factors, "v1h", "Real 1h volume", 8, `$${Math.round(token.volume1h).toLocaleString()}`);
  else if (token.volume1h >= 15_000) add(factors, "v1h", "Decent 1h volume", 4, `$${Math.round(token.volume1h).toLocaleString()}`);
  else if (token.volume1h < 2_000 && ageMin > 20) add(factors, "v1h", "Nobody is trading this", -10, `$${Math.round(token.volume1h).toLocaleString()} after ${ageMin.toFixed(0)}m`);

  if (organic != null) {
    if (organic > 0.7) add(factors, "org", "Looks like real buyers", 8, `${(organic * 100).toFixed(0)}% unbundled.`);
    else if (organic < 0.4) add(factors, "org", "Mostly bots buying each other", -10, `${(organic * 100).toFixed(0)}% unbundled.`);
  }
  if (bundle > 0.4) add(factors, "bun", "Snipers already stacked", -14, `${(bundle * 100).toFixed(0)}% bundled.`);
  else if (bundle > 0.25) add(factors, "bun", "Some bundled supply", -6, `${(bundle * 100).toFixed(0)}% bundled.`);

  if (token.bondingProgress >= 0.85 && token.bondingProgress < 1 && (organic ?? 1) > 0.55) {
    add(factors, "mig", "About to graduate with real flow", 10, `${(token.bondingProgress * 100).toFixed(0)}% bonded.`);
  }

  const death = token.deployerDeathRate;
  const dcount = token.deployerTokenCount ?? 0;
  if (death != null && dcount >= 1) {
    if (death < 0.3) add(factors, "dev", "This deployer doesn't usually rug", 8, `${(death * 100).toFixed(0)}% dead of ${dcount}.`);
    else if (death > 0.6) add(factors, "dev", "This deployer usually rugs", -12, `${(death * 100).toFixed(0)}% dead of ${dcount}.`);
  }

  if (token.smartMoneyInflow) add(factors, "sm", "A wallet we copy is buying", 10, "Followed profitable wallet is in.");
  if ((token.devSoldPct ?? 0) > 0.5) add(factors, "dump", "Creator is selling into you", -15, `${((token.devSoldPct || 0) * 100).toFixed(0)}% of creator stack sold.`);

  if (token.liquidityUsd > 40_000) add(factors, "liq", "You can actually exit", 8, `$${Math.round(token.liquidityUsd).toLocaleString()} liquidity.`);
  else if (token.liquidityUsd > 0 && token.liquidityUsd < 4_000) add(factors, "liq", "You may not get out", -10, `$${Math.round(token.liquidityUsd).toLocaleString()} liquidity.`);

  if (token.priceChange5m > 120) {
    vetoReasons.push(`Already +${token.priceChange5m.toFixed(0)}% in 5 minutes. You're late.`);
  } else if (token.priceChange5m > 80) {
    add(factors, "spike", "Already pumped in 5 minutes", -16, `+${token.priceChange5m.toFixed(0)}% — late.`);
  }
  if (bsr > 1.6) add(factors, "bsr", "More buys than sells", 5, `buy/sell ${bsr.toFixed(2)}`);
  else if (token.buys1h + token.sells1h > 8 && bsr < 0.7) add(factors, "bsr", "Sellers are leaving", -8, `buy/sell ${bsr.toFixed(2)}`);

  for (const f of factors) score += f.delta;

  if (token.graduated && token.lpLockedOrBurned === false) {
    score = Math.min(score, 35);
    caps.push("Graduated but liquidity can still be pulled.");
  }
  if (unique > 0 && unique < 12 && ageMin > 8) {
    score = Math.min(score, 40);
    caps.push("Almost nobody unique is trading this.");
  }

  if (vetoReasons.length) {
    score = Math.min(score, 12);
  }

  score = Math.round(clamp(score, 0, 100));

  const toxic = toxicFlow(token);
  if (toxic.toxic && !token.smartMoneyInflow) {
    caps.push(toxic.reason);
    score = Math.min(score, 48);
  }

  const grad = graduationRead(token, now);
  const allowed = allowedStrategies(token, score, { age, unique, bundle, organic: organic ?? 0 }, settings, now);
  const top = [...factors].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const why = vetoReasons[0] || top?.detail || "Not enough of a read yet.";
  const verdict: RiskReport["verdict"] = vetoReasons.length || score < 52 ? "skip" : allowed.length && score >= 68 ? "trade" : "wait";
  const pGrad = token.graduated ? 1 : grad.p;
  const summary =
    verdict === "skip"
      ? `Skip — ${why}`
      : verdict === "trade"
        ? `Take it — ${why}`
        : `Wait — ${why}`;

  return {
    mint: token.mint,
    score,
    grade: grade(score),
    verdict,
    vetoed: vetoReasons.length > 0,
    vetoReasons,
    caps,
    factors,
    allowedStrategies: allowed,
    summary,
    why,
    scoredAt: now,
    pGrad,
  };
}

export function allowedStrategies(
  token: TokenSnapshot,
  score: number,
  ctx: { age: number; unique: number; bundle: number; organic: number },
  settings: EngineSettings,
  now = Date.now(),
): Strategy[] {
  const out: Strategy[] = [];
  if (token.banned || token.nsfw) return out;
  const ageMin = ctx.age / 60000;
  const grad = graduationRead(token, now);

  const preGrad =
    !token.graduated &&
    token.bondingProgress >= 0.35 &&
    token.bondingProgress < settings.migrationMinBonding &&
    ageMin >= 3 &&
    ageMin <= 20 &&
    ctx.unique >= 40 &&
    ctx.bundle < 0.22 &&
    !token.livestream &&
    (token.deployerDeathRate == null || token.deployerDeathRate < 0.5);
  if (score >= settings.minScoreLaunch && preGrad && armLaunch(grad, settings.minPGradLaunch ?? 0.42)) {
    out.push("launch_snipe");
  }

  const nearGrad =
    !token.graduated &&
    token.bondingProgress >= Math.max(settings.migrationMinBonding, 0.88) &&
    token.bondingProgress < 1 &&
    ctx.unique >= 50 &&
    ctx.bundle < 0.25 &&
    (ctx.organic || 0) > 0.5;
  const justMigrated =
    token.graduated &&
    (token.venue === "pumpswap" || token.venue === "raydium") &&
    ageMin < 12 &&
    ctx.unique >= 40 &&
    ctx.bundle < 0.28;
  if (
    score >= settings.minScoreMigration &&
    (nearGrad || justMigrated) &&
    armMigrate(grad, token.bondingProgress, settings.minPGradMigrate ?? 0.55)
  ) {
    out.push("migration_snipe");
  }

  const copySized = token.marketCapUsd <= 0 || token.marketCapUsd <= 8_000_000;
  if (score >= settings.minScoreCopy && token.smartMoneyInflow && copySized && !copyBlockReason(token, settings)) {
    out.push("copy_trade");
  }

  if (score >= (settings.minScorePick ?? 82) && hardPickGates(token, score, now).ok) {
    out.push("solphia_pick");
  }

  if (score >= settings.minScoreScalp && token.liquidityUsd > 40_000 && ageMin > 30 && ctx.bundle < 0.25) {
    out.push("scalp");
  }

  return out;
}

export function positionSizeUsd(equity: number, score: number, settings: EngineSettings): number {
  if (score < 60 || equity <= 0) return 0;
  const pct = clamp(0.02 + (score - 60) * 0.0015, 0.02, settings.maxPositionPct);
  return Math.round(equity * pct * 100) / 100;
}

export function applyFee(notional: number, bps: number): number {
  return Math.round(notional * (bps / 10_000) * 10000) / 10000;
}

export function slippageBps(strategy: Strategy, settings: EngineSettings): number {
  switch (strategy) {
    case "launch_snipe":
      return settings.slippageBpsLaunch;
    case "migration_snipe":
      return settings.slippageBpsMigration;
    case "copy_trade":
      return settings.slippageBpsCopy;
    case "solphia_pick":
      return settings.slippageBpsPick ?? 50;
    case "sol_usd":
      return 4;
    default:
      return settings.slippageBpsScalp;
  }
}
