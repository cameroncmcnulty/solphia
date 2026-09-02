import type { TokenSnapshot } from "../types";
import { graduationRead, hasTelegram, hasTwitter, type GradRead } from "../desk/grad";
import { toxicFlow } from "../desk/toxic";

/** Research-backed features. Order is load-bearing for the weight vector. */
export const FEATURE_KEYS = [
  "pGrad",
  "solPerUnique",
  "lowBot",
  "telegram",
  "twitter",
  "fill",
  "unique",
  "lowDeath",
  "dispersed",
  "unbundled",
  "ageFit",
  "organic",
  "liq",
  "safety",
  "cleanTape",
  "fundingClean",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/**
 * Priors from Marino et al. 2026 (few large trades, bot share suppresses),
 * Kamat 2026 (Telegram ~8.9x graduation lift), Solidus rugs, and our own desk.
 * These are the starting brain. Learning only nudges them.
 */
export const PRIORS: Record<FeatureKey, number> = {
  pGrad: 2.2,
  solPerUnique: 1.9,
  lowBot: 2.4,
  telegram: 1.8,
  twitter: 0.4,
  fill: 1.6,
  unique: 0.55,
  lowDeath: 1.3,
  dispersed: 1.1,
  unbundled: 1.7,
  ageFit: 0.85,
  organic: 0.9,
  liq: 0.45,
  safety: 1.05,
  cleanTape: 1.5,
  fundingClean: 2.05,
};

function clip01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function tanh01(x: number) {
  const e = Math.exp(-2 * Math.max(-20, Math.min(20, x)));
  return (1 - e) / (1 + e);
}

export type FeatureVec = number[];

export function extractFeatures(token: TokenSnapshot, now = Date.now(), safetyScore = 50): { x: FeatureVec; grad: GradRead } {
  const grad = graduationRead(token, now);
  const toxic = toxicFlow(token);
  const unique = token.uniqueTraders1h || 0;
  const top10 = token.top10HolderPct ?? 40;
  const organic = token.organicBuyRatio ?? (token.bundleRatio != null ? 1 - token.bundleRatio : 0.5);
  const ageFit = token.graduated
    ? clip01(1 - Math.max(0, grad.ageMin - 12) / 20)
    : grad.ageMin < 4
      ? clip01(grad.ageMin / 4)
      : grad.ageMin <= 22
        ? 1
        : clip01(1 - (grad.ageMin - 22) / 40);
  const x: FeatureVec = [
    clip01(grad.p),
    clip01(tanh01(grad.solPerUnique / 0.45)),
    clip01(1 - grad.botShare),
    hasTelegram(token.socials?.telegram) ? 1 : 0,
    hasTwitter(token.socials?.twitter) ? 1 : 0,
    clip01(grad.p >= 0.99 ? 1 : token.bondingProgress || 0),
    clip01(tanh01(unique / 70)),
    clip01(1 - (token.deployerDeathRate ?? 0.45)),
    clip01(1 - top10 / 100),
    clip01(1 - (token.bundleRatio ?? 0.35)),
    ageFit,
    clip01(organic),
    clip01(tanh01((token.liquidityUsd || 0) / 40_000)),
    clip01(safetyScore / 100),
    toxic.toxic ? 0 : 1,
    token.fundingDump ? 0 : 1,
  ];
  return { x, grad };
}

export type GateFail = { ok: false; reason: string };
export type GatePass = { ok: true; reason: string; grad: GradRead };

/**
 * Hard gates. The model cannot override these.
 * Built to refuse almost everything — Picks is not a sniper.
 */
export function hardPickGates(token: TokenSnapshot, safetyScore: number, now = Date.now()): GateFail | GatePass {
  if (token.banned || token.nsfw) return { ok: false, reason: "Banned or NSFW." };
  if (token.livestream) return { ok: false, reason: "Livestream launches rug more than they pay." };
  if (token.fundingDump) return { ok: false, reason: "Funding graph says dump." };
  if (token.farmCluster) return { ok: false, reason: "Farm cluster." };
  if (token.uniqueEstimated) return { ok: false, reason: "Unique flow is estimated, not counted." };
  const toxic = toxicFlow(token);
  if (toxic.toxic) return { ok: false, reason: toxic.reason };
  if (token.freezeAuthorityRevoked === false) return { ok: false, reason: "Freeze authority is live." };
  if ((token.graduated || token.venue === "pumpswap" || token.venue === "raydium") && token.mintAuthorityRevoked === false) {
    return { ok: false, reason: "Mint authority is live after graduation." };
  }
  if (!hasTelegram(token.socials?.telegram)) {
    return { ok: false, reason: "No Telegram on the page. Research: that is an 8.9× graduation lift. Skip." };
  }
  const { grad } = extractFeatures(token, now, safetyScore);
  if (grad.p < 0.62) return { ok: false, reason: `P(grad) ${(grad.p * 100).toFixed(0)}% — Picks needs 62%+.` };
  if (grad.botShare >= 0.18) return { ok: false, reason: "Bot-share too high for a Pick." };
  if (grad.ageMin < 5) return { ok: false, reason: "Under 5 minutes. That is a sniper window. She waits." };
  if (!token.graduated && grad.ageMin > 45) return { ok: false, reason: "Curve is old and not graduated. Stalled." };
  if (token.graduated && grad.ageMin > 25) return { ok: false, reason: "Graduation is stale. Late." };
  if ((token.uniqueTraders1h || 0) < 50) return { ok: false, reason: "Not enough unique buyers." };
  if ((token.bundleRatio ?? 0) >= 0.18) return { ok: false, reason: "Bundled supply." };
  if ((token.top10HolderPct ?? 0) >= 38) return { ok: false, reason: "Holder shape is a bag." };
  if ((token.deployerDeathRate ?? 0) >= 0.4 && (token.deployerTokenCount ?? 0) >= 2) {
    return { ok: false, reason: "Creator's other coins mostly died." };
  }
  if ((token.creatorRecentLaunches ?? 0) >= 3) return { ok: false, reason: "Creator spray." };
  if ((token.devSoldPct ?? 0) >= 0.15) return { ok: false, reason: "Creator already selling." };
  if (safetyScore < 80) return { ok: false, reason: `Safety ${safetyScore} under 80.` };
  if (grad.solPerUnique < 0.28 && (token.bondingProgress || 0) < 0.7 && !token.graduated) {
    return { ok: false, reason: "SOL per unique buyer is thin. Bot churn, not demand." };
  }
  if (token.graduated && (token.marketCapUsd || 0) > 5_000_000) return { ok: false, reason: "Too large. No Pick edge left." };
  if ((token.priceChange5m || 0) > 70) return { ok: false, reason: "Already spiked. You're exit liquidity." };
  return { ok: true, reason: grad.why, grad };
}
