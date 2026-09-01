import type { EngineSettings, TokenSnapshot } from "../types";
import { MIN_COPY_QUALITY } from "../copy/quality";
import { walletQuality as cachedWallet } from "../copy/desk";

export function copyBlockReason(token: TokenSnapshot, settings: EngineSettings): string | null {
  if (!token.smartMoneyInflow) return "No followed wallet is in this coin.";
  const handles = token.copiedBy || [];
  const qualities = handles.map((h) => cachedWallet(h)?.quality ?? 0);
  const best = qualities.length ? Math.max(...qualities) : 0;
  if (handles.length && best > 0 && best < (settings.minWalletQuality || MIN_COPY_QUALITY)) {
    return `Leader quality ${best} is under ${settings.minWalletQuality}.`;
  }
  if ((token.top10HolderPct ?? 0) >= settings.leaderSupplyVeto * 100) {
    return `Top 10 already hold ${token.top10HolderPct!.toFixed(0)}% of supply.`;
  }
  if ((token.leaderHoldPct ?? 0) >= 40 && (token.marketCapUsd || 0) < 80_000) {
    return "Leader bag is a huge slice of a tiny coin — you would be exit liquidity.";
  }
  if (token.farmCluster) return "Too many of our wallets piled into the same mint. Looks like a farm.";
  if ((token.bundleRatio ?? 0) >= settings.bundleVeto) {
    return `${Math.round((token.bundleRatio || 0) * 100)}% was bundled. She didn't copy.`;
  }
  return null;
}

export function bestCopyQuality(token: TokenSnapshot): number {
  const handles = token.copiedBy || [];
  if (!handles.length) return token.smartMoneyInflow ? 70 : 0;
  const scores = handles.map((h) => cachedWallet(h)?.quality).filter((n): n is number => n != null);
  return scores.length ? Math.max(...scores) : 70;
}
