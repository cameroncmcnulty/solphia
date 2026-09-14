import { isEmail, isSolanaAddress } from "../security";
import {
  CIRCLE_AIRDROP_MAX,
  CIRCLE_BOOST_PCT,
  CIRCLE_COLORS,
  CIRCLE_DEFAULT_CAP,
  CIRCLE_MSG_MAX,
  type CircleBook,
  type CircleMember,
  type CircleMessage,
  type CircleRole,
} from "./types";

function pushMax<T>(arr: T[], item: T, max: number) {
  arr.push(item);
  if (arr.length > max) arr.splice(0, arr.length - max);
}

export function emptyCircle(): CircleBook {
  return { cap: CIRCLE_DEFAULT_CAP, members: {}, messages: [], airdrops: [], typing: {} };
}

export function ensureCircle(book?: CircleBook | null): CircleBook {
  const b = book || emptyCircle();
  if (!b.members) b.members = {};
  if (!b.messages) b.messages = [];
  if (!b.airdrops) b.airdrops = [];
  if (!b.typing) b.typing = {};
  if (!(b.cap > 0)) b.cap = CIRCLE_DEFAULT_CAP;
  return b;
}

export function circleColor(pubkey: string): string {
  let h = 0;
  for (let i = 0; i < pubkey.length; i++) h = (h * 33 + pubkey.charCodeAt(i)) >>> 0;
  return CIRCLE_COLORS[h % CIRCLE_COLORS.length];
}

export function activeMembers(book: CircleBook): CircleMember[] {
  return Object.values(book.members).filter((m) => m.status !== "banned");
}

export function spotsLeft(book: CircleBook): number {
  return Math.max(0, book.cap - activeMembers(book).length);
}

export function referralCount(book: CircleBook, pubkey: string): number {
  return activeMembers(book).filter((m) => m.referrer === pubkey).length;
}

export function boostPct(book: CircleBook, pubkey: string): number {
  return referralCount(book, pubkey) * CIRCLE_BOOST_PCT;
}

/** Weight 1.00 + 5% per qualified referral. */
export function airdropWeight(book: CircleBook, pubkey: string): number {
  return 1 + boostPct(book, pubkey) / 100;
}

export function isMuted(m: CircleMember, now = Date.now()): boolean {
  if (m.status === "banned") return true;
  if (m.status === "muted") return !m.mutedUntil || m.mutedUntil > now;
  return Boolean(m.mutedUntil && m.mutedUntil > now);
}

export function canModerate(m: CircleMember | undefined): boolean {
  return Boolean(m && m.status !== "banned" && (m.role === "mod" || m.role === "admin"));
}

export function canAdmin(m: CircleMember | undefined): boolean {
  return Boolean(m && m.status !== "banned" && m.role === "admin");
}

export function joinCircle(
  book: CircleBook,
  opts: { pubkey: string; email: string; referrer?: string; now?: number },
): { ok: true; member: CircleMember; created: boolean } | { ok: false; error: string } {
  const pubkey = (opts.pubkey || "").trim();
  const email = (opts.email || "").trim().toLowerCase();
  if (!isSolanaAddress(pubkey)) return { ok: false, error: "bad_wallet" };
  if (!isEmail(email)) return { ok: false, error: "bad_email" };
  const now = opts.now || Date.now();
  const existing = book.members[pubkey];
  if (existing) {
    if (existing.status === "banned") return { ok: false, error: "banned" };
    existing.email = email;
    existing.lastReadAt = now;
    return { ok: true, member: existing, created: false };
  }
  if (spotsLeft(book) <= 0) return { ok: false, error: "full" };
  let referrer = (opts.referrer || "").trim();
  if (referrer === pubkey || !isSolanaAddress(referrer) || !book.members[referrer] || book.members[referrer].status === "banned") {
    referrer = "";
  }
  const member: CircleMember = {
    pubkey,
    email,
    joinedAt: now,
    referrer: referrer || undefined,
    role: "member",
    status: "ok",
    color: circleColor(pubkey),
    lastReadAt: now,
    unclaimed: 0,
    claimed: 0,
  };
  book.members[pubkey] = member;
  return { ok: true, member, created: true };
}

