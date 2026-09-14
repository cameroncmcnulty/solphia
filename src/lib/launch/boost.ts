import { isSolanaAddress } from "../security";
import type { LaunchBook } from "./engine";

/** One rocket is 24h of rank. More rockets = higher on the rail. */
export const ROCKET_SOL = 0.05;
export const ROCKET_MS = 24 * 60 * 60 * 1000;
export const ROCKET_MIN = 1;
export const ROCKET_MAX = 50;
export const HOUSE_OWNER = "solphia";
export const HOUSE_KEEP_MIN = 8;
export const HOUSE_KEEP_MAX = 10;
export const HOUSE_REFILL_AT = 7;
export const HOUSE_TOP = 10;

export const ROCKET_PACKS = [
  { rockets: 1, label: "24h" },
  { rockets: 2, label: "24h" },
  { rockets: 3, label: "24h" },
  { rockets: 5, label: "24h" },
  { rockets: 10, label: "24h" },
] as const;

export type BoostStatus = "queued" | "live" | "done";

export type LaunchBoost = {
  id: string;
  coinId: string;
  mint: string;
  symbol: string;
  owner: string;
  rockets: number;
  paidSol: number;
  sig: string;
  boughtAt: number;
  liveAt?: number;
  endsAt?: number;
  status: BoostStatus;
  house?: boolean;
};

export type BoostRank = {
  coinId: string;
  mint: string;
  symbol: string;
  rockets: number;
  endsAt: number;
  leftMs: number;
  image?: string;
};

export function rocketSol(n: number): number {
  return Math.round(n * ROCKET_SOL * 1_000_000) / 1_000_000;
}

export function rocketMs(_n = 1): number {
  return ROCKET_MS;
}

export function clampRockets(n: number): number {
  const v = Math.floor(Number(n) || 0);
  return Math.max(ROCKET_MIN, Math.min(ROCKET_MAX, v));
}

export function ensureBoosts(book: LaunchBook): LaunchBoost[] {
  if (!book.boosts) book.boosts = [];
  return book.boosts;
}

export function tickBoosts(book: LaunchBook, now = Date.now()): boolean {
  const rows = ensureBoosts(book);
  let dirty = false;
  for (const b of rows) {
    if (b.status === "queued") {
      b.status = "live";
      b.liveAt = b.liveAt || now;
      b.endsAt = b.liveAt + ROCKET_MS;
      dirty = true;
    }
    if (b.status === "live" && (b.endsAt || 0) <= now) {
      b.status = "done";
      dirty = true;
    }
  }
  if (rows.length > 160) {
    const keep = rows.filter((b) => b.status !== "done");
    const done = rows.filter((b) => b.status === "done").slice(-24);
    book.boosts = [...keep, ...done];
    dirty = true;
  }
  return dirty;
}

export function liveBoosts(book: LaunchBook, now = Date.now()): LaunchBoost[] {
  tickBoosts(book, now);
  return ensureBoosts(book)
    .filter((b) => b.status === "live")
    .sort((a, b) => b.rockets - a.rockets || (a.endsAt || 0) - (b.endsAt || 0));
}

