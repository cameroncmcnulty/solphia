import { isSolanaAddress } from "../security";
import type { LaunchBook } from "./engine";

export const BOOST_SLOTS = 10;
export const ROCKET_SOL = 0.05;
export const ROCKET_MS = 30 * 60_000;
export const ROCKET_MIN = 1;
export const ROCKET_MAX = 24;

export const ROCKET_PACKS = [
  { rockets: 1, label: "30m" },
  { rockets: 3, label: "2h" },
  { rockets: 6, label: "6h" },
  { rockets: 12, label: "12h" },
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
};

export function rocketSol(n: number): number {
  return Math.round(n * ROCKET_SOL * 1_000_000) / 1_000_000;
}

export function rocketMs(n: number): number {
  return Math.max(ROCKET_MIN, n) * ROCKET_MS;
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
    if (b.status === "live" && (b.endsAt || 0) <= now) {
      b.status = "done";
      dirty = true;
    }
  }
  let liveN = rows.filter((b) => b.status === "live").length;
  const queued = rows.filter((b) => b.status === "queued").sort((a, b) => a.boughtAt - b.boughtAt);
  for (const b of queued) {
    if (liveN >= BOOST_SLOTS) break;
    b.status = "live";
    b.liveAt = now;
    b.endsAt = now + rocketMs(b.rockets);
    liveN += 1;
    dirty = true;
  }
  if (rows.length > 80) {
    const keep = rows.filter((b) => b.status !== "done");
    const done = rows.filter((b) => b.status === "done").slice(-20);
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

export function queuedBoosts(book: LaunchBook, now = Date.now()): LaunchBoost[] {
  tickBoosts(book, now);
  return ensureBoosts(book)
    .filter((b) => b.status === "queued")
    .sort((a, b) => a.boughtAt - b.boughtAt);
}

export function slotsOpen(book: LaunchBook, now = Date.now()): number {
  return Math.max(0, BOOST_SLOTS - liveBoosts(book, now).length);
}

export function queueEtaMs(book: LaunchBook, boostId: string, now = Date.now()): number {
  tickBoosts(book, now);
  const live = liveBoosts(book, now);
  const queued = queuedBoosts(book, now);
  const idx = queued.findIndex((b) => b.id === boostId);
  if (idx < 0) return 0;
  const times = live.map((b) => b.endsAt || now).sort((a, b) => a - b);
  if (!times.length) return 0;
  for (let i = 0; i < idx; i++) {
    const start = times.shift() || now;
    times.push(start + rocketMs(queued[i].rockets));
    times.sort((a, b) => a - b);
  }
  return Math.max(0, (times[0] || now) - now);
}

export function ownerBoosts(book: LaunchBook, owner: string, now = Date.now()): {
  live: LaunchBoost[];
  queued: { boost: LaunchBoost; position: number; etaMs: number }[];
} {
  tickBoosts(book, now);
  const live = liveBoosts(book, now).filter((b) => b.owner === owner);
  const q = queuedBoosts(book, now);
  const queued = q
    .map((boost, i) => ({ boost, position: i + 1, etaMs: queueEtaMs(book, boost.id, now) }))
    .filter((row) => row.boost.owner === owner);
  return { live, queued };
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
  },
): { ok: true; boost: LaunchBoost } | { ok: false; error: string } {
  if (!isSolanaAddress(opts.owner)) return { ok: false, error: "bad_wallet" };
  const rockets = clampRockets(opts.rockets);
  const need = rocketSol(rockets);
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
    owner: opts.owner,
    rockets,
    paidSol: opts.paidSol,
    sig,
    boughtAt: now,
    status: "queued",
  };
  rows.push(boost);
  tickBoosts(book, now);
  return { ok: true, boost };
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
  };
}