export function postMessage(
  book: CircleBook,
  opts: {
    owner: string;
    kind?: CircleMessage["kind"];
    text?: string;
    media?: string;
    sticker?: string;
    replyTo?: string;
    now?: number;
  },
): { ok: true; message: CircleMessage } | { ok: false; error: string } {
  const m = book.members[opts.owner];
  if (!m || m.status === "banned") return { ok: false, error: "not_member" };
  if (isMuted(m, opts.now)) return { ok: false, error: "muted" };
  const kind = opts.kind || (opts.sticker ? "sticker" : opts.media ? "media" : "text");
  const text = (opts.text || "").trim().slice(0, 2000);
  if (kind === "text" && !text) return { ok: false, error: "empty" };
  if (kind === "media" && !opts.media) return { ok: false, error: "empty" };
  if (kind === "sticker" && !opts.sticker) return { ok: false, error: "empty" };
  const msg: CircleMessage = {
    id: `c${(opts.now || Date.now()).toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    at: opts.now || Date.now(),
    owner: opts.owner,
    kind,
    text: text || undefined,
    media: opts.media,
    sticker: opts.sticker,
    replyTo: opts.replyTo,
    reactions: {},
  };
  pushMax(book.messages, msg, CIRCLE_MSG_MAX);
  return { ok: true, message: msg };
}

export function reactMessage(book: CircleBook, opts: { owner: string; id: string; emoji: string }): boolean {
  const m = book.members[opts.owner];
  if (!m || m.status === "banned") return false;
  const msg = book.messages.find((x) => x.id === opts.id);
  if (!msg) return false;
  const emoji = opts.emoji.slice(0, 8);
  if (!msg.reactions) msg.reactions = {};
  const cur = new Set(msg.reactions[emoji] || []);
  if (cur.has(opts.owner)) cur.delete(opts.owner);
  else cur.add(opts.owner);
  if (cur.size) msg.reactions[emoji] = [...cur];
  else delete msg.reactions[emoji];
  return true;
}

export function deleteMessage(book: CircleBook, id: string): boolean {
  const i = book.messages.findIndex((m) => m.id === id);
  if (i < 0) return false;
  book.messages.splice(i, 1);
  return true;
}

export function setRole(book: CircleBook, pubkey: string, role: CircleRole): boolean {
  const m = book.members[pubkey];
  if (!m) return false;
  m.role = role;
  return true;
}

export function banMember(book: CircleBook, pubkey: string, banned: boolean): boolean {
  const m = book.members[pubkey];
  if (!m) return false;
  m.status = banned ? "banned" : "ok";
  if (!banned) m.mutedUntil = undefined;
  return true;
}

export function muteMember(book: CircleBook, pubkey: string, ms: number, now = Date.now()): boolean {
  const m = book.members[pubkey];
  if (!m || m.status === "banned") return false;
  if (ms <= 0) {
    m.status = "ok";
    m.mutedUntil = undefined;
    return true;
  }
  m.status = "muted";
  m.mutedUntil = now + ms;
  return true;
}

export function runAirdrop(
  book: CircleBook,
  total: number,
  now = Date.now(),
): { ok: true; id: string; heads: number; shares: { pubkey: string; amount: number; weight: number }[] } | { ok: false; error: string } {
  if (!(total > 0)) return { ok: false, error: "bad_amount" };
  const heads = activeMembers(book).filter((m) => m.email);
  if (!heads.length) return { ok: false, error: "no_members" };
  const weights = heads.map((m) => ({ m, w: airdropWeight(book, m.pubkey) }));
  const sum = weights.reduce((s, x) => s + x.w, 0);
  const shares = weights.map((x) => {
    const amount = (total * x.w) / sum;
    x.m.unclaimed = (x.m.unclaimed || 0) + amount;
    return { pubkey: x.m.pubkey, amount, weight: x.w };
  });
  const run = { id: `a${now.toString(36)}`, at: now, total, heads: heads.length };
  pushMax(book.airdrops, run, CIRCLE_AIRDROP_MAX);
  return { ok: true, id: run.id, heads: heads.length, shares };
}

export function claimAmount(book: CircleBook, pubkey: string): number {
  return book.members[pubkey]?.unclaimed || 0;
}

export function markClaimed(book: CircleBook, pubkey: string, amount: number): boolean {
  const m = book.members[pubkey];
  if (!m || !(amount > 0) || m.unclaimed + 1e-9 < amount) return false;
  m.unclaimed -= amount;
  m.claimed = (m.claimed || 0) + amount;
  return true;
}
