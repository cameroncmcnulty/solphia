import { isSolanaAddress } from "../security";
import { publicImage } from "../token/art";
import type { LaunchBook } from "./engine";

/** One pack is 24h of rank. More rockets = higher on the rail. */
export const ROCKET_MS = 24 * 60 * 60 * 1000;
export const ROCKET_MIN = 10;
export const ROCKET_MAX = 500;
export const HOUSE_OWNER = "solphia";
export const HOUSE_KEEP_MIN = 6;
export const HOUSE_KEEP_MAX = 9;
export const HOUSE_INITIAL = 3;
export const HOUSE_REFILL_AT = 5;
export const HOUSE_TOP = 24;
/** Spread fake start times so two house boosts never share a timestamp. */
export const HOUSE_SPREAD_MS = 2 * 60 * 60 * 1000;
export const HOUSE_JITTER_MS = 40 * 60 * 1000;
export const HOUSE_STAGGER_MS = 45 * 60 * 1000;
export const HOUSE_REPLACE_MS = 5 * 60 * 1000;
export const HOUSE_MIN_LEFT_MS = 3 * 60 * 60 * 1000;
export const HOUSE_CLUSTER_MS = 2 * 60 * 1000;
export const MEGA_ROCKETS = 500;

export const ROCKET_PACKS = [
  { rockets: 10, sol: 0.5, label: "10 rockets" },
  { rockets: 30, sol: 1, label: "30 rockets" },
  { rockets: 100, sol: 2, label: "100 rockets" },
  { rockets: 500, sol: 3, label: "500 rockets" },
] as const;

export type BoostStatus = "queued" | "live" | "done";

export type LaunchBoost = {
  id: string;
  coinId: string;
  mint: string;
  symbol: string;
  name?: string;
  image?: string;
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
  name?: string;
  rockets: number;
  endsAt: number;
  leftMs: number;
  lastBoostAt: number;
  image?: string;
  mega?: boolean;
};

export type BoostSort = "top" | "latest";

