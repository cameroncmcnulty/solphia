import type { EngineSettings, RiskFactor, RiskReport, Strategy, TokenSnapshot } from "../types";
import { DEFAULT_SETTINGS } from "../config";

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

export function socialCount(token: TokenSnapshot): number {
  return [token.socials.twitter, token.socials.telegram, token.socials.website].filter(Boolean).length;
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
  const socials = socialCount(token);
  const unique = token.uniqueTraders1h || 0;
  const bundle = token.bundleRatio ?? 0;
  const organic = token.organicBuyRatio ?? (bundle ? clamp(1 - bundle, 0, 1) : undefined);

  if (token.banned) vetoReasons.push("Token is banned on its launchpad.");
  if (token.nsfw && token.livestream) vetoReasons.push("NSFW livestream — historically a high-rug cluster.");
  if (token.freezeAuthorityRevoked === false) vetoReasons.push("Freeze authority still live.");
  if (token.mintAuthorityRevoked === false && token.graduated) {
    vetoReasons.push("Mint authority still live after graduation.");
  }
  if ((token.bundleRatio ?? 0) > 0.55) vetoReasons.push("Bundle ratio above 55% — sniper dump likely.");
  if ((token.deployerDeathRate ?? 0) > 0.85 && (token.deployerTokenCount ?? 0) > 3) {
    vetoReasons.push("Serial deployer with >85% dead tokens.");
  }

  if (token.mintAuthorityRevoked) add(factors, "mint", "Mint revoked", 12, "Cannot inflate supply.");
  if (token.freezeAuthorityRevoked) add(factors, "freeze", "Freeze revoked", 12, "Cannot freeze holders.");
  if (token.lpLockedOrBurned) add(factors, "lp", "LP locked/burned", 16, "Classic LP-pull vector closed.");

  if (token.top10HolderPct != null) {
    if (token.top10HolderPct < 25) add(factors, "h10", "Dispersed holders", 10, `Top 10 hold ${token.top10HolderPct.toFixed(1)}%.`);
    else if (token.top10HolderPct < 40) add(factors, "h10", "Acceptable concentration", 5, `Top 10 hold ${token.top10HolderPct.toFixed(1)}%.`);
    else if (token.top10HolderPct > 70) add(factors, "h10", "Whale concentration", -18, `Top 10 hold ${token.top10HolderPct.toFixed(1)}%.`);
  }

  if (unique >= 200) add(factors, "u1h", "Dense first-hour flow", 14, `${unique} unique traders.`);
  else if (unique >= 80) add(factors, "u1h", "Strong unique flow", 9, `${unique} unique traders.`);
  else if (unique >= 30) add(factors, "u1h", "Decent unique flow", 5, `${unique} unique traders.`);
  else if (unique > 0 && unique < 8) add(factors, "u1h", "Thin unique flow", -12, `${unique} unique traders.`);

  if (token.volume1h >= 50_000) add(factors, "v1h", "High 1h volume", 8, `$${Math.round(token.volume1h).toLocaleString()}`);
  else if (token.volume1h >= 15_000) add(factors, "v1h", "Healthy 1h volume", 4, `$${Math.round(token.volume1h).toLocaleString()}`);
  else if (token.volume1h < 2_000 && ageMin > 20) add(factors, "v1h", "Dead volume", -10, `$${Math.round(token.volume1h).toLocaleString()} after ${ageMin.toFixed(0)}m`);

  if (socials >= 3) add(factors, "soc", "Full social set", 6, "Twitter + Telegram + site.");
  else if (socials === 1) add(factors, "soc", "Thin socials", 2, "One social link.");
  else if (socials === 0 && ageMin > 3) add(factors, "soc", "No socials", -4, "Anonymous launch with no links.");

  if (organic != null) {
    if (organic > 0.7) add(factors, "org", "Organic buys", 8, `${(organic * 100).toFixed(0)}% organic.`);
    else if (organic < 0.4) add(factors, "org", "Inorganic buys", -10, `${(organic * 100).toFixed(0)}% organic.`);
  }
  if (bundle > 0.4) add(factors, "bun", "Heavy bundle", -14, `${(bundle * 100).toFixed(0)}% bundled.`);
  else if (bundle > 0.25) add(factors, "bun", "Moderate bundle", -6, `${(bundle * 100).toFixed(0)}% bundled.`);

  if (token.bondingProgress >= 0.85 && token.bondingProgress < 1 && (organic ?? 1) > 0.55) {
    add(factors, "mig", "Organic migration setup", 10, `${(token.bondingProgress * 100).toFixed(0)}% bonded.`);
  }
  if (token.graduated) add(factors, "grad", "Graduated", 4, "Off the curve.");

  const death = token.deployerDeathRate;
  const dcount = token.deployerTokenCount ?? 0;
  if (death != null && dcount >= 1) {
    if (death < 0.3) add(factors, "dev", "Cleaner deployer", 8, `${(death * 100).toFixed(0)}% dead of ${dcount}.`);
    else if (death > 0.6) add(factors, "dev", "Dirty deployer", -12, `${(death * 100).toFixed(0)}% dead of ${dcount}.`);
  }

  if (token.smartMoneyInflow) add(factors, "sm", "Smart-money inflow", 10, "Tracked profitable wallets buying.");
  if ((token.devSoldPct ?? 0) > 0.5) add(factors, "dump", "Dev dumping", -15, `${((token.devSoldPct || 0) * 100).toFixed(0)}% of dev stack sold.`);
  if (token.replyCount > 50) add(factors, "chat", "Active thread", 3, `${token.replyCount} replies.`);
  if (token.verified) add(factors, "ver", "Launchpad verified", 5, "Platform verification flag.");

  if (token.marketCapUsd >= 20_000 && token.marketCapUsd <= 400_000) {
    add(factors, "mc", "Tradeable mcap band", 6, `$${Math.round(token.marketCapUsd).toLocaleString()}`);
  } else if (token.marketCapUsd > 0 && token.marketCapUsd < 5_000) {
    add(factors, "mc", "Micro mcap", -4, `$${Math.round(token.marketCapUsd).toLocaleString()}`);
  } else if (token.marketCapUsd > 5_000_000) {
    add(factors, "mc", "Late / crowded", -3, `$${Math.round(token.marketCapUsd).toLocaleString()}`);
  }

  if (token.liquidityUsd > 40_000) add(factors, "liq", "Real liquidity", 8, `$${Math.round(token.liquidityUsd).toLocaleString()}`);
  else if (token.liquidityUsd > 0 && token.liquidityUsd < 4_000) add(factors, "liq", "Fragile liquidity", -10, `$${Math.round(token.liquidityUsd).toLocaleString()}`);

  if (token.priceChange5m > 80) add(factors, "spike", "Vertical 5m candle", -8, `+${token.priceChange5m.toFixed(0)}% in 5m — dump risk.`);
  if (bsr > 1.6) add(factors, "bsr", "Buy-side 1h", 5, `buy/sell ${bsr.toFixed(2)}`);
  else if (token.buys1h + token.sells1h > 8 && bsr < 0.7) add(factors, "bsr", "Sell-side 1h", -8, `buy/sell ${bsr.toFixed(2)}`);

  if (ageMin >= 3 && ageMin <= 45) add(factors, "age", "Not instant, not dead", 4, `${ageMin.toFixed(1)} minutes old.`);
  if (token.graduated && token.pairAddress) add(factors, "pool", "Pool exists", 5, token.venue);

  for (const f of factors) score += f.delta;

  if (token.graduated && token.lpLockedOrBurned === false) {
    score = Math.min(score, 35);
    caps.push("Graduated with unlocked LP — cap 35.");
  }
  if (unique > 0 && unique < 12 && ageMin > 8) {
    score = Math.min(score, 40);
    caps.push("Fewer than 12 unique traders — cap 40.");
  }
  if (age < 60_000 && socials === 0) {
    score = Math.min(score, 45);
    caps.push("Sub-60s anonymous launch — cap 45.");
  }

  if (vetoReasons.length) {
    score = Math.min(score, 12);
  }

  score = Math.round(clamp(score, 0, 100));

  const allowed = allowedStrategies(token, score, { age, unique, bundle, organic: organic ?? 0 }, settings);

  const summary = vetoReasons.length
    ? `VETO ${score}/100 — ${vetoReasons[0]}`
    : `${grade(score)} ${score}/100 — ${allowed.length ? allowed.join(", ") : "no strategy cleared"}`;

  return {
    mint: token.mint,
    score,
    grade: grade(score),
    vetoed: vetoReasons.length > 0,
    vetoReasons,
    caps,
    factors,
    allowedStrategies: allowed,
    summary,
    scoredAt: now,
  };
}

