import type { TokenSnapshot } from "../types";

export function copyDecision(token: TokenSnapshot, now = Date.now()): { ok: boolean; fade: boolean; reason: string } {
  if (!token.smartMoneyInflow) return { ok: false, fade: false, reason: "No followed wallet is in this coin." };
  const ageMin = Math.max(0, (now - (token.createdAt || now)) / 60000);
  const bundle = token.bundleRatio ?? 0;
  const unique = token.uniqueTraders1h || 0;

  if (ageMin < 2 && bundle >= 0.2) {
    return { ok: false, fade: true, reason: "First-block bundle. We do not have that access — fade." };
  }
  if (ageMin < 2 && unique < 15) {
    return { ok: false, fade: true, reason: "Too early to be a follower. Looks like sniper access." };
  }
  if (bundle >= 0.38) {
    return { ok: false, fade: false, reason: "Bundled supply. Copying that is buying the bag." };
  }
  const visible =
    ageMin >= 2 || unique >= 25 || token.bondingProgress >= 0.2 || token.graduated;
  if (!visible) {
    return { ok: false, fade: true, reason: "The leader's setup is not visible from here." };
  }
  return { ok: true, fade: false, reason: "Same setup a follower could have seen. Copy the exit too." };
}
