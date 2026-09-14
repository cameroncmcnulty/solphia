export type CircleRole = "member" | "mod" | "admin";
export type CircleStatus = "ok" | "muted" | "banned";

export type CircleMember = {
  pubkey: string;
  email: string;
  joinedAt: number;
  referrer?: string;
  role: CircleRole;
  status: CircleStatus;
  mutedUntil?: number;
  color: string;
  lastReadAt?: number;
  unclaimed: number;
  claimed: number;
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
};

export const CIRCLE_MSG_MAX = 120;
export const CIRCLE_KEEP_MS = 12 * 3600_000;
export const CIRCLE_AIRDROP_MAX = 40;
export const CIRCLE_DEFAULT_CAP = 100_000;
export const CIRCLE_BOOST_PCT = 5;
export const CIRCLE_COLORS = ["#14f195", "#80eaff", "#c9a8ff", "#5eead4", "#a78bfa", "#67e8f9", "#f0abfc", "#86efac"];
export const CIRCLE_STICKERS = ["🎁", "🩵", "✨", "🐸", "💜", "🚀", "💎", "👑", "🔥", "🫶"];
export const CIRCLE_REACTS = ["❤️", "😂", "🔥", "👍", "🩵", "👑"];
