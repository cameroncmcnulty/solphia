import { isSolanaAddress, sanitizeText } from "../security";
import { ensureAccount, type LaunchAccount, type LaunchBook } from "../launch/engine";

export const RANK_MAX = 100;
export type RankKind = "launch" | "chat" | "circle" | "referral" | "swap";

export type RankEvent = {
  id: string;
  kind: RankKind;
  xp: number;
  at: number;
};

export type RankDay = {
  ymd: string;
  chat: number;
  swapXp: number;
  launches: number;
};

export type RankTier = {
  id: string;
  from: number;
  title: string;
  metal: string;
  glow: string;
};

export const RANK_TIERS: RankTier[] = [
  { id: "spark", from: 1, title: "Spark", metal: "#8a7a9a", glow: "#c9a8ff" },
  { id: "pulse", from: 10, title: "Pulse", metal: "#5ec8d8", glow: "#80eaff" },
  { id: "flame", from: 20, title: "Flame", metal: "#ff7a32", glow: "#ffb020" },
  { id: "orbit", from: 35, title: "Orbit", metal: "#3d8bff", glow: "#80eaff" },
  { id: "nova", from: 50, title: "Nova", metal: "#14f195", glow: "#14f195" },
  { id: "crown", from: 65, title: "Crown", metal: "#e8c35a", glow: "#ffb020" },
  { id: "mythic", from: 80, title: "Mythic", metal: "#ff4fd8", glow: "#ff4fd8" },
  { id: "apex", from: 90, title: "Apex", metal: "#fff4c2", glow: "#ffffff" },
  { id: "immortal", from: 97, title: "Immortal", metal: "#80eaff", glow: "#14f195" },
  { id: "solphia", from: 100, title: "Solphia", metal: "#14f195", glow: "#ff4fd8" },
];

/** Quadratic-ish curve. Rank 10 is a few days. Rank 50 is months. Rank 100 is a long grind. */
export function xpToReach(rank: number): number {
  const r = Math.max(1, Math.min(RANK_MAX, Math.floor(rank)));
  if (r <= 1) return 0;
  const n = r - 1;
  return Math.floor(16 * Math.pow(n, 2.18) + 25 * n);
}

export function rankFromXp(xp: number): number {
  const v = Math.max(0, Math.floor(Number(xp) || 0));
  let rank = 1;
  for (let r = 2; r <= RANK_MAX; r++) {
    if (v >= xpToReach(r)) rank = r;
    else break;
  }
  return rank;
}

export function rankTier(rank: number): RankTier {
  let hit = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (rank >= t.from) hit = t;
  }
  return hit;
}

export function xpProgress(xp: number) {
  const rank = rankFromXp(xp);
  const floor = xpToReach(rank);
  const next = rank >= RANK_MAX ? floor : xpToReach(rank + 1);
  const span = Math.max(1, next - floor);
  const into = Math.max(0, Math.min(span, Math.floor(xp) - floor));
  return { rank, floor, next, into, need: Math.max(0, next - Math.floor(xp)), pct: rank >= RANK_MAX ? 1 : into / span };
}

const DAY_CHAT = 140;
const DAY_SWAP = 420;
const DAY_LAUNCH = 2400;
const XP_LAUNCH = 2400;
const XP_LAUNCH_EXTRA = 400;
const XP_CHAT = 14;
const XP_CIRCLE = 2200;
const XP_REFERRAL = 1600;
const XP_SWAP = 45;

