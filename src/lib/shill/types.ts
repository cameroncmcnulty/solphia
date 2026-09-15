export type ShillKind = "text" | "sticker" | "media";

export type ShillToken = {
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  priceUsd?: number;
  mcUsd?: number;
};

export type ShillMessage = {
  id: string;
  at: number;
  owner: string;
  kind: ShillKind;
  text?: string;
  media?: string;
  sticker?: string;
  replyTo?: string;
  reactions: Record<string, string[]>;
  token?: ShillToken;
};

export type ShillPin = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  priceUsd?: number;
  mcUsd?: number;
  owner: string;
  sig: string;
  paidSol: number;
  at: number;
  endsAt: number;
};

export type ShillMember = {
  pubkey: string;
  lastCaAt?: number;
  lastReadAt?: number;
};

export type ShillBook = {
  messages: ShillMessage[];
  pins: ShillPin[];
  members: Record<string, ShillMember>;
  typing: Record<string, number>;
};

export const SHILL_MSG_MAX = 500;
export const SHILL_KEEP_MS = 14 * 24 * 3600_000;
export const SHILL_CA_COOLDOWN_MS = 30_000;
export const SHILL_PIN_SLOTS = 5;
export const SHILL_PIN_MS = 3 * 3600_000;
export const SHILL_PIN_SOL = 0.2;
export const SHILL_STICKERS = ["🚀", "🔥", "💎", "🐸", "👑", "🪩", "🎉", "💸", "🧠", "🫡"];
export const SHILL_REACTS = ["❤️", "😂", "🔥", "🚀", "👍", "💎"];
