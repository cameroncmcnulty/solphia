export type CircleRole = "member" | "mod" | "admin";
export type CircleStatus = "ok" | "muted" | "banned";
/** Kept for old seats. New members are ready on join. */
export type CircleAccess = "pending" | "ready";

export type CircleMember = {
  pubkey: string;
  email: string;
  joinedAt: number;
  referrer?: string;
  /** Wallet that used this member's invite. One unlock. */
  invitedPubkey?: string;
  /** Missing on old seats = ready. */
  access?: CircleAccess;
  role: CircleRole;
  status: CircleStatus;
  mutedUntil?: number;
  color: string;
  lastReadAt?: number;
  unclaimed: number;
  claimed: number;
};

export type CirclePromo = {
  id: string;
  url: string;
  at: number;
  caption?: string;
};

export type CircleJob = {
  id: string;
  title: string;
  blurb: string;
  href?: string;
  at: number;
};

export type CircleMessage = {
  id: string;
  at: number;
  owner: string;
  kind: "text" | "sticker" | "media";
  text?: string;
  media?: string;
  sticker?: string;
  replyTo?: string;
  reactions: Record<string, string[]>;
};

export type CircleAirdrop = {
  id: string;
  at: number;
  total: number;
  heads: number;
  note?: string;
};

export type CircleBook = {
  cap: number;
  members: Record<string, CircleMember>;
  messages: CircleMessage[];
  airdrops: CircleAirdrop[];
  typing: Record<string, number>;
  promos: CirclePromo[];
  jobs: CircleJob[];
};

export const CIRCLE_MSG_MAX = 120;
export const CIRCLE_KEEP_MS = 12 * 3600_000;
export const CIRCLE_AIRDROP_MAX = 40;
export const CIRCLE_DEFAULT_CAP = 1000;
/** Extra airdrop share per referred founder. 10% each, capped at +200% (3×). */
export const CIRCLE_BOOST_PCT = 10;
export const CIRCLE_BOOST_CAP_PCT = 200;

export function referralBoostPct(refs: number): number {
  const n = Math.max(0, Math.floor(Number(refs) || 0));
  return Math.min(CIRCLE_BOOST_CAP_PCT, n * CIRCLE_BOOST_PCT);
}

export function airdropMultiplier(refs: number): number {
  return 1 + referralBoostPct(refs) / 100;
}
export const CIRCLE_PROMO_MAX = 30;
export const CIRCLE_JOB_MAX = 20;
export const CIRCLE_COLORS = ["#14f195", "#80eaff", "#c9a8ff", "#5eead4", "#a78bfa", "#67e8f9", "#f0abfc", "#86efac"];
export const CIRCLE_STICKERS = ["🎁", "🩵", "✨", "🐸", "💜", "🚀", "💎", "👑", "🔥", "🫶"];
export const CIRCLE_REACTS = ["❤️", "😂", "🔥", "👍", "🩵", "👑"];