export function rankedBoosts(book: LaunchBook, now = Date.now()): BoostRank[] {
  const map = new Map<string, BoostRank>();
  for (const b of liveBoosts(book, now)) {
    const key = b.mint || b.coinId;
    const prev = map.get(key);
    const leftMs = Math.max(0, (b.endsAt || 0) - now);
    if (!prev) {
      map.set(key, {
        coinId: b.coinId,
        mint: b.mint,
        symbol: b.symbol,
        rockets: b.rockets,
        endsAt: b.endsAt || 0,
        leftMs,
      });
    } else {
      prev.rockets += b.rockets;
      if ((b.endsAt || 0) > prev.endsAt) {
        prev.endsAt = b.endsAt || 0;
        prev.leftMs = leftMs;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.rockets - a.rockets || a.leftMs - b.leftMs);
}

export function queuedBoosts(_book: LaunchBook, _now = Date.now()): LaunchBoost[] {
  return [];
}

export function slotsOpen(_book: LaunchBook, _now = Date.now()): number {
  return 99;
}

export function queueEtaMs(_book: LaunchBook, _boostId: string, _now = Date.now()): number {
  return 0;
}

export function ownerBoosts(
  book: LaunchBook,
  owner: string,
  now = Date.now(),
): {
  live: LaunchBoost[];
  queued: { boost: LaunchBoost; position: number; etaMs: number }[];
} {
  tickBoosts(book, now);
  const live = liveBoosts(book, now).filter((b) => b.owner === owner);
  return { live, queued: [] };
}

export function buyBoost(
  book: LaunchBook,
  opts: {
    owner: string;
    coinId: string;
    mint?: string;
    symbol?: string;
    rockets: number;
    sig: string;
    paidSol: number;
    now?: number;
    house?: boolean;
  },
): { ok: true; boost: LaunchBoost } | { ok: false; error: string } {
  if (!opts.house && !isSolanaAddress(opts.owner)) return { ok: false, error: "bad_wallet" };
  const rockets = clampRockets(opts.rockets);
  const need = opts.house ? 0 : rocketSol(rockets);
  if (opts.paidSol + 1e-9 < need) return { ok: false, error: "short_pay" };
  const sig = (opts.sig || "").trim();
  if (sig.length < 32) return { ok: false, error: "bad_sig" };
  const rows = ensureBoosts(book);
  if (rows.some((b) => b.sig === sig)) return { ok: false, error: "replay" };
  const coin = book.coins.find((c) => c.id === opts.coinId || c.mint === opts.coinId);
  const coinId = coin?.id || opts.coinId;
  if (!coinId) return { ok: false, error: "not_found" };
  const now = opts.now || Date.now();
  tickBoosts(book, now);
  const boost: LaunchBoost = {
    id: `b_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    coinId,
    mint: coin?.mint || opts.mint || coinId,
    symbol: coin?.symbol || opts.symbol || "",
    owner: opts.house ? HOUSE_OWNER : opts.owner,
    rockets,
    paidSol: opts.paidSol,
    sig,
    boughtAt: now,
    liveAt: now,
    endsAt: now + ROCKET_MS,
    status: "live",
    house: Boolean(opts.house),
  };
  rows.push(boost);
  return { ok: true, boost };
}

export type HouseCoin = { id?: string; mint?: string; symbol?: string };

export function fillHouseBoosts(book: LaunchBook, candidates: HouseCoin[], now = Date.now()): boolean {
  tickBoosts(book, now);
  const ranked = rankedBoosts(book, now);
  const liveN = ranked.length;
  if (liveN >= HOUSE_KEEP_MIN) return false;
  const add =
    liveN === 0 ? HOUSE_KEEP_MIN + Math.floor(Math.random() * (HOUSE_KEEP_MAX - HOUSE_KEEP_MIN + 1)) : liveN <= 6 ? 3 : 2;
  const taken = new Set(ranked.map((r) => r.mint || r.coinId));
  const top = candidates.filter((c) => (c.mint || c.id) && !taken.has(c.mint || c.id || "")).slice(0, HOUSE_TOP);
  const pool = [...top];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let dirty = false;
  for (const c of pool.slice(0, add)) {
    const id = c.mint || c.id || "";
    const rockets = 1 + Math.floor(Math.random() * 4);
    const r = buyBoost(book, {
      owner: HOUSE_OWNER,
      coinId: id,
      mint: c.mint,
      symbol: c.symbol,
      rockets,
      sig: `house_${id}_${now}_${rockets}_${Math.random().toString(36).slice(2, 8)}`.padEnd(32, "x"),
      paidSol: 0,
      now,
      house: true,
    });
    if (r.ok) dirty = true;
  }
  return dirty;
}

export function publicLiveBoost(b: LaunchBoost, now = Date.now()) {
  return {
    id: b.id,
    coinId: b.coinId,
    mint: b.mint,
    symbol: b.symbol,
    rockets: b.rockets,
    endsAt: b.endsAt || 0,
    leftMs: Math.max(0, (b.endsAt || 0) - now),
    house: Boolean(b.house),
  };
}
