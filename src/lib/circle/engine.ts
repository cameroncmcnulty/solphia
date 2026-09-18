import { isEmail, isSolanaAddress } from "../security";
import {
  CIRCLE_AIRDROP_MAX,
  CIRCLE_BOOST_PCT,
  CIRCLE_COLORS,
  CIRCLE_DEFAULT_CAP,
  CIRCLE_KEEP_MS,
  CIRCLE_MSG_MAX,
  CIRCLE_JOB_MAX,
  CIRCLE_PROMO_MAX,
  type CircleBook,
  type CircleJob,
  type CircleMember,
  type CircleMessage,
  type CirclePromo,
  type CircleRole,
} from "./types";

function pushMax<T>(arr: T[], item: T, max: number) {
  arr.push(item);
  if (arr.length > max) arr.splice(0, arr.length - max);
}

export function emptyCircle(): CircleBook {
  return { cap: CIRCLE_DEFAULT_CAP, members: {}, messages: [], airdrops: [], typing: {}, promos: [], jobs: [] };
}

export function mergeCircle(local: CircleBook, remote: CircleBook): CircleBook {
  const a = ensureCircle(local);
  const b = ensureCircle(remote);
  const members = { ...b.members, ...a.members };
  for (const pk of Object.keys(members)) {
    const x = a.members[pk];
    const y = b.members[pk];
    if (x && y) {
      members[pk] = {
        ...y,
        ...x,
        invitedPubkey: x.invitedPubkey || y.invitedPubkey,
        access: x.access === "ready" || y.access === "ready" ? "ready" : x.access || y.access,
        unclaimed: Math.max(x.unclaimed || 0, y.unclaimed || 0),
        claimed: Math.max(x.claimed || 0, y.claimed || 0),
      };
    }
  }
  const promo = new Map((b.promos || []).map((p) => [p.id, p]));
  for (const p of a.promos || []) promo.set(p.id, p);
  const jobs = new Map((b.jobs || []).map((j) => [j.id, j]));
  for (const j of a.jobs || []) jobs.set(j.id, j);
  const out: CircleBook = {
    cap: Math.max(a.cap || 0, b.cap || 0) || CIRCLE_DEFAULT_CAP,
    members,
    messages: a.messages.length >= b.messages.length ? a.messages : b.messages,
    airdrops: a.airdrops.length >= b.airdrops.length ? a.airdrops : b.airdrops,
    typing: {},
    promos: [...promo.values()].sort((x, y) => x.at - y.at).slice(-CIRCLE_PROMO_MAX),
    jobs: [...jobs.values()].sort((x, y) => y.at - x.at).slice(0, CIRCLE_JOB_MAX),
  };
  return ensureCircle(out);
}

export function ensureCircle(book?: CircleBook | null): CircleBook {
  const b = book || emptyCircle();
  if (!b.members) b.members = {};
  if (!b.messages) b.messages = [];
  if (!b.airdrops) b.airdrops = [];
  if (!b.typing) b.typing = {};
  if (!b.promos) b.promos = [];
  if (!b.jobs) b.jobs = [];
  b.typing = {};
  if (!(b.cap > 0)) b.cap = CIRCLE_DEFAULT_CAP;
  pruneCircle(b);
  return b;
}

/** Old seats without access are already in. Pending until one invite lands. */
export function hasAccess(m: CircleMember | undefined): boolean {
  if (!m || m.status === "banned") return false;
  if (m.role === "admin") return true;
  return m.access !== "pending";
}

export function inviteUrl(origin: string, pubkey: string): string {
  return `${origin.replace(/\/$/, "")}/circle?ref=${encodeURIComponent(pubkey)}`;
}

export function pruneCircle(book: CircleBook, now = Date.now()) {
  const cut = now - CIRCLE_KEEP_MS;
  if (book.messages.length) book.messages = book.messages.filter((m) => m.at >= cut);
  if (book.messages.length > CIRCLE_MSG_MAX) book.messages.splice(0, book.messages.length - CIRCLE_MSG_MAX);
  for (const m of book.messages) {
    if (!m.reactions) m.reactions = {};
    for (const [emoji, pks] of Object.entries(m.reactions)) {
      if (!pks?.length) delete m.reactions[emoji];
    }
  }
}

