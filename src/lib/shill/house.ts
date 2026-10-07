import { createHash } from "crypto";
import { Keypair } from "@solana/web3.js";
import { isSolanaAddress } from "../security";
import { emptyLaunchBook, setAccountPfp, type LaunchBook } from "../launch/engine";
import { fillHouseBoosts, HOUSE_INITIAL, padLaunchMints } from "../launch/boost";
import { loadMarketTape } from "../launch/market";
import { setUsername, usernameOk } from "../launch/username";
import { creditRank, rankFromXp, resetRank } from "../rank/engine";
import { GLDX_MINT_OFFICIAL, QQQX_MINT_OFFICIAL, SOL_MINT, SPYX_MINT_OFFICIAL, USDC_MINT, USDT_MINT } from "../pair/mints";
import { withLaunch, withShill } from "../store";
import { ensureShill, fillHousePins, postShill, touchMember, voteShill, type HousePinCoin } from "./engine";
import { composeHouseChat } from "./phrases";
import { SHILL_HOUSE_PIN_MIN, type HouseActor, type ShillBook, type ShillMessage } from "./types";

export const HOUSE_ACTOR_N = 87;
export const HOUSE_NAME_MIN = 0.6;
export const HOUSE_NAME_MAX = 0.7;
export const HOUSE_LIVE_MIN = 51;
export const HOUSE_LIVE_MAX = 87;
export const HOUSE_SHARE_CAP = 1;
export const HOUSE_VOTE_CAP = 2;
export const HOUSE_CHAT_CAP = 1;
export const HOUSE_SHARE_CLUSTER_MS = 2 * 60_000;
export const HOUSE_VOTE_CLUSTER_MS = 4 * 60_000;
export const HOUSE_SHARE_GAP_MS = 2.5 * 60_000;
export const HOUSE_CHAT_GAP_MS = 16_000;
export const HOUSE_SHARE_HORIZON_MS = 22 * 3600_000;
export const HOUSE_VOTE_HORIZON_MS = 30 * 3600_000;
export const HOUSE_MIN_LEAD_MS = 45_000;
export const HOUSE_TOP_N = 16;
/** Recycle once they hit a random rank in this band, or the few-week clock, whichever first. */
export const HOUSE_RETIRE_RANK_MIN = 6;
export const HOUSE_RETIRE_RANK_MAX = 16;
export const HOUSE_CYCLE_MIN_MS = 12 * 24 * 3600_000;
export const HOUSE_CYCLE_MAX_MS = 28 * 24 * 3600_000;
export const HOUSE_CYCLE_MIN_LIFE_MS = 5 * 24 * 3600_000;
export const HOUSE_CYCLE_PER_TICK = 1;
/** Share of named house wallets that get a CC0 NFT PFP. The rest stay cartoons. */
export const HOUSE_PFP_NAMED = 0.38;

/** Local copies of CC0 Nouns (noun.pics) and Chain Runners. */
export const HOUSE_PFP_FILES = [
  "noun-1.png",
  "noun-2.png",
  "noun-8.png",
  "noun-17.png",
  "noun-42.png",
  "noun-69.png",
  "noun-80.png",
  "noun-101.png",
  "noun-137.png",
  "noun-220.png",
  "noun-325.png",
  "noun-420.png",
  "noun-487.png",
  "noun-615.png",
  "noun-754.png",
  "noun-888.png",
  "noun-1035.png",
  "noun-1111.png",
  "noun-1337.png",
  "noun-1500.png",
  "runner-1.png",
  "runner-7.png",
  "runner-13.png",
  "runner-27.png",
  "runner-42.png",
  "runner-69.png",
  "runner-88.png",
  "runner-101.png",
  "runner-256.png",
  "runner-420.png",
  "runner-777.png",
  "runner-1000.png",
  "runner-1337.png",
  "runner-2048.png",
] as const;

const PIN_BLOCK = new Set([SOL_MINT, SPYX_MINT_OFFICIAL, QQQX_MINT_OFFICIAL, GLDX_MINT_OFFICIAL, USDC_MINT, USDT_MINT]);

const PREFIX = [
  "Moon", "Ape", "Degen", "Wagmi", "Alpha", "Based", "Pump", "Diamond", "Frog", "Whale",
  "Anon", "Chad", "Giga", "Turbo", "Neon", "Void", "Nova", "Orbit", "Pulse", "Apex",
  "Bag", "Hodl", "Ngmi", "Lfg", "Zen", "Pixel", "Cyber", "Rekt", "Bull", "Bear",
  "Lazy", "Spicy", "Dusty", "Icy", "Lucky", "Silent", "Rapid", "Hyper", "Mega", "Mini",
  "Proto", "Quantum", "Plasma", "Sonic", "Blitz", "Frost", "Ember", "Shadow", "Ninja", "Viper",
  "Otter", "Penguin", "Mango", "Pepe", "Bonk", "Jito", "Drift", "Jup", "Ray", "Orca",
  "Mad", "Wild", "Cool", "Dark", "Lite", "Fast", "Rich", "Early", "King", "Queen",
  "Yolo", "Fomo", "Sats", "Gmfn", "Serx", "Bags", "Cooked", "Rugged", "Degenx", "Solfi",
];

