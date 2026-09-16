import { isSolanaAddress } from "../security";
import {
  SHILL_CA_COOLDOWN_MS,
  SHILL_HOUSE_OWNER,
  SHILL_HOUSE_PIN_MAX,
  SHILL_HOUSE_PIN_MIN,
  SHILL_KEEP_MS,
  SHILL_MSG_MAX,
  SHILL_PIN_MS,
  SHILL_PIN_SLOTS,
  SHILL_PIN_SOL,
  type ShillBook,
  type ShillMember,
  type ShillMessage,
  type ShillPin,
  type ShillToken,
} from "./types";

function pushMax<T>(arr: T[], item: T, max: number) {
  arr.push(item);
  if (arr.length > max) arr.splice(0, arr.length - max);
}

export function emptyShill(): ShillBook {
  return { messages: [], pins: [], members: {}, typing: {} };
}

/** Union two books so a empty isolate cannot wipe Redis. Local wins on the same id. */
export function mergeShill(local: ShillBook, remote: ShillBook): ShillBook {
  const a = ensureShill(local);
  const b = ensureShill(remote);
  const msgs = new Map<string, ShillMessage>();
  for (const m of b.messages) msgs.set(m.id, m);
  for (const m of a.messages) msgs.set(m.id, m);
  const pins = new Map<string, ShillPin>();
  for (const p of b.pins) pins.set(p.id, p);
  for (const p of a.pins) pins.set(p.id, p);
  const members = { ...b.members, ...a.members };
  const out: ShillBook = {
    messages: [...msgs.values()].sort((x, y) => x.at - y.at),
    pins: [...pins.values()].sort((x, y) => x.at - y.at),
    members,
    typing: {},
  };
  pruneShill(out);
  return out;
}

export function slimShill(book?: ShillBook | null): ShillBook {
  const b = ensureShill(book);
  return {
    messages: b.messages.slice(-80),
    pins: b.pins.slice(-SHILL_PIN_SLOTS),
    members: b.members,
    typing: {},
  };
}

export function ensureShill(book?: ShillBook | null): ShillBook {
  const b = book || emptyShill();
  if (!b.messages) b.messages = [];
  if (!b.pins) b.pins = [];
  if (!b.members) b.members = {};
  if (!b.typing) b.typing = {};
  b.typing = {};
  pruneShill(b);
  return b;
}

export function pruneShill(book: ShillBook, now = Date.now()) {
  const cut = now - SHILL_KEEP_MS;
  if (book.messages.length) book.messages = book.messages.filter((m) => m.at >= cut);
  if (book.messages.length > SHILL_MSG_MAX) book.messages.splice(0, book.messages.length - SHILL_MSG_MAX);
  book.pins = (book.pins || []).filter((p) => p.endsAt > now);
  for (const m of book.messages) {
    if (!m.reactions) m.reactions = {};
  }
  for (const [pk, m] of Object.entries(book.members || {})) {
    if (m.banned || (m.mutedUntil && m.mutedUntil > now)) continue;
    const last = Math.max(m.lastReadAt || 0, m.lastCaAt || 0);
    if (last < cut) delete book.members[pk];
  }
}

export function touchMember(book: ShillBook, pubkey: string, now = Date.now()): ShillMember {
  let m = book.members[pubkey];
  if (!m) {
    m = { pubkey };
    book.members[pubkey] = m;
  }
  m.lastReadAt = now;
  return m;
}

const CA_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