/** True when Redis still holds expired chat or leftover typing. */
export function circleStale(raw: CircleBook | null | undefined, pruned: CircleBook): boolean {
  if (!raw) return false;
  if ((raw.messages?.length || 0) !== pruned.messages.length) return true;
  if (raw.typing && Object.keys(raw.typing).length) return true;
  return false;
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
  opts: { pubkey: string; email: string; referrer?: string; now?: number; vip?: boolean },
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
    if (opts.vip) existing.access = "ready";
    return { ok: true, member: existing, created: false };
  }
  let referrer = (opts.referrer || "").trim();
  if (referrer === pubkey || !isSolanaAddress(referrer) || !book.members[referrer] || book.members[referrer].status === "banned") {
    referrer = "";
  }
  const host = referrer ? book.members[referrer] : undefined;
  const hostOpen = Boolean(host && host.status !== "banned" && !host.invitedPubkey);
  const member: CircleMember = {
    pubkey,
    email,
    joinedAt: now,
    referrer: referrer || undefined,
    role: "member",
    status: "ok",
    access: opts.vip || hostOpen ? "ready" : "pending",
    color: circleColor(pubkey),
    lastReadAt: now,
    unclaimed: 0,
    claimed: 0,
  };
  book.members[pubkey] = member;
  if (hostOpen && host) {
    host.invitedPubkey = pubkey;
    host.access = "ready";
  }
  return { ok: true, member, created: true };
}

export function addPromo(
  book: CircleBook,
  opts: { url: string; caption?: string; now?: number },
): { ok: true; promo: CirclePromo } | { ok: false; error: string } {
  const url = (opts.url || "").trim();
  if (!/^https?:\/\//i.test(url) && !url.startsWith("data:image/")) return { ok: false, error: "bad_url" };
  if ((book.promos || []).length >= CIRCLE_PROMO_MAX) return { ok: false, error: "full" };
  const promo: CirclePromo = {
    id: `p${(opts.now || Date.now()).toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    url,
    at: opts.now || Date.now(),
    caption: (opts.caption || "").trim().slice(0, 80) || undefined,
  };
  if (!book.promos) book.promos = [];
  book.promos.push(promo);
  return { ok: true, promo };
}

export function removePromo(book: CircleBook, id: string): boolean {
  const i = (book.promos || []).findIndex((p) => p.id === id);
  if (i < 0) return false;
  book.promos.splice(i, 1);
  return true;
}

export function addJob(
  book: CircleBook,
  opts: { title: string; blurb?: string; href?: string; now?: number },
): { ok: true; job: CircleJob } | { ok: false; error: string } {
  const title = (opts.title || "").trim().slice(0, 80);
  const blurb = (opts.blurb || "").trim().slice(0, 400);
  if (!title) return { ok: false, error: "need_title" };
  if ((book.jobs || []).length >= CIRCLE_JOB_MAX) return { ok: false, error: "full" };
  const href = (opts.href || "").trim().slice(0, 300);
  const job: CircleJob = {
    id: `j${(opts.now || Date.now()).toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title,
    blurb: blurb || "Open role with Solphia.",
    href: href || undefined,
    at: opts.now || Date.now(),
  };
  if (!book.jobs) book.jobs = [];
  book.jobs.unshift(job);
  if (book.jobs.length > CIRCLE_JOB_MAX) book.jobs.length = CIRCLE_JOB_MAX;
  return { ok: true, job };
}

export function removeJob(book: CircleBook, id: string): boolean {
  const i = (book.jobs || []).findIndex((j) => j.id === id);
  if (i < 0) return false;
  book.jobs.splice(i, 1);
  return true;
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
  pruneCircle(book, msg.at);
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