const SUFFIX = [
  "x", "sol", "fi", "dao", "god", "king", "lord", "wiz", "hunt", "wolf",
  "fox", "cat", "ape", "whale", "frog", "lab", "hq", "og", "xyz", "fun",
];

const LINES = [
  (s: string, ca: string) => `${s} ${ca}`,
  (s: string, ca: string) => `watching ${s} ${ca}`,
  (s: string, ca: string) => `${ca}`,
  (s: string, ca: string) => `this ${s} ${ca}`,
  (s: string, ca: string) => `clean ${s} ${ca}`,
  (s: string, ca: string) => `${s} looking heavy ${ca}`,
  (s: string, ca: string) => `still on ${s} ${ca}`,
  (s: string, ca: string) => `size in ${s} ${ca}`,
  (s: string, ca: string) => `${s} ${ca} lfg`,
  (s: string, ca: string) => `don't fade ${s} ${ca}`,
  (s: string, ca: string) => `chart on ${s} ${ca}`,
  (s: string, ca: string) => `${s} ${ca} stays`,
  (s: string, ca: string) => `${s} needs a reclaim ${ca}`,
  (s: string, ca: string) => `not chasing ${s} ${ca}`,
  (s: string, ca: string) => `${s} bid is there ${ca}`,
  (s: string, ca: string) => `${s} ${ca} nfa`,
  (s: string, ca: string) => `same ${s} ${ca}`,
  (s: string, ca: string) => `${s} or nothing ${ca}`,
  (s: string, ca: string) => `watching the wick on ${s} ${ca}`,
  (s: string, ca: string) => `${s} ${ca} if it holds`,
  (s: string, ca: string) => `same ${s} level ${ca}`,
  (s: string, ca: string) => `${s} reclaim or nothing ${ca}`,
  (s: string, ca: string) => `not fading ${s} ${ca}`,
  (s: string, ca: string) => `${s} ${ca} volume first`,
  (s: string, ca: string) => `bid is there on ${s} ${ca}`,
  (s: string, ca: string) => `${s} ${ca} nfa imo`,
];

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function houseActorPubkey(i: number, gen = 0): string {
  const key = gen > 0 ? `solphia.house.shill.${i}.${gen}` : `solphia.house.shill.${i}`;
  const seed = createHash("sha256").update(key).digest();
  return Keypair.fromSeed(seed).publicKey.toBase58();
}

export function pickRetireRank(rng: Rng): number {
  return HOUSE_RETIRE_RANK_MIN + Math.floor(rng() * (HOUSE_RETIRE_RANK_MAX - HOUSE_RETIRE_RANK_MIN + 1));
}

export function pickRetireAt(now: number, rng: Rng): number {
  return now + lerp(HOUSE_CYCLE_MIN_MS, HOUSE_CYCLE_MAX_MS, rng());
}