function ymd(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

function ensureDay(acc: LaunchAccount, now: number): RankDay {
  const d = acc.rankDay;
  const today = ymd(now);
  if (!d || d.ymd !== today) {
    acc.rankDay = { ymd: today, chat: 0, swapXp: 0, launches: 0 };
  }
  return acc.rankDay!;
}

function pushEvent(acc: LaunchAccount, kind: RankKind, xp: number, now: number) {
  if (!acc.rankEvents) acc.rankEvents = [];
  acc.rankEvents.push({
    id: `rx_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind,
    xp,
    at: now,
  });
  if (acc.rankEvents.length > 36) acc.rankEvents.splice(0, acc.rankEvents.length - 36);
}

export function creditRank(
  book: LaunchBook,
  pubkey: string,
  kind: RankKind,
  opts?: { sol?: number; now?: number },
): { ok: true; xp: number; added: number; rank: number; leveled: boolean; skipped?: string } | { ok: false; error: string } {
  if (!isSolanaAddress(pubkey)) return { ok: false, error: "bad_wallet" };
  const acc = ensureAccount(book, pubkey);
  const now = opts?.now || Date.now();
  const before = rankFromXp(acc.xp || 0);
  const day = ensureDay(acc, now);
  let add = 0;
  if (kind === "chat") {
    if (day.chat >= DAY_CHAT) return { ok: true, xp: acc.xp || 0, added: 0, rank: before, leveled: false, skipped: "daily_chat" };
    add = Math.min(XP_CHAT, DAY_CHAT - day.chat);
    day.chat += add;
  } else if (kind === "launch") {
    if (day.launches >= DAY_LAUNCH + XP_LAUNCH_EXTRA) {
      return { ok: true, xp: acc.xp || 0, added: 0, rank: before, leveled: false, skipped: "daily_launch" };
    }
    add = day.launches === 0 ? XP_LAUNCH : XP_LAUNCH_EXTRA;
    day.launches += add;
  } else if (kind === "circle") {
    if (acc.circleCredited) return { ok: true, xp: acc.xp || 0, added: 0, rank: before, leveled: false, skipped: "once" };
    add = XP_CIRCLE;
    acc.circleCredited = true;
  } else if (kind === "referral") {
    add = XP_REFERRAL;
  } else if (kind === "swap") {
    if (day.swapXp >= DAY_SWAP) return { ok: true, xp: acc.xp || 0, added: 0, rank: before, leveled: false, skipped: "daily_swap" };
    const vol = Math.max(0, Number(opts?.sol) || 0);
    const raw = XP_SWAP + Math.min(90, Math.floor(vol * 80));
    add = Math.min(raw, DAY_SWAP - day.swapXp);
    day.swapXp += add;
  }
  if (!(add > 0)) return { ok: true, xp: acc.xp || 0, added: 0, rank: before, leveled: false, skipped: "zero" };
  acc.xp = (acc.xp || 0) + add;
  pushEvent(acc, kind, add, now);
  const rank = rankFromXp(acc.xp);
  return { ok: true, xp: acc.xp, added: add, rank, leveled: rank > before };
}

export function setRankXp(book: LaunchBook, pubkey: string, xp: number): { ok: true; xp: number; rank: number } | { ok: false; error: string } {
  if (!isSolanaAddress(pubkey)) return { ok: false, error: "bad_wallet" };
  const acc = ensureAccount(book, pubkey);
  acc.xp = Math.max(0, Math.min(xpToReach(RANK_MAX) + 50_000, Math.floor(Number(xp) || 0)));
  return { ok: true, xp: acc.xp, rank: rankFromXp(acc.xp) };
}

export function setRankTo(book: LaunchBook, pubkey: string, rank: number) {
  const r = Math.max(1, Math.min(RANK_MAX, Math.floor(rank)));
  return setRankXp(book, pubkey, xpToReach(r));
}

export function resetRank(book: LaunchBook, pubkey: string) {
  if (!isSolanaAddress(pubkey)) return { ok: false as const, error: "bad_wallet" };
  const acc = ensureAccount(book, pubkey);
  acc.xp = 0;
  acc.rankEvents = [];
  acc.rankDay = undefined;
  acc.circleCredited = false;
  return { ok: true as const, xp: 0, rank: 1 };
}

export const INTRO_MAX = 180;

export function setIntro(book: LaunchBook, pubkey: string, intro: string) {
  if (!isSolanaAddress(pubkey)) return { ok: false as const, error: "bad_wallet" };
  const acc = ensureAccount(book, pubkey);
  const text = sanitizeText(intro || "", INTRO_MAX);
  acc.intro = text || undefined;
  return { ok: true as const, account: acc };
}

export function setBanner(book: LaunchBook, pubkey: string, banner: string) {
  if (!isSolanaAddress(pubkey)) return { ok: false as const, error: "bad_wallet" };
  const acc = ensureAccount(book, pubkey);
  const raw = (banner || "").trim();
  if (!raw) {
    acc.banner = undefined;
    return { ok: true as const, account: acc };
  }
  if (raw.startsWith("data:image/") && raw.length > 400_000) return { ok: false as const, error: "bad_image" };
  if (!raw.startsWith("data:image/") && !/^https?:\/\//i.test(raw) && !raw.startsWith("/api/media")) {
    return { ok: false as const, error: "bad_image" };
  }
  acc.banner = raw;
  return { ok: true as const, account: acc };
}

export function setFavourite(
  book: LaunchBook,
  pubkey: string,
  fav: { mint: string; symbol?: string; name?: string; image?: string } | null,
) {
  if (!isSolanaAddress(pubkey)) return { ok: false as const, error: "bad_wallet" };
  const acc = ensureAccount(book, pubkey);
  if (!fav || !fav.mint) {
    acc.favMint = undefined;
    acc.favSymbol = undefined;
    acc.favName = undefined;
    acc.favImage = undefined;
    return { ok: true as const, account: acc };
  }
  if (!isSolanaAddress(fav.mint)) return { ok: false as const, error: "bad_mint" };
  acc.favMint = fav.mint;
  acc.favSymbol = sanitizeText(fav.symbol || "", 16) || undefined;
  acc.favName = sanitizeText(fav.name || "", 48) || undefined;
  acc.favImage = (fav.image || "").slice(0, 400) || undefined;
  return { ok: true as const, account: acc };
}

export function publicRank(acc?: LaunchAccount | null) {
  const xp = acc?.xp || 0;
  const prog = xpProgress(xp);
  const tier = rankTier(prog.rank);
  return {
    xp,
    rank: prog.rank,
    title: tier.title,
    tier: tier.id,
    metal: tier.metal,
    glow: tier.glow,
    need: prog.need,
    pct: prog.pct,
    max: RANK_MAX,
  };
}

export function publicCard(acc?: LaunchAccount | null, pubkey = "") {
  const rank = publicRank(acc);
  return {
    pubkey: acc?.pubkey || pubkey,
    username: acc?.username || "",
    hasPfp: Boolean(acc?.pfp),
    hasBanner: Boolean(acc?.banner),
    intro: acc?.intro || "",
    favMint: acc?.favMint || "",
    favSymbol: acc?.favSymbol || "",
    favName: acc?.favName || "",
    favImage: acc?.favImage || "",
    ...rank,
  };
}

export function leaderboard(book: LaunchBook, n = 12) {
  const rows = Object.values(book.accounts || {})
    .filter((a) => (a.xp || 0) > 0)
    .map((a) => publicCard(a))
    .sort((a, b) => b.xp - a.xp || b.rank - a.rank);
  return rows.slice(0, n);
}