export function rocketSol(n: number): number {
  const pack = ROCKET_PACKS.find((p) => p.rockets === n);
  if (pack) return pack.sol;
  if (n >= MEGA_ROCKETS) return 3;
  if (n >= 100) return 2;
  if (n >= 30) return 1;
  return 0.5;
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

export function rankedBoosts(book: LaunchBook, now = Date.now(), sort: BoostSort = "top"): BoostRank[] {
  const map = new Map<string, BoostRank>();
  for (const b of liveBoosts(book, now)) {
    const key = b.mint || b.coinId;
    const coin = book.coins.find((c) => c.id === b.coinId || c.mint === b.mint);
    const leftMs = Math.max(0, (b.endsAt || 0) - now);
    const prev = map.get(key);
    if (!prev) {
      const rockets = b.rockets;
      map.set(key, {
        coinId: b.coinId,
        mint: b.mint,
        symbol: b.symbol || coin?.symbol || "",
        name: b.name || coin?.name,
        rockets,
        endsAt: b.endsAt || 0,
        leftMs,
        lastBoostAt: b.boughtAt || b.liveAt || now,
        image: publicImage(b.image || coin?.image) || b.image || coin?.image,
        mega: rockets >= MEGA_ROCKETS,
      });
    } else {
      prev.rockets += b.rockets;
      prev.mega = prev.rockets >= MEGA_ROCKETS;
      prev.lastBoostAt = Math.max(prev.lastBoostAt, b.boughtAt || b.liveAt || 0);
      if ((b.endsAt || 0) > prev.endsAt) {
        prev.endsAt = b.endsAt || 0;
        prev.leftMs = leftMs;
      }
      if (!prev.image && (b.image || coin?.image)) prev.image = publicImage(b.image || coin?.image) || b.image || coin?.image;
      if (!prev.name && (b.name || coin?.name)) prev.name = b.name || coin?.name;
    }
  }
  const rows = [...map.values()];
  if (sort === "latest") return rows.sort((a, b) => b.lastBoostAt - a.lastBoostAt || b.rockets - a.rockets);
  return rows.sort((a, b) => b.rockets - a.rockets || a.leftMs - b.leftMs);
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
    name?: string;
    image?: string;
    rockets: number;
    sig: string;
    paidSol: number;
    now?: number;
    liveAt?: number;
    endsAt?: number;
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
  const coin = book.coins.find((c) => c.id === opts.coinId || c.mint === opts.coinId || c.mint === opts.mint);
  const coinId = coin?.id || opts.coinId || opts.mint || "";
  if (!coinId) return { ok: false, error: "not_found" };
  const now = opts.now || Date.now();
  tickBoosts(book, now);
  const liveAt = opts.liveAt || now;
  const endsAt = Math.max(opts.endsAt || liveAt + ROCKET_MS, now + 1_000);
  const boost: LaunchBoost = {
    id: `b_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    coinId,
    mint: coin?.mint || opts.mint || coinId,
    symbol: coin?.symbol || opts.symbol || "",
    name: coin?.name || opts.name,
    image: coin?.image || opts.image,
    owner: opts.house ? HOUSE_OWNER : opts.owner,
    rockets,
    paidSol: opts.paidSol,
    sig,
    boughtAt: liveAt,
    liveAt,
    endsAt,
    status: "live",
    house: Boolean(opts.house),
  };
  rows.push(boost);
  return { ok: true, boost };
}

export type HouseCoin = { id?: string; mint?: string; symbol?: string; name?: string; image?: string; born?: boolean };

function jitter(max = HOUSE_JITTER_MS): number {
  return Math.floor(Math.random() * Math.max(0, max));
}

export function padLaunchMints(book: LaunchBook): Set<string> {
  const out = new Set<string>();
  for (const c of book.coins || []) {
    if (c.mint) out.add(c.mint);
    if (c.id) out.add(c.id);
  }
  return out;
}

export function dropPadHouseBoosts(book: LaunchBook): boolean {
  const pad = padLaunchMints(book);
  if (!pad.size) return false;
  const rows = ensureBoosts(book);
  const next = rows.filter((b) => !(b.house && pad.has(b.mint || b.coinId)));
  if (next.length === rows.length) return false;
  book.boosts = next;
  return true;
}

function houseMarketPool(book: LaunchBook, candidates: HouseCoin[], taken: Set<string>): HouseCoin[] {
  const pad = padLaunchMints(book);
  const pool = candidates.filter((c) => {
    const id = c.mint || c.id || "";
    if (!id || taken.has(id) || pad.has(id) || c.born) return false;
    return true;
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, HOUSE_TOP);
}

function houseTimesClustered(rows: LaunchBoost[], now: number): boolean {
  const house = rows.filter((b) => b.house && b.status === "live" && (b.endsAt || 0) > now);
  if (house.length < 2) return false;
  const bought = house.map((b) => b.boughtAt || b.liveAt || 0).sort((a, b) => a - b);
  for (let i = 1; i < bought.length; i++) {
    if (bought[i] - bought[i - 1] < HOUSE_CLUSTER_MS) return true;
  }
  const ends = house.map((b) => b.endsAt || 0).sort((a, b) => a - b);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i] - ends[i - 1] < HOUSE_CLUSTER_MS) return true;
  }
  return false;
}

/** One-time spread so a bad batch does not look planted together. Never wipes the row. */
export function organicizeHouseBoosts(book: LaunchBook, now = Date.now()): boolean {
  const rows = ensureBoosts(book).filter((b) => b.house && b.status === "live" && (b.endsAt || 0) > now);
  if (!houseTimesClustered(rows, now)) return false;
  const order = [...rows].sort((a, b) => (b.rockets || 0) - (a.rockets || 0));
  order.forEach((b, i) => {
    const age = (order.length - 1 - i) * HOUSE_SPREAD_MS + jitter();
    const boughtAt = now - age;
    const left = HOUSE_MIN_LEFT_MS + i * HOUSE_SPREAD_MS + jitter();
    b.boughtAt = boughtAt;
    b.liveAt = boughtAt;
    b.endsAt = Math.min(boughtAt + ROCKET_MS, now + left);
    if ((b.endsAt || 0) <= now) b.endsAt = now + HOUSE_MIN_LEFT_MS + jitter(HOUSE_JITTER_MS);
  });
  return true;
}

function plantHouseBoost(
  book: LaunchBook,
  c: HouseCoin,
  now: number,
  slot: number,
  batch: boolean,
  mega: boolean,
): boolean {
  const id = c.mint || c.id || "";
  if (!id) return false;
  const age = (batch ? slot * HOUSE_SPREAD_MS : 0) + jitter();
  const liveAt = now - age;
  const left = HOUSE_MIN_LEFT_MS + slot * (HOUSE_SPREAD_MS / 2) + jitter();
  const endsAt = Math.min(liveAt + ROCKET_MS, now + left);
  const roll = Math.random();
  const rockets = mega ? MEGA_ROCKETS : roll < 0.2 ? 100 : roll < 0.5 ? 30 : 10;
  const r = buyBoost(book, {
    owner: HOUSE_OWNER,
    coinId: id,
    mint: c.mint || id,
    symbol: c.symbol,
    name: c.name,
    image: c.image,
    rockets,
    sig: `house_${id}_${now}_${slot}_${rockets}_${Math.random().toString(36).slice(2, 8)}`.padEnd(32, "x"),
    paidSol: 0,
    now: liveAt,
    liveAt,
    endsAt: Math.max(endsAt, now + HOUSE_MIN_LEFT_MS),
    house: true,
  });
  return r.ok;
}

export function fillHouseBoosts(book: LaunchBook, candidates: HouseCoin[], now = Date.now()): boolean {
  tickBoosts(book, now);
  let dirty = dropPadHouseBoosts(book);
  if (organicizeHouseBoosts(book, now)) dirty = true;
  const ranked = rankedBoosts(book, now);
  const houseN = liveBoosts(book, now).filter((b) => b.house).length;
  if (houseN >= HOUSE_KEEP_MIN) {
    if (dirty) {
      book.lastHouseBoostAt = book.lastHouseBoostAt || now;
    }
    return dirty;
  }
  const taken = new Set(ranked.map((r) => r.mint || r.coinId));
  const recentDone = ensureBoosts(book)
    .filter((b) => b.house && b.status === "done" && (b.endsAt || 0) > now - 6 * 3600_000)
    .map((b) => b.mint || b.coinId);
  const takenWithRecent = new Set(taken);
  for (const id of recentDone) takenWithRecent.add(id);
  const varied = houseMarketPool(book, candidates, takenWithRecent);
  const pool = varied.length ? varied : houseMarketPool(book, candidates, taken);
  if (!pool.length) return dirty;

  // Empty rail: replant a small mixed batch even if we had planted before.
  if (houseN === 0) {
    const add = Math.min(HOUSE_INITIAL, pool.length);
    if (!add) return dirty;
    const megaN = Math.min(1, add);
    for (let i = 0; i < add; i++) {
      if (plantHouseBoost(book, pool[i], now, add - 1 - i, true, i < megaN)) dirty = true;
    }
    book.lastHouseBoostAt = now;
    book.nextHouseBoostAt = now + HOUSE_STAGGER_MS;
    return dirty;
  }

  const due = book.nextHouseBoostAt || 0;
  const sparse = houseN < HOUSE_INITIAL;
  if (due && now < due && !(sparse && due - now > HOUSE_REPLACE_MS)) return dirty;
  if (!due) {
    book.nextHouseBoostAt = now + (sparse ? HOUSE_REPLACE_MS : HOUSE_STAGGER_MS);
    return dirty;
  }
  const hasMega = ranked.some((r) => r.mega || r.rockets >= MEGA_ROCKETS);
  if (plantHouseBoost(book, pool[0], now, 0, false, !hasMega && Math.random() < 0.25)) dirty = true;
  book.lastHouseBoostAt = now;
  const nextN = liveBoosts(book, now).filter((b) => b.house).length;
  book.nextHouseBoostAt = now + (nextN < HOUSE_INITIAL ? HOUSE_REPLACE_MS : HOUSE_STAGGER_MS);
  return dirty;
}

export function publicLiveBoost(b: LaunchBoost, now = Date.now()) {
  return {
    id: b.id,
    coinId: b.coinId,
    mint: b.mint,
    symbol: b.symbol,
    name: b.name,
    image: publicImage(b.image) || b.image,
    rockets: b.rockets,
    mega: b.rockets >= MEGA_ROCKETS,
    endsAt: b.endsAt || 0,
    leftMs: Math.max(0, (b.endsAt || 0) - now),
    house: Boolean(b.house),
  };
}
