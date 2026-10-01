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
  house?: boolean;
};

export type ShillMember = {
  pubkey: string;
  lastCaAt?: number;
  lastReadAt?: number;
  banned?: boolean;
  mutedUntil?: number;
};

export type ShillVote = {
  id: string;
  mint: string;
  owner: string;
  at: number;
  endsAt: number;
  symbol?: string;
  name?: string;
  image?: string;
};

export type HouseActor = {
  i: number;
  pubkey: string;
  named: boolean;
  nextShareAt: number;
  nextVoteAt: number;
  nextChatAt?: number;
  shareEveryMs: number;
  voteEveryMs: number;
  chatEveryMs?: number;
  voteP: number;
};

export type ShillBook = {
  messages: ShillMessage[];
  pins: ShillPin[];
  members: Record<string, ShillMember>;
  typing: Record<string, number>;
  votes?: ShillVote[];
  lastVoteAt?: Record<string, number>;
  lastHousePinAt?: number;
  nextHousePinAt?: number;
  houseActors?: HouseActor[];
  lastHouseShareAt?: number;
  lastHouseChatAt?: number;
  houseLive?: number;
  nextHouseLiveAt?: number;
  housePresent?: string[];
  houseBootedAt?: number;
};

/** Live room only. Oldest chat drops first so Redis stays small. Rank/votes do not live here. */
export const SHILL_MSG_MAX = 120;
/** 18h of idle history. Cap hits first in a busy room. */
export const SHILL_KEEP_MS = 18 * 3600_000;
export const SHILL_CA_COOLDOWN_MS = 30_000;
export const SHILL_PIN_SLOTS = 5;
export const SHILL_PIN_MS = 3 * 3600_000;
export const SHILL_PIN_SOL = 0.2;
export const SHILL_HOUSE_PIN_MIN = 2;
export const SHILL_HOUSE_PIN_MAX = 3;
/** After a house pin expires, wait this long before pinning a replacement. */
export const SHILL_HOUSE_REPLACE_MS = 2 * 60_000;
/** After a house pin lands, wait this long before another. */
export const SHILL_HOUSE_STAGGER_MS = 90 * 60_000;
/** Spread between initial house pins so they expire at different times. */
export const SHILL_HOUSE_SPREAD_MS = 75 * 60_000;
export const SHILL_VOTE_MS = 24 * 3600_000;
export const SHILL_VOTE_COOLDOWN_MS = 60 * 60_000;
export const SHILL_VOTE_MAX = 4000;
export const SHILL_HOUSE_OWNER = "solphia";
/** A wallet is "in the room" only while it is still heartbeating. */
export const SHILL_PRESENCE_MS = 25_000;
export const SHILL_STICKERS = ["🚀", "🔥", "💎", "🐸", "👑", "🪩", "🎉", "💸", "🧠", "🫡", "👀"];
export const SHILL_REACTS = ["❤️", "😂", "🔥", "🚀", "👍", "💎", "👀"];
