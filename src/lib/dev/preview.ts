import { blankSnapshot } from "../feeds/normalize";
import { scoreToken } from "../risk/engine";
import type { RiskReport, TokenSnapshot } from "../types";

export type LaunchDraft = {
  name: string;
  symbol: string;
  description: string;
  twitter: string;
  telegram: string;
  website: string;
  venue: "pumpfun" | "spl";
  revokeMint: boolean;
  revokeFreeze: boolean;
  lockLp: boolean;
  teamPct: number;
  airdropPct: number;
  airdropWallets: number;
  seedBuySol: number;
  decimals: number;
};

export const EMPTY_DRAFT: LaunchDraft = {
  name: "",
  symbol: "",
  description: "",
  twitter: "",
  telegram: "",
  website: "",
  venue: "pumpfun",
  revokeMint: true,
  revokeFreeze: true,
  lockLp: true,
  teamPct: 0,
  airdropPct: 0,
  airdropWallets: 0,
  seedBuySol: 0.5,
  decimals: 6,
};

export function draftToSnapshot(d: LaunchDraft, solUsd = 140): TokenSnapshot {
  const wallets = Math.max(0, Math.floor(d.airdropWallets));
  const airdropPct = clampPct(d.airdropPct);
  const teamPct = clampPct(d.teamPct);
  const top10 = Math.min(100, teamPct + (wallets > 0 && wallets <= 10 ? airdropPct : airdropPct * 0.4));
  const bundle = wallets > 0 && wallets < 8 ? Math.min(0.9, airdropPct / 100) : airdropPct > 40 && wallets < 20 ? 0.35 : 0.08;
  const seedUsd = Math.max(0, d.seedBuySol) * solUsd;
  const pump = d.venue === "pumpfun";
  return blankSnapshot({
    mint: "LaunchDraft1111111111111111111111111111111",
    name: d.name || "UNNAMED",
    symbol: (d.symbol || "???").slice(0, 10).toUpperCase(),
    venue: pump ? "pumpfun" : "raydium",
    createdAt: Date.now() - 15 * 60 * 1000,
    priceUsd: 0,
    marketCapUsd: Math.max(seedUsd * 20, 40_000),
    liquidityUsd: pump ? Math.max(seedUsd, 12_000) : d.lockLp ? Math.max(seedUsd, 12_000) : Math.max(seedUsd, 1),
    volume1h: Math.max(seedUsd * 8, 20_000),
    uniqueTraders1h: Math.max(40, wallets),
    buys1h: 40,
    sells1h: 16,
    bondingProgress: pump ? 0.45 : 1,
    graduated: !pump,
    mintAuthorityRevoked: pump || d.revokeMint,
    freezeAuthorityRevoked: pump || d.revokeFreeze,
    lpLockedOrBurned: d.lockLp,
    top10HolderPct: top10,
    bundleRatio: bundle,
    organicBuyRatio: clamp01(1 - bundle),
    socials: {
      twitter: d.twitter || undefined,
      telegram: d.telegram || undefined,
      website: d.website || undefined,
    },
  });
}

export function scoreDraft(d: LaunchDraft, solUsd = 140): RiskReport {
  const report = scoreToken(draftToSnapshot(d, solUsd));
  const verdict: RiskReport["verdict"] =
    report.vetoed || report.score < 52 ? "skip" : report.score >= 68 ? "trade" : "wait";
  const summary =
    verdict === "skip"
      ? `I would skip this after launch — ${report.why}`
      : verdict === "trade"
        ? `I would not skip this for being a rug. ${report.why}`
        : `Not a hard skip, not a take. ${report.why}`;
  return { ...report, verdict, summary };
}

export function coachLines(report: RiskReport, d: LaunchDraft): string[] {
  const lines: string[] = [];
  if (!d.revokeMint && d.venue === "spl") lines.push("Keep mint authority and I skip you. I cannot trust a coin you can still print.");
  if (!d.revokeFreeze && d.venue === "spl") lines.push("Keep freeze and you can trap buyers. I treat that as a rug.");
  if (!d.lockLp) lines.push("If liquidity can be yanked after graduation I cap the score at 35. Lock or burn it.");
  if (d.airdropPct >= 38 && d.airdropWallets > 0 && d.airdropWallets < 8) {
    lines.push(`An airdrop of ${d.airdropPct}% to ${d.airdropWallets} wallets looks bundled. I will not copy that.`);
  }
  if (d.teamPct >= 20) lines.push("Team bag above 20% is a dump waiting to happen. Cut it or vest it.");
  if (d.venue === "pumpfun" && d.seedBuySol < 0.1) lines.push("A tiny seed buy leaves a thin curve. Bots will own the first prints.");
  if (d.venue === "pumpfun" && d.seedBuySol >= 1) lines.push("A real seed buy helps the curve. I still need uniques after you launch.");
  if (!d.twitter && !d.telegram && !d.website) lines.push("Socials do not raise my score. Authorities and LP do.");
  if (!lines.length) {
    if (report.verdict === "trade") lines.push("This is the shape I look for. I still watch the first minutes on-chain.");
    else if (report.verdict === "wait") lines.push("Not a skip yet. Tighten LP, uniques, or the airdrop before you press launch.");
    else lines.push(report.summary);
  }
  return lines.slice(0, 3);
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
