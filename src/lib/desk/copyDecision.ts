import type { TokenSnapshot } from "../types";

export type CopyRead = {
  ok: boolean;
  fade: boolean;
  reason: string;
  ageMin: number;
  curveFill: number;
  top10: number;
  bundled: number;
  visible: boolean;
};

export function copyDecision(token: TokenSnapshot, now = Date.now()): CopyRead {
  const ageMin = Math.max(0, (now - (token.createdAt || now)) / 60000);
  const bundled = token.bundleRatio ?? 0;
  const unique = token.uniqueTraders1h || 0;
  const curveFill = token.graduated ? 1 : token.bondingProgress || 0;
  const top10 = token.top10HolderPct ?? 0;
  const visible = ageMin >= 2 || unique >= 25 || curveFill >= 0.2 || token.graduated;
  const base = { ageMin, curveFill, top10, bundled, visible };

  if (!token.smartMoneyInflow) {
    return { ok: false, fade: false, reason: "No followed wallet is in this coin.", ...base };
  }
  if (ageMin < 2 && bundled >= 0.2) {
    return { ok: false, fade: true, reason: "First-block bundle. We do not have that access — fade.", ...base };
  }
  if (ageMin < 2 && unique < 15) {
    return { ok: false, fade: true, reason: "Too early to be a follower. Looks like sniper access.", ...base };
  }
  if (bundled >= 0.38) {
    return { ok: false, fade: false, reason: "Bundled supply. Copying that is buying the bag.", ...base };
  }
  if (top10 >= 55 && !token.graduated) {
    return { ok: false, fade: false, reason: "Holder shape is a bag. Top wallets already own this.", ...base };
  }
  if ((token.leaderHoldPct ?? 0) >= 25 && curveFill < 0.15 && ageMin < 4) {
    return { ok: false, fade: true, reason: "Leader looks like they were in the bundle.", ...base };
  }
  if (!visible) {
    return { ok: false, fade: true, reason: "The leader's setup is not visible from here.", ...base };
  }
  return { ok: true, fade: false, reason: "Same setup a follower could have seen. Copy the exit too.", ...base };
}