export function extractCas(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const hits = text.match(CA_RE) || [];
  for (const h of hits) {
    if (!isSolanaAddress(h) || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

export function livePins(book: ShillBook, now = Date.now()): ShillPin[] {
  pruneShill(book, now);
  return [...book.pins].sort((a, b) => b.at - a.at);
}

export function pinSlotsLeft(book: ShillBook, now = Date.now()): number {
  const paid = livePins(book, now).filter((p) => !p.house).length;
  return Math.max(0, SHILL_PIN_SLOTS - paid);
}

export function nextPinFreeAt(book: ShillBook, now = Date.now()): number {
  const live = livePins(book, now);
  if (live.length < SHILL_PIN_SLOTS) return now;
  return Math.min(...live.map((p) => p.endsAt));
}

export function postShill(
  book: ShillBook,
  opts: {
    owner: string;
    kind?: ShillMessage["kind"];
    text?: string;
    media?: string;
    sticker?: string;
    replyTo?: string;
    token?: ShillToken;
    now?: number;
  },
): { ok: true; message: ShillMessage } | { ok: false; error: string; waitMs?: number } {
  if (!isSolanaAddress(opts.owner)) return { ok: false, error: "bad_wallet" };
  const now = opts.now || Date.now();
  const me = touchMember(book, opts.owner, now);
  if (me.banned) return { ok: false, error: "banned" };
  if (me.mutedUntil && me.mutedUntil > now) return { ok: false, error: "muted", waitMs: me.mutedUntil - now };
  const kind = opts.kind || (opts.sticker ? "sticker" : opts.media ? "media" : "text");
  const text = (opts.text || "").trim().slice(0, 2000);
  if (kind === "text" && !text) return { ok: false, error: "empty" };
  if (kind === "media" && !opts.media) return { ok: false, error: "empty" };
  if (kind === "sticker" && !opts.sticker) return { ok: false, error: "empty" };
  const cas = extractCas(text);
  if (cas.length || opts.token) {
    const wait = SHILL_CA_COOLDOWN_MS - (now - (me.lastCaAt || 0));
    if (me.lastCaAt && wait > 0) return { ok: false, error: "ca_cooldown", waitMs: wait };
    me.lastCaAt = now;
  }
  const msg: ShillMessage = {
    id: `s${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    owner: opts.owner,
    kind,
    text: text || undefined,
    media: opts.media,
    sticker: opts.sticker,
    replyTo: opts.replyTo,
    reactions: {},
    token: opts.token,
  };
  pruneShill(book, now);
  pushMax(book.messages, msg, SHILL_MSG_MAX);
  return { ok: true, message: msg };
}

export function reactShill(book: ShillBook, opts: { owner: string; id: string; emoji: string }): boolean {
  if (!isSolanaAddress(opts.owner)) return false;
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

export function muteShill(book: ShillBook, pubkey: string, ms: number, now = Date.now()): boolean {
  if (!isSolanaAddress(pubkey)) return false;
  const m = touchMember(book, pubkey, now);
  if (m.banned) return false;
  m.mutedUntil = now + Math.max(0, ms);
  return true;
}

export function banShill(book: ShillBook, pubkey: string, on = true, now = Date.now()): boolean {
  if (!isSolanaAddress(pubkey)) return false;
  const m = touchMember(book, pubkey, now);
  m.banned = on;
  if (on) m.mutedUntil = undefined;
  return true;
}

export function deleteShill(book: ShillBook, id: string, owner?: string): boolean {
  const i = book.messages.findIndex((m) => m.id === id);
  if (i < 0) return false;
  if (owner && book.messages[i].owner !== owner) return false;
  book.messages.splice(i, 1);
  return true;
}

export function pinToken(
  book: ShillBook,
  opts: {
    owner: string;
    token: ShillToken;
    sig: string;
    paidSol: number;
    now?: number;
  },
): { ok: true; pin: ShillPin } | { ok: false; error: string; nextFreeAt?: number } {
  if (!isSolanaAddress(opts.owner)) return { ok: false, error: "bad_wallet" };
  if (!isSolanaAddress(opts.token.mint)) return { ok: false, error: "bad_mint" };
  if (opts.paidSol + 1e-9 < SHILL_PIN_SOL) return { ok: false, error: "short_pay" };
  const sig = (opts.sig || "").trim();
  if (sig.length < 32) return { ok: false, error: "bad_sig" };
  const now = opts.now || Date.now();
  pruneShill(book, now);
  if (book.pins.some((p) => p.sig === sig)) return { ok: false, error: "replay" };
  const paid = book.pins.filter((p) => !p.house).length;
  if (paid >= SHILL_PIN_SLOTS) {
    return { ok: false, error: "full", nextFreeAt: nextPinFreeAt(book, now) };
  }
  const pin: ShillPin = {
    id: `pin${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    mint: opts.token.mint,
    symbol: opts.token.symbol,
    name: opts.token.name,
    image: opts.token.image,
    priceUsd: opts.token.priceUsd,
    mcUsd: opts.token.mcUsd,
    owner: opts.owner,
    sig,
    paidSol: opts.paidSol,
    at: now,
    endsAt: now + SHILL_PIN_MS,
  };
  book.pins.push(pin);
  return { ok: true, pin };
}

export type HousePinCoin = { mint: string; symbol?: string; name?: string; image?: string; priceUsd?: number; mcUsd?: number };

export function fillHousePins(book: ShillBook, candidates: HousePinCoin[], now = Date.now()): boolean {
  pruneShill(book, now);
  const live = livePins(book, now);
  const n = live.length;
  let add = 0;
  if (n <= 0) add = SHILL_HOUSE_PIN_MIN + (Math.random() < 0.5 ? 1 : 0);
  else if (n === 1 || n === 2) add = 1;
  if (!add) return false;
  if (n + add > SHILL_HOUSE_PIN_MAX && n >= SHILL_HOUSE_PIN_MIN) add = Math.max(0, SHILL_HOUSE_PIN_MAX - n);
  if (!add) return false;
  const taken = new Set(live.map((p) => p.mint));
  const pool = candidates.filter((c) => c.mint && !taken.has(c.mint));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, add);
  if (!picks.length) return false;
  picks.forEach((c, i) => {
    const life = (42 + Math.floor(Math.random() * 48)) * 60_000;
    book.pins.push({
      id: `hpin${now.toString(36)}${i}${Math.random().toString(36).slice(2, 5)}`,
      mint: c.mint,
      symbol: c.symbol || c.mint.slice(0, 4),
      name: c.name || c.symbol || "token",
      image: c.image,
      priceUsd: c.priceUsd,
      mcUsd: c.mcUsd,
      owner: SHILL_HOUSE_OWNER,
      sig: `house_pin_${c.mint}_${now}_${i}`.padEnd(40, "x"),
      paidSol: 0,
      at: now - i,
      endsAt: now + life,
      house: true,
    });
  });
  return true;
}