export function namedHouseCount(n = HOUSE_ACTOR_N, rng: Rng = Math.random): number {
  const lo = Math.ceil(n * HOUSE_NAME_MIN);
  const hi = Math.floor(n * HOUSE_NAME_MAX);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function lerp(a: number, b: number, t: number) {
  return Math.floor(a + (b - a) * t);
}

function pickShareEvery(rng: Rng): number {
  const r = rng();
  if (r < 0.22) return lerp(45 * 60_000, 3 * 3600_000, rng());
  if (r < 0.7) return lerp(4 * 3600_000, 14 * 3600_000, rng());
  return lerp(16 * 3600_000, 40 * 3600_000, rng());
}

function pickVoteEvery(rng: Rng): number {
  const r = rng();
  if (r < 0.28) return lerp(70 * 60_000, 4 * 3600_000, rng());
  if (r < 0.68) return lerp(5 * 3600_000, 14 * 3600_000, rng());
  return lerp(16 * 3600_000, 36 * 3600_000, rng());
}

function pickVoteP(rng: Rng): number {
  return 0.22 + rng() * 0.38;
}

function pickChatEvery(rng: Rng): number {
  const r = rng();
  if (r < 0.35) return lerp(70_000, 3 * 60_000, rng());
  if (r < 0.75) return lerp(3 * 60_000, 8 * 60_000, rng());
  return lerp(8 * 60_000, 14 * 60_000, rng());
}

function clampLive(n: number) {
  return Math.max(HOUSE_LIVE_MIN, Math.min(HOUSE_LIVE_MAX, Math.floor(n)));
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function spreadTimes(n: number, now: number, horizon: number, minGap: number, minLead: number, rng: Rng): number[] {
  const times = Array.from({ length: n }, () => now + minLead + rng() * horizon);
  times.sort((a, b) => a - b);
  for (let i = 1; i < times.length; i++) {
    const floor = times[i - 1] + minGap + Math.floor(rng() * minGap * 0.45);
    if (times[i] < floor) times[i] = floor;
  }
  return shuffle(times, rng);
}

function timesClustered(times: number[], gap: number): boolean {
  const s = times.filter((t) => t > 0).sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) {
    if (s[i] - s[i - 1] < gap) return true;
  }
  return false;
}

export function cryptoUsername(rng: Rng, taken: Set<string>): string | null {
  for (let k = 0; k < 48; k++) {
    const p = PREFIX[Math.floor(rng() * PREFIX.length)] || "Ape";
    const mode = rng();
    let u: string;
    if (mode < 0.34) u = p + String(10 + Math.floor(rng() * 9890));
    else if (mode < 0.58) u = `${p}_${SUFFIX[Math.floor(rng() * SUFFIX.length)]}`;
    else if (mode < 0.8) {
      const s = SUFFIX[Math.floor(rng() * SUFFIX.length)] || "x";
      u = p + s + (rng() < 0.55 ? String(Math.floor(rng() * 90) + 10) : "");
    } else u = p + String(Math.floor(rng() * 90) + 10);
    if (u.length > 20) u = u.slice(0, 20);
    if (!usernameOk(u)) continue;
    const key = u.toLowerCase();
    if (taken.has(key)) continue;
    return u;
  }
  return null;
}

function newActor(i: number, named: boolean, shareAt: number, voteAt: number, rng: Rng, now: number, gen = 0): HouseActor {
  return {
    i,
    pubkey: houseActorPubkey(i, gen),
    named,
    gen,
    bornAt: now,
    retireRank: pickRetireRank(rng),
    retireAt: pickRetireAt(now, rng),
    nextShareAt: shareAt,
    nextVoteAt: voteAt,
    nextChatAt: now + 4_000 + Math.floor(rng() * 80_000),
    shareEveryMs: pickShareEvery(rng),
    voteEveryMs: pickVoteEvery(rng),
    chatEveryMs: pickChatEvery(rng),
    voteP: pickVoteP(rng),
  };
}

function ensureCycleFields(a: HouseActor, now: number, rng: Rng): boolean {
  let dirty = false;
  if (a.gen == null) {
    a.gen = 0;
    dirty = true;
  }
  if (!a.bornAt) {
    a.bornAt = now;
    dirty = true;
  }
  if (!a.retireRank) {
    a.retireRank = pickRetireRank(rng);
    dirty = true;
  }
  if (!a.retireAt) {
    a.retireAt = pickRetireAt(now, rng);
    dirty = true;
  }
  return dirty;
}

export function actorShouldRetire(a: HouseActor, rank: number, now: number): boolean {
  const born = a.bornAt || 0;
  if (!born || now - born < HOUSE_CYCLE_MIN_LIFE_MS) return false;
  const retireAt = a.retireAt || 0;
  const retireRank = a.retireRank || 0;
  if (retireAt > 0 && now >= retireAt) return true;
  if (retireRank > 0 && rank >= retireRank) return true;
  return false;
}

function namedForCycle(actors: HouseActor[], skipI: number, rng: Rng): boolean {
  const n = actors.length || HOUSE_ACTOR_N;
  let namedN = 0;
  for (const a of actors) {
    if (a.i === skipI) continue;
    if (a.named) namedN += 1;
  }
  const lo = Math.ceil(n * HOUSE_NAME_MIN);
  const hi = Math.floor(n * HOUSE_NAME_MAX);
  if (namedN < lo) return true;
  if (namedN > hi) return false;
  return rng() < (HOUSE_NAME_MIN + HOUSE_NAME_MAX) / 2;
}

export type HouseRetirement = { i: number; oldPk: string; newPk: string; named: boolean };

export function recycleHouseActors(
  book: ShillBook,
  ranks: Record<string, number>,
  now = Date.now(),
  rng: Rng = Math.random,
  limit = HOUSE_CYCLE_PER_TICK,
): HouseRetirement[] {
  const actors = book.houseActors || [];
  const cap = Math.max(1, Math.min(4, Math.floor(limit) || HOUSE_CYCLE_PER_TICK));
  const due = actors
    .filter((a) => actorShouldRetire(a, ranks[a.pubkey] || 1, now))
    .sort((a, b) => (a.bornAt || 0) - (b.bornAt || 0));
  const retired: HouseRetirement[] = [];
  for (const actor of due) {
    if (retired.length >= cap) break;
    const named = namedForCycle(actors, actor.i, rng);
    const oldPk = actor.pubkey;
    const gen = (actor.gen || 0) + 1;
    const shareAt = now + HOUSE_MIN_LEAD_MS + Math.floor(rng() * HOUSE_SHARE_HORIZON_MS * 0.2);
    const voteAt = now + HOUSE_MIN_LEAD_MS + Math.floor(rng() * HOUSE_VOTE_HORIZON_MS * 0.2);
    const next = newActor(actor.i, named, shareAt, voteAt, rng, now, gen);
    Object.assign(actor, next);
    if (book.housePresent) {
      book.housePresent = book.housePresent.map((pk) => (pk === oldPk ? actor.pubkey : pk));
    }
    retired.push({ i: actor.i, oldPk, newPk: actor.pubkey, named: actor.named });
  }
  return retired;
}

export function organicizeHouseActors(book: ShillBook, now = Date.now(), rng: Rng = Math.random): boolean {
  const actors = book.houseActors || [];
  if (actors.length < 2) return false;
  let dirty = false;
  const shares = actors.map((a) => a.nextShareAt);
  if (timesClustered(shares, HOUSE_SHARE_CLUSTER_MS)) {
    const next = spreadTimes(actors.length, now, HOUSE_SHARE_HORIZON_MS, HOUSE_SHARE_CLUSTER_MS, HOUSE_MIN_LEAD_MS, rng);
    actors.forEach((a, i) => {
      a.nextShareAt = next[i]!;
    });
    dirty = true;
  }
  const votes = actors.map((a) => a.nextVoteAt);
  if (timesClustered(votes, HOUSE_VOTE_CLUSTER_MS)) {
    const next = spreadTimes(actors.length, now, HOUSE_VOTE_HORIZON_MS, HOUSE_VOTE_CLUSTER_MS, HOUSE_MIN_LEAD_MS, rng);
    actors.forEach((a, i) => {
      a.nextVoteAt = next[i]!;
    });
    dirty = true;
  }
  return dirty;
}

export function plantHouseSchedules(book: ShillBook, now = Date.now(), rng: Rng = Math.random): boolean {
  if (!book.houseActors) book.houseActors = [];
  const have = new Map(book.houseActors.map((a) => [a.i, a]));
  if (book.houseActors.length > HOUSE_ACTOR_N) {
    book.houseActors = book.houseActors.filter((a) => a.i >= 0 && a.i < HOUSE_ACTOR_N).slice(0, HOUSE_ACTOR_N);
  }
  const missing: number[] = [];
  for (let i = 0; i < HOUSE_ACTOR_N; i++) {
    if (!have.has(i)) missing.push(i);
  }
  if (!missing.length) {
    let dirty = false;
    for (const a of book.houseActors) {
      if (ensureCycleFields(a, now, rng)) dirty = true;
    }
    return dirty;
  }

  const existingNamed = book.houseActors.filter((a) => a.named).length;
  const targetNamed = namedHouseCount(HOUSE_ACTOR_N, rng);
  let stillNeed = Math.max(0, targetNamed - existingNamed);
  const shareAt = spreadTimes(missing.length, now, HOUSE_SHARE_HORIZON_MS, HOUSE_SHARE_CLUSTER_MS, HOUSE_MIN_LEAD_MS, rng);
  const voteAt = spreadTimes(missing.length, now, HOUSE_VOTE_HORIZON_MS, HOUSE_VOTE_CLUSTER_MS, HOUSE_MIN_LEAD_MS, rng);
  const order = shuffle(missing.map((_, i) => i), rng);
  const namedSlot = new Set(order.slice(0, stillNeed));
  missing.forEach((i, k) => {
    const named = namedSlot.has(k) && stillNeed > 0;
    if (named) stillNeed -= 1;
    const actor = newActor(i, named, shareAt[k]!, voteAt[k]!, rng, now);
    book.houseActors!.push(actor);
  });
  book.houseActors.sort((a, b) => a.i - b.i);
  for (const a of book.houseActors) ensureCycleFields(a, now, rng);
  organicizeHouseActors(book, now, rng);
  return true;
}

export function houseNeedsNames(launch: LaunchBook, actors: HouseActor[]): boolean {
  return actors.some((a) => a.named && !launch.accounts?.[a.pubkey]?.username);
}

export function shouldPaintHousePfp(pubkey: string): boolean {
  if (!HOUSE_PFP_FILES.length) return false;
  const h = createHash("sha256").update(`solphia.house.pfp.${pubkey}`).digest();
  return h[0]! / 256 < HOUSE_PFP_NAMED;
}

export function pickHousePfp(pubkey: string): string {
  const n = HOUSE_PFP_FILES.length;
  const h = createHash("sha256").update(`solphia.house.pfp.file.${pubkey}`).digest();
  const i = n ? h.readUInt32BE(1) % n : 0;
  return `/house-pfps/${HOUSE_PFP_FILES[i]}`;
}

export function houseNeedsPfps(launch: LaunchBook, actors: HouseActor[]): boolean {
  return actors.some((a) => {
    if (!a.named || !isSolanaAddress(a.pubkey) || !shouldPaintHousePfp(a.pubkey)) return false;
    return !launch.accounts?.[a.pubkey]?.pfp;
  });
}

export function paintHousePfps(launch: LaunchBook, actors: HouseActor[]): boolean {
  let dirty = false;
  for (const actor of actors) {
    if (!actor.named || !isSolanaAddress(actor.pubkey)) continue;
    if (!shouldPaintHousePfp(actor.pubkey)) continue;
    if (launch.accounts?.[actor.pubkey]?.pfp) continue;
    const set = setAccountPfp(launch, actor.pubkey, pickHousePfp(actor.pubkey));
    if (set.ok) dirty = true;
  }
  return dirty;
}

export function houseNeedsIdentities(launch: LaunchBook, actors: HouseActor[]): boolean {
  return houseNeedsNames(launch, actors) || houseNeedsPfps(launch, actors);
}

export function paintHouseIdentities(launch: LaunchBook, actors: HouseActor[], rng: Rng = Math.random): boolean {
  const names = paintHouseNames(launch, actors, rng);
  const pfps = paintHousePfps(launch, actors);
  return names || pfps;
}

export function paintHouseNames(launch: LaunchBook, actors: HouseActor[], rng: Rng = Math.random): boolean {
  const taken = new Set<string>();
  for (const acc of Object.values(launch.accounts || {})) {
    if (acc.username) taken.add(acc.username.toLowerCase());
  }
  let dirty = false;
  for (const actor of actors) {
    if (!actor.named) continue;
    if (!isSolanaAddress(actor.pubkey)) continue;
    const cur = launch.accounts?.[actor.pubkey]?.username;
    if (cur) {
      taken.add(cur.toLowerCase());
      continue;
    }
    const u = cryptoUsername(rng, taken);
    if (!u) continue;
    const set = setUsername(launch, actor.pubkey, u);
    if (set.ok && set.username) {
      taken.add(set.username.toLowerCase());
      dirty = true;
    }
  }
  return dirty;
}

export function houseWorkDue(book: ShillBook, now = Date.now()): boolean {
  const actors = book.houseActors || [];
  if (actors.length < HOUSE_ACTOR_N) return true;
  if (!book.houseBootedAt) return true;
  if (!(book.housePresent || []).length) return true;
  if ((book.nextHouseLiveAt || 0) <= now) return true;
  if (actors.some((a) => !a.bornAt || !a.retireRank || !a.retireAt)) return true;
  if (actors.some((a) => actorShouldRetire(a, 1, now))) return true;
  return actors.some((a) => (a.nextChatAt || 0) <= now || a.nextShareAt <= now || a.nextVoteAt <= now);
}

export function houseNeedsTape(book: ShillBook, now = Date.now()): boolean {
  const present = new Set(book.housePresent || []);
  if (!present.size) return true;
  return (book.houseActors || []).some(
    (a) => present.has(a.pubkey) && (a.nextShareAt <= now || a.nextVoteAt <= now),
  );
}

function ensureActorClocks(book: ShillBook, now: number, rng: Rng) {
  for (const a of book.houseActors || []) {
    if (!a.chatEveryMs) a.chatEveryMs = pickChatEvery(rng);
    if (!a.nextChatAt) a.nextChatAt = now + 3_000 + Math.floor(rng() * 70_000);
  }
}

export function tickHousePresence(book: ShillBook, now = Date.now(), rng: Rng = Math.random): boolean {
  const actors = book.houseActors || [];
  if (actors.length < HOUSE_LIVE_MIN) return false;
  const due = (book.nextHouseLiveAt || 0) <= now || !(book.housePresent || []).length;
  if (!due) return false;
  const cur = book.houseLive || 0;
  let next: number;
  if (!cur) next = HOUSE_LIVE_MIN + Math.floor(rng() * (HOUSE_LIVE_MAX - HOUSE_LIVE_MIN + 1));
  else {
    const delta = Math.floor(rng() * 7) - 3;
    next = clampLive(cur + (delta === 0 ? (rng() < 0.5 ? -1 : 1) : delta));
  }
  const pool = shuffle(actors, rng);
  book.houseLive = next;
  book.housePresent = pool.slice(0, next).map((a) => a.pubkey);
  book.nextHouseLiveAt = now + lerp(90_000, 6 * 60_000, rng());
  return true;
}

function presentActors(book: ShillBook): HouseActor[] {
  const want = new Set(book.housePresent || []);
  return (book.houseActors || []).filter((a) => want.has(a.pubkey));
}

function lastHumanish(book: ShillBook): ShillMessage | undefined {
  const msgs = book.messages || [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]!;
    if (m.kind === "text" || m.kind === "sticker") return m;
  }
  return undefined;
}

