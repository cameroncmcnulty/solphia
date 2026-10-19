/** Tiny account marker. JPEG bytes live on KEYS.pfp(pk), not in launch-accounts. */
export const PFP_SENTINEL = "store:pfp";

export function circleAvatarUrl(pubkey: string, kind: "pfp" | "banner" = "pfp", bust?: number): string {
  if (!pubkey) return "";
  const u = `/api/circle/avatar?pk=${encodeURIComponent(pubkey)}&kind=${kind}`;
  return bust ? `${u}&v=${bust}` : u;
}
