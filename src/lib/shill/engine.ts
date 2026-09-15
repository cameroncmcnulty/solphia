import { isSolanaAddress } from "../security";
import {
  SHILL_CA_COOLDOWN_MS,
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
  return Math.max(0, SHILL_PIN_SLOTS - livePins(book, now).length);
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
  if (book.pins.length >= SHILL_PIN_SLOTS) {
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