export function allowedStrategies(
  token: TokenSnapshot,
  score: number,
  ctx: { age: number; unique: number; bundle: number; organic: number },
  settings: EngineSettings,
): Strategy[] {
  const out: Strategy[] = [];
  if (token.banned || token.nsfw) return out;

  if (
    score >= settings.minScoreLaunch &&
    ctx.age <= settings.launchMaxAgeMs &&
    ctx.unique >= 25 &&
    ctx.bundle < 0.28 &&
    !token.livestream
  ) {
    out.push("launch_snipe");
  }

  const nearGrad = token.bondingProgress >= settings.migrationMinBonding && token.bondingProgress < 1;
  const justGrad = token.graduated && ctx.age < 8 * 60 * 1000;
  if (score >= settings.minScoreMigration && (nearGrad || justGrad) && ctx.unique >= 40 && ctx.bundle < 0.32) {
    out.push("migration_snipe");
  }

  if (score >= settings.minScoreCopy && (token.smartMoneyInflow || (ctx.unique >= 20 && ctx.organic > 0.65))) {
    out.push("copy_trade");
  }

  if (score >= settings.minScoreScalp && token.liquidityUsd > 25_000 && ctx.age > 15 * 60 * 1000) {
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
    default:
      return settings.slippageBpsScalp;
  }
}
