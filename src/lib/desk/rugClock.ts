import type { CurveTick, TokenSnapshot } from "../types";

/**
 * Flatten from the stream we actually have.
 * Same-block deployer → fresh-wallet → sell edges need a Helius parsed-tx graph
 * and are not invented here.
 */
export function flattenNow(
  token: TokenSnapshot,
  prev?: CurveTick,
  now = Date.now(),
): { flatten: boolean; reason: string } {
  if (token.fundingDump) return { flatten: true, reason: "same-block-dump" };
  if (token.farmCluster) return { flatten: true, reason: "farm-cluster" };
  if ((token.devSoldPct ?? 0) >= 0.25) return { flatten: true, reason: "creator-sold" };
  if ((token.creatorRecentLaunches ?? 0) >= 3) return { flatten: true, reason: "creator-spray" };
  if ((token.deployerDeathRate ?? 0) > 0.7 && (token.deployerTokenCount ?? 0) > 2) {
    return { flatten: true, reason: "serial-rug-clock" };
  }
  if ((token.bundleRatio ?? 0) >= 0.5) return { flatten: true, reason: "bundle-graph" };
  if (prev && now - prev.at <= 180_000 && (token.bundleRatio ?? 0) - prev.bundle >= 0.15) {
    return { flatten: true, reason: "bundle-woke" };
  }
  return { flatten: false, reason: "" };
}

export function curveStalled(
  token: TokenSnapshot,
  prev: CurveTick | undefined,
  openedAt: number,
  entryBonding: number | undefined,
  now: number,
): boolean {
  if (token.graduated) return false;
  const heldMs = now - openedAt;
  if (heldMs >= 90_000 && (token.bondingProgress || 0) < (entryBonding ?? 0) + 0.03) return true;
  if (prev && now - prev.at >= 90_000 && (token.bondingProgress || 0) < prev.bonding + 0.02) return true;
  const heldMin = heldMs / 60000;
  if (heldMin >= 1.5 && token.bondingProgress < 0.4) return true;
  if (heldMin >= 4 && token.bondingProgress < 0.7) return true;
  return false;
}

export function nextCurveTick(token: TokenSnapshot, pGrad: number, now: number): CurveTick {
  return {
    bonding: token.bondingProgress || 0,
    bundle: token.bundleRatio ?? 0,
    pGrad,
    at: now,
  };
}