function bootHouseRoom(book: ShillBook, candidates: HousePinCoin[], now: number, rng: Rng) {
  if (book.houseBootedAt) return;
  const room = presentActors(book);
  if (!room.length) return;
  const chatAt = spreadTimes(room.length, now, 90_000, 2_500, 2_000, rng);
  room.forEach((a, i) => {
    a.nextChatAt = chatAt[i]!;
    if (rng() < 0.4) a.nextShareAt = now + lerp(40_000, 12 * 60_000, rng());
    if (rng() < 0.35) a.nextVoteAt = now + lerp(50_000, 18 * 60_000, rng());
  });
  const n = 14 + Math.floor(rng() * 12);
  const pool = candidates.filter((c) => c.mint && isSolanaAddress(c.mint) && !PIN_BLOCK.has(c.mint));
  let prevId = "";
  let prevOwner = "";
  let prevText = "";
  let prevSym = "";
  let prevTok = false;
  for (let i = 0; i < n; i++) {
    const actor = room[Math.floor(rng() * room.length)]!;
    const at = now - (n - i) * lerp(45_000, 110_000, rng());
    const id = `s${at.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const share = pool.length && rng() < 0.18;
    let text = "";
    let token: ShillMessage["token"];
    let replyTo: string | undefined;
    if (share) {
      const coin = pickTop(pool, rng);
      if (coin?.mint) {
        const sym = (coin.symbol || coin.mint.slice(0, 4)).replace(/^\$+/, "");
        const line = LINES[Math.floor(rng() * LINES.length)] || LINES[0];
        text = line!(sym, coin.mint);
        token = {
          mint: coin.mint,
          symbol: coin.symbol || sym,
          name: coin.name || coin.symbol || "token",
          image: coin.image,
          priceUsd: coin.priceUsd,
          mcUsd: coin.mcUsd,
        };
      }
    }
    if (!text) {
      const line = composeHouseChat(
        rng,
        { lastText: prevText, lastId: prevId, lastOwner: prevOwner, lastHasToken: prevTok, lastSymbol: prevSym },
        actor.pubkey,
      );
      text = line.text;
      replyTo = line.replyTo;
    }
    book.messages.push({
      id,
      at,
      owner: actor.pubkey,
      kind: "text",
      text,
      replyTo,
      reactions: {},
      token,
    });
    touchMember(book, actor.pubkey, at);
    prevId = id;
    prevOwner = actor.pubkey;
    prevText = text;
    prevTok = Boolean(token?.mint);
    prevSym = token?.symbol || "";
  }
  book.messages.sort((a, b) => a.at - b.at);
  book.lastHouseChatAt = now - 20_000;
  book.houseBootedAt = now;
}

function pickTop(pool: HousePinCoin[], rng: Rng): HousePinCoin | null {
  if (!pool.length) return null;
  const top = pool.slice(0, Math.min(HOUSE_TOP_N, pool.length));
  let sum = 0;
  const w = top.map((_, i) => {
    const v = 1 / (1 + i * 0.35);
    sum += v;
    return v;
  });
  let r = rng() * sum;
  for (let i = 0; i < top.length; i++) {
    r -= w[i]!;
    if (r <= 0) return top[i]!;
  }
  return top[0] || null;
}

function jitterEvery(every: number, rng: Rng) {
  return Math.max(60_000, Math.floor(every * (0.65 + rng() * 0.7)));
}

export function tickHouseActions(
  book: ShillBook,
  candidates: HousePinCoin[],
  now = Date.now(),
  rng: Rng = Math.random,
  blocked: Set<string> = new Set(),
): { shares: number; votes: number; chats: number; xpOwners: string[] } {
  plantHouseSchedules(book, now, rng);
  ensureActorClocks(book, now, rng);
  tickHousePresence(book, now, rng);
  bootHouseRoom(book, candidates, now, rng);
  const pool = candidates.filter((c) => c.mint && isSolanaAddress(c.mint) && !PIN_BLOCK.has(c.mint) && !blocked.has(c.mint));
  const room = presentActors(book);
  const inRoom = new Set(room.map((a) => a.pubkey));
  let shares = 0;
  let votes = 0;
  let chats = 0;
  const xpOwners: string[] = [];
  const noteXp = (pk: string) => {
    if (pk && !xpOwners.includes(pk)) xpOwners.push(pk);
  };

  const chatDue = room.filter((a) => (a.nextChatAt || 0) <= now).sort((a, b) => (a.nextChatAt || 0) - (b.nextChatAt || 0));
  const lastChat = book.lastHouseChatAt || 0;
  const chatGapOk = !lastChat || now - lastChat >= HOUSE_CHAT_GAP_MS;
  if (chatGapOk) {
    for (const actor of chatDue) {
      if (chats >= HOUSE_CHAT_CAP) break;
      const last = lastHumanish(book);
      const line = composeHouseChat(
        rng,
        {
          lastText: last?.text,
          lastId: last?.id,
          lastOwner: last?.owner,
          lastHasToken: Boolean(last?.token?.mint),
          lastSymbol: last?.token?.symbol,
        },
        actor.pubkey,
      );
      const posted = postShill(book, {
        owner: actor.pubkey,
        text: line.text,
        replyTo: line.replyTo,
        now,
      });
      actor.nextChatAt = now + jitterEvery(actor.chatEveryMs || 4 * 60_000, rng);
      if (posted.ok) {
        chats += 1;
        book.lastHouseChatAt = now;
        noteXp(actor.pubkey);
      }
    }
  } else {
    for (const actor of chatDue) {
      const wait = Math.max(0, HOUSE_CHAT_GAP_MS - (now - lastChat));
      actor.nextChatAt = now + wait + Math.floor(rng() * 8_000);
    }
  }

  const shareDue = room.filter((a) => a.nextShareAt <= now).sort((a, b) => a.nextShareAt - b.nextShareAt);
  const lastShare = book.lastHouseShareAt || 0;
  const gapOk = !lastShare || now - lastShare >= HOUSE_SHARE_GAP_MS;
  if (gapOk && pool.length) {
    for (const actor of shareDue) {
      if (shares >= HOUSE_SHARE_CAP) break;
      const coin = pickTop(pool, rng);
      if (!coin?.mint) {
        actor.nextShareAt = now + jitterEvery(actor.shareEveryMs, rng);
        continue;
      }
      const sym = (coin.symbol || coin.mint.slice(0, 4)).replace(/^\$+/, "");
      const line = LINES[Math.floor(rng() * LINES.length)] || LINES[0];
      const text = line!(sym, coin.mint);
      const posted = postShill(book, {
        owner: actor.pubkey,
        text,
        token: {
          mint: coin.mint,
          symbol: coin.symbol || sym,
          name: coin.name || coin.symbol || "token",
          image: coin.image,
          priceUsd: coin.priceUsd,
          mcUsd: coin.mcUsd,
        },
        now,
      });
      actor.nextShareAt = now + jitterEvery(actor.shareEveryMs, rng);
      if (posted.ok) {
        shares += 1;
        book.lastHouseShareAt = now;
        noteXp(actor.pubkey);
        for (const other of shareDue) {
          if (other.pubkey === actor.pubkey || other.nextShareAt > now) continue;
          other.nextShareAt = now + HOUSE_SHARE_GAP_MS + Math.floor(rng() * HOUSE_SHARE_CLUSTER_MS);
        }
      }
    }
  } else {
    for (const actor of shareDue) {
      const wait = Math.max(0, HOUSE_SHARE_GAP_MS - (now - lastShare));
      actor.nextShareAt = now + wait + Math.floor(rng() * actor.shareEveryMs * 0.25);
    }
  }

  const voteDue = room.filter((a) => a.nextVoteAt <= now).sort((a, b) => a.nextVoteAt - b.nextVoteAt);
  for (const actor of voteDue) {
    if (votes >= HOUSE_VOTE_CAP) break;
    if (rng() >= actor.voteP || !pool.length) {
      actor.nextVoteAt = now + 30 * 60_000 + Math.floor(rng() * 4 * 3600_000);
      continue;
    }
    const coin = pickTop(pool, rng);
    if (!coin?.mint) {
      actor.nextVoteAt = now + jitterEvery(actor.voteEveryMs, rng);
      continue;
    }
    const out = voteShill(book, {
      owner: actor.pubkey,
      mint: coin.mint,
      token: {
        mint: coin.mint,
        symbol: coin.symbol || coin.mint.slice(0, 4),
        name: coin.name || coin.symbol || "token",
        image: coin.image,
      },
      now,
    });
    if (out.ok) {
      votes += 1;
      actor.nextVoteAt = now + jitterEvery(actor.voteEveryMs, rng);
    } else {
      actor.nextVoteAt = (out.nextAt || now) + Math.floor(rng() * 40 * 60_000);
    }
  }

  for (const a of book.houseActors || []) {
    if (inRoom.has(a.pubkey)) continue;
    if ((a.nextChatAt || 0) <= now) a.nextChatAt = now + lerp(2 * 60_000, 18 * 60_000, rng());
  }
  return { shares, votes, chats, xpOwners };
}

export async function loadHouseMarketCoins(): Promise<HousePinCoin[]> {
  try {
    const out: HousePinCoin[] = [];
    const seen = new Set<string>();
    const launch = await withLaunch((st) => st, false);
    const book = launch.launch || emptyLaunchBook();
    const padMints = padLaunchMints(book);
    const pack = await loadMarketTape();
    for (const row of pack.rows) {
      const c = row.coin;
      if (!c?.mint || PIN_BLOCK.has(c.mint) || seen.has(c.mint) || padMints.has(c.mint) || c.born) continue;
      seen.add(c.mint);
      out.push({
        mint: c.mint,
        symbol: c.symbol,
        name: c.name,
        image: c.image,
        priceUsd: c.priceSol && pack.solUsd ? c.priceSol * pack.solUsd : undefined,
        mcUsd: c.marketCapUsd,
      });
      if (out.length >= 16) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function persistHouseXpAndCycles(
  xpOwners: string[],
  now = Date.now(),
  rng: Rng = Math.random,
): Promise<number> {
  const unique = [...new Set((xpOwners || []).filter((p) => isSolanaAddress(p)))];
  const actors = await withShill((st) => (ensureShill(st.shill).houseActors || []).slice(), false);
  if (!actors.length && !unique.length) return 0;
  const ranks = await withLaunch((st) => {
    if (!st.launch) st.launch = emptyLaunchBook();
    for (const pk of unique) creditRank(st.launch, pk, "chat", { now });
    const map: Record<string, number> = {};
    for (const a of actors) map[a.pubkey] = rankFromXp(st.launch.accounts?.[a.pubkey]?.xp || 0);
    return map;
  }, unique.length > 0);
  const cycleDue = actors.some((a) => actorShouldRetire(a, ranks[a.pubkey] || 1, now));
  if (!cycleDue) return 0;
  const retired = await withShill((st) => {
    st.shill = ensureShill(st.shill);
    return recycleHouseActors(st.shill, ranks, now, rng);
  }, true);
  if (!retired.length) return 0;
  const latest = await withShill((st) => ensureShill(st.shill).houseActors || [], false);
  await withLaunch((st) => {
    if (!st.launch) st.launch = emptyLaunchBook();
    for (const r of retired) {
      resetRank(st.launch, r.oldPk);
      setUsername(st.launch, r.oldPk, "");
      setAccountPfp(st.launch, r.oldPk, "");
    }
    paintHouseIdentities(st.launch, latest, rng);
  }, true);
  return retired.length;
}

export async function runHouseShill(now = Date.now()): Promise<{ shares: number; votes: number; chats: number; planted: boolean; recycled: number }> {
  const peek = await withShill((st) => {
    const book = ensureShill(st.shill);
    const housePins = (book.pins || []).filter((p) => p.house && p.endsAt > now).length;
    return {
      due: houseWorkDue(book, now),
      n: (book.houseActors || []).length,
      actors: book.houseActors || [],
      tape: houseNeedsTape(book, now),
      pins: housePins < SHILL_HOUSE_PIN_MIN,
    };
  }, false);

  let planted = false;
  let actors = peek.actors;
  if (peek.n < HOUSE_ACTOR_N) {
    actors = await withShill((st) => {
      st.shill = ensureShill(st.shill);
      planted = plantHouseSchedules(st.shill, now);
      return st.shill.houseActors || [];
    }, true);
  }

  const needIdentities = await withLaunch((st) => {
    if (!st.launch) st.launch = emptyLaunchBook();
    return houseNeedsIdentities(st.launch, actors);
  }, false);
  if (needIdentities) {
    await withLaunch((st) => {
      if (!st.launch) st.launch = emptyLaunchBook();
      paintHouseIdentities(st.launch, actors);
    }, true);
  }

  const houseBoosts = await withLaunch((st) => {
    const rows = st.launch?.boosts || [];
    return rows.filter((b) => b.house && b.status === "live" && (b.endsAt || 0) > now).length;
  }, false);
  const boostsLow = houseBoosts < HOUSE_INITIAL;
  if (!peek.due && peek.n >= HOUSE_ACTOR_N && !peek.pins && !boostsLow) {
    return { shares: 0, votes: 0, chats: 0, planted, recycled: 0 };
  }

  const coins = peek.tape || planted || peek.pins || boostsLow ? await loadHouseMarketCoins() : [];
  const out = await withShill((st) => {
    st.shill = ensureShill(st.shill);
    if ((st.shill.houseActors || []).length < HOUSE_ACTOR_N) plantHouseSchedules(st.shill, now);
    if (coins.length) fillHousePins(st.shill, coins, now);
    return tickHouseActions(st.shill, coins, now);
  }, true);
  if (coins.length) {
    const boostDirty = await withLaunch((st) => {
      if (!st.launch) st.launch = emptyLaunchBook();
      return fillHouseBoosts(
        st.launch,
        coins.map((c) => ({
          id: c.mint,
          mint: c.mint,
          symbol: c.symbol,
          name: c.name,
          image: c.image,
          born: false,
        })),
        now,
      );
    }, false);
    if (boostDirty) {
      await withLaunch((st) => st, true);
    }
  }
  const recycled = await persistHouseXpAndCycles(out.xpOwners, now);
  return { ...out, planted, recycled };
}
