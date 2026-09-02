import type { TokenSnapshot } from "../types";

/**
 * Flatten signal from fields we actually have.
 * Same-block deployer → fresh-wallet → sell edges need a Helius tx graph and are not invented here.
 */
export function flattenNow(token: TokenSnapshot): { flatten: boolean; reason: string } {
  if (token.farmCluster) return { flatten: true, reason: "farm-cluster" };
  if ((token.devSoldPct ?? 0) >= 0.25) return { flatten: true, reason: "creator-sold" };
  if ((token.deployerDeathRate ?? 0) > 0.7 && (token.deployerTokenCount ?? 0) > 2) {
    return { flatten: true, reason: "serial-rug-clock" };
  }
  if ((token.bundleRatio ?? 0) >= 0.5) return { flatten: true, reason: "bundle-graph" };
  return { flatten: false, reason: "" };
}
