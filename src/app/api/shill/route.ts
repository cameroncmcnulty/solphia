import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { withLaunch, withShill } from "@/lib/store";
import { treasuryAddress } from "@/lib/treasury";
import { displayMedia } from "@/lib/pinata";
import { confirmedHouseTransfers } from "@/lib/solana/connection";
import { houseFeeLegs } from "@/lib/fees/payout";
import { unsignedHousePay } from "@/lib/fees/payTx";
import { creditEvenIncome } from "@/lib/fees/income";
import { lookupMarketMint } from "@/lib/launch/market";
import {
  banShill,
  deleteShill,
  ensureShill,
  extractCas,
  fillHousePins,
  livePins,
  liveRoomCount,
  muteShill,
  nextPinFreeAt,
  pinSlotsLeft,
  nextVoteAt,
  pinToken,
  postShill,
  reactShill,
  touchMember,
  voteBoard,
  voteShill,
  votesOnMint,
  housePubkeySet,
  type VoteBoardRow,
} from "@/lib/shill/engine";
import { SHILL_HOUSE_PIN_MIN, SHILL_MSG_MAX, SHILL_PIN_SOL, SHILL_REACTS, SHILL_STICKERS, type ShillMessage, type ShillPin, type ShillToken } from "@/lib/shill/types";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { creditRank, leaderboard, publicCard } from "@/lib/rank/engine";
import { canModerateChat, staffRole } from "@/lib/access";
import type { AppState } from "@/lib/types";
import { GLDX_MINT_OFFICIAL, QQQX_MINT_OFFICIAL, SOL_MINT, SPYX_MINT_OFFICIAL, USDC_MINT, USDT_MINT } from "@/lib/pair/mints";
import { houseNeedsNames, houseNeedsTape, houseWorkDue, loadHouseMarketCoins, paintHouseNames, persistHouseXpAndCycles, plantHouseSchedules, tickHouseActions } from "@/lib/shill/house";
import { readShillDevice, shillHumanOk, shillJson, shillWalletAllowed, stampShillOk } from "@/lib/shill/antispam";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const typingMem = new Map<string, number>();

type LightSnap = {
  at: number;
  messages: ReturnType<typeof paintMsg>[];
  pins: ReturnType<typeof paintPin>[];
  voteBoard: ReturnType<typeof paintVote>[];
  members: number;
};
let lightSnap: LightSnap | null = null;
const LIGHT_MS = 900;

function paintMsg(m: ShillMessage) {
  return {
    ...m,
    media: m.media ? displayMedia(m.media) : m.media,
    token: m.token ? { ...m.token, image: displayMedia(m.token.image) } : m.token,
  };
}
function paintPin(p: ShillPin & { votes: number }) {
  return { ...p, image: displayMedia(p.image) };
}
function paintVote(row: VoteBoardRow) {
  return { ...row, image: displayMedia(row.image) };
}
function bustShillSnap() {
  lightSnap = null;
}

const Body = z.object({
  action: z.enum(["chat", "react", "typing", "read", "delete", "pin", "mute", "ban", "vote", "human"]),
  pubkey: z.string(),
  text: z.string().max(2000).optional(),
  sticker: z.string().max(16).optional(),
  media: z.string().max(400).optional(),
  replyTo: z.string().max(40).optional(),
  id: z.string().optional(),
  emoji: z.string().max(8).optional(),
  mint: z.string().optional(),
  signature: z.string().min(32).max(128).optional(),
  target: z.string().optional(),
  banned: z.boolean().optional(),
});

async function tokenOf(mint: string): Promise<ShillToken | null> {
  if (!isSolanaAddress(mint)) return null;
  try {
    const row = await lookupMarketMint(mint);
    if (!row?.coin) return { mint, symbol: mint.slice(0, 4), name: mint.slice(0, 6) };
    return {
      mint: row.coin.mint || mint,
      symbol: row.coin.symbol || "",
      name: row.coin.name || row.coin.symbol || "",
      image: row.coin.image,
      priceUsd: row.coin.priceSol && row.solUsd ? row.coin.priceSol * row.solUsd : undefined,
      mcUsd: row.coin.marketCapUsd,
    };
  } catch {
    return { mint, symbol: mint.slice(0, 4), name: "token" };
  }
}

const PIN_BLOCK = new Set([SOL_MINT, SPYX_MINT_OFFICIAL, QQQX_MINT_OFFICIAL, GLDX_MINT_OFFICIAL, USDC_MINT, USDT_MINT]);

function padLaunchMintsFromBook(book: ReturnType<typeof emptyLaunchBook>): Set<string> {
  const out = new Set<string>();
  for (const c of book.coins || []) {
    if (c.mint) out.add(c.mint);
    if (c.id) out.add(c.id);
  }
  return out;
}

async function shillSnap(force = false): Promise<LightSnap> {
  const now = Date.now();
  if (!force && lightSnap && now - lightSnap.at < LIGHT_MS) return lightSnap;
  const s = await withShill((st) => st, false);
  const book = ensureShill(s.shill);
  const pins = livePins(book, now).map((p) => paintPin({ ...p, votes: votesOnMint(book, p.mint, now) }));
  lightSnap = {
    at: now,
    messages: book.messages.slice(-SHILL_MSG_MAX).map(paintMsg),
    pins,
    voteBoard: voteBoard(book, now).map(paintVote),
    members: liveRoomCount(book, now),
  };
  return lightSnap;
}

function youCard(s: AppState, pubkey: string) {
  if (!pubkey || !isSolanaAddress(pubkey)) return null;
  const book = ensureShill(s.shill);
  const launch = s.launch || emptyLaunchBook();
  return {
    ...publicCard(launch.accounts?.[pubkey], pubkey),
    role: staffRole(s, pubkey),
    staff: canModerateChat(s, pubkey),
    banned: Boolean(book.members[pubkey]?.banned),
    mutedUntil: book.members[pubkey]?.mutedUntil || 0,
  };
}

function guestBlock(req: NextRequest, ip: string, pubkey: string, human: boolean) {
  if (human && !shillHumanOk(req, ip)) {
    return { error: "human", message: "Slide to enter Shill Zone first.", status: 403 as const };
  }
  const flood = shillWalletAllowed(ip, readShillDevice(req), pubkey);
  if (!flood.ok) return { error: flood.error, message: flood.message, status: 429 as const };
  return null;
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(ip + ":shill-get", 120, 60_000)) {
    return shillJson(req, { error: "rate_limited" }, 429);
  }
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  const since = Number(req.nextUrl.searchParams.get("since") || 0);
  const light = since > 0;
  const padMints = light ? new Set<string>() : await withLaunch((st) => padLaunchMintsFromBook(st.launch || emptyLaunchBook()), false);
  const need = !light
    ? await withShill((st) => {
        st.shill = ensureShill(st.shill);
        const house = st.shill.pins.filter((p) => p.house && p.endsAt > Date.now());
        const clean = house.filter((p) => !PIN_BLOCK.has(p.mint) && !padMints.has(p.mint));
        return {
          pins: clean.length < SHILL_HOUSE_PIN_MIN || clean.length !== house.length,
          actors: houseWorkDue(st.shill),
          tape: houseNeedsTape(st.shill),
        };
      }, false)
    : { pins: false, actors: false, tape: false };
  if (need.pins || need.actors) {
    const tapeCoins = need.pins || need.tape ? await loadHouseMarketCoins() : [];
    if (need.actors) {
      const actors = await withShill((st) => {
        st.shill = ensureShill(st.shill);
        plantHouseSchedules(st.shill);
        return st.shill.houseActors || [];
      }, true);
      const needNames = await withLaunch((st) => {
        if (!st.launch) st.launch = emptyLaunchBook();
        return houseNeedsNames(st.launch, actors);
      }, false);
      if (needNames) {
        await withLaunch((st) => {
          if (!st.launch) st.launch = emptyLaunchBook();
          paintHouseNames(st.launch, actors);
        }, true);
      }
    }
    let xpOwners: string[] = [];
    await withShill((st) => {
      st.shill = ensureShill(st.shill);
      if (need.pins) {
        st.shill.pins = st.shill.pins.filter((p) => !p.house || (!PIN_BLOCK.has(p.mint) && !padMints.has(p.mint)));
        fillHousePins(st.shill, tapeCoins);
      }
      if (need.actors) {
        const out = tickHouseActions(st.shill, tapeCoins);
        xpOwners = out.xpOwners || [];
      }
    }, true);
    if (need.actors) await persistHouseXpAndCycles(xpOwners);
    bustShillSnap();
  }
  if (!light && pubkey && isSolanaAddress(pubkey)) {
    const blocked = guestBlock(req, ip, pubkey, false);
    if (!blocked) {
      await withShill((st) => {
        st.shill = ensureShill(st.shill);
        const m = st.shill.members[pubkey];
        if (m?.lastReadAt && Date.now() - m.lastReadAt < 10_000) return;
        touchMember(st.shill, pubkey);
      }, true);
      bustShillSnap();
    }
  }
  const snap = await shillSnap(need.pins || need.actors);
  const now = Date.now();
  const typing = [...typingMem.entries()]
    .filter(([pk, until]) => pk !== pubkey && until > now)
    .map(([pk]) => pk);
  const messages = snap.messages.filter((m) => Number(m.at) > since);
  const s = await withShill((st) => st, false);
  const book = ensureShill(s.shill);
  const you = youCard(s, pubkey);
  const nextAt = pubkey && isSolanaAddress(pubkey) ? nextVoteAt(book, pubkey) : 0;
  const launch = s.launch || emptyLaunchBook();
  const people = [...new Set(messages.map((m) => String(m.owner)).concat(typing, pubkey ? [pubkey] : []))];
  const profiles: Record<string, ReturnType<typeof publicCard> & { role: "admin" | "mod" | null }> = {};
  for (const pk of people) {
    profiles[pk] = { ...publicCard(launch.accounts?.[pk], pk), role: staffRole(s, pk) };
  }
  if (light) {
    const quiet = messages.length === 0;
    return shillJson(req, {
      messages,
      typing,
      members: snap.members,
      nextVoteAt: nextAt,
      you,
      profiles,
      ...(quiet ? {} : { pins: snap.pins, voteBoard: snap.voteBoard }),
    });
  }
  return shillJson(req, {
    members: snap.members,
    messages,
    pins: snap.pins,
    pinSlots: pinSlotsLeft(book, now),
    nextFreeAt: nextPinFreeAt(book, now),
    pinSol: SHILL_PIN_SOL,
    stickers: SHILL_STICKERS,
    reacts: SHILL_REACTS,
    typing,
    profiles,
    board: leaderboard(launch, 10, housePubkeySet(book)),
    voteBoard: snap.voteBoard,
    nextVoteAt: nextAt,
    you,
    treasury: treasuryAddress(),
  });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request", message: "Connect your wallet." }, { status: 400 });
  }
  const b = parsed.data;
  if (b.action === "human") {
    if (!rateLimit(ip + ":shill-human", 20, 60_000)) {
      return shillJson(req, { error: "rate_limited", message: "Slow down." }, 429);
    }
    const flood = shillWalletAllowed(ip, readShillDevice(req), b.pubkey);
    if (!flood.ok) return shillJson(req, { error: flood.error, message: flood.message }, 429);
    const res = NextResponse.json({ ok: true });
    stampShillOk(req, res, ip);
    return res;
  }
  if (b.action === "typing") {
    if (!rateLimit(ip + ":shill-type", 80, 60_000)) return NextResponse.json({ ok: true });
    typingMem.set(b.pubkey, Date.now() + 4000);
    return NextResponse.json({ ok: true });
  }
  if (!rateLimit(ip + ":shill", 40, 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Slow down." }, { status: 429 });
  }

  if (b.action === "vote") {
    const blocked = guestBlock(req, ip, b.pubkey, true);
    if (blocked) return shillJson(req, { error: blocked.error, message: blocked.message }, blocked.status);
    const mint = (b.mint || "").trim();
    if (!isSolanaAddress(mint)) return NextResponse.json({ error: "bad_mint", message: "Pick a token to upvote." }, { status: 400 });
    const token = (await tokenOf(mint)) || { mint, symbol: mint.slice(0, 4), name: "token" };
    const out = await withShill((st) => {
      st.shill = ensureShill(st.shill);
      return voteShill(st.shill, { owner: b.pubkey, mint, token });
    }, true);
    if (!out.ok) {
      const wait = Math.max(1, Math.ceil(((out.nextAt || Date.now()) - Date.now()) / 60_000));
      return NextResponse.json(
        {
          error: out.error,
          nextAt: out.nextAt,
          message: out.error === "cooldown" ? `One upvote per hour. Next in ${wait} min.` : "Could not vote.",
        },
        { status: 400 },
      );
    }
    bustShillSnap();
    return NextResponse.json({ ok: true, votes: out.votes, nextAt: out.nextAt });
  }

  if (b.action === "pin") {
    const blocked = guestBlock(req, ip, b.pubkey, true);
    if (blocked) return shillJson(req, { error: blocked.error, message: blocked.message }, blocked.status);
    const mint = (b.mint || "").trim();
    if (!isSolanaAddress(mint)) return NextResponse.json({ error: "bad_mint", message: "Drop a token CA." }, { status: 400 });
    const treasury = treasuryAddress();
    if (!treasury) return NextResponse.json({ error: "no_treasury", message: "Pins are paused." }, { status: 400 });
    const peek = await withShill((st) => {
      const book = ensureShill(st.shill);
      return { left: pinSlotsLeft(book), nextFreeAt: nextPinFreeAt(book) };
    }, false);
    if (peek.left <= 0) {
      const wait = Math.max(0, peek.nextFreeAt - Date.now());
      const mins = Math.max(1, Math.ceil(wait / 60_000));
      return NextResponse.json(
        {
          error: "full",
          nextFreeAt: peek.nextFreeAt,
          message: `No pin spots left. Next one frees in ${mins} min.`,
        },
        { status: 400 },
      );
    }
    if (!b.signature) {
      const packed = await unsignedHousePay(b.pubkey, SHILL_PIN_SOL, b.pubkey, "even");
      if (!packed.ok) return NextResponse.json({ error: packed.error, message: "Could not start the pin." }, { status: 400 });
      return NextResponse.json({
        ok: true,
        needsSignature: true,
        treasury,
        sol: SHILL_PIN_SOL,
        transaction: packed.transaction,
        legs: packed.legs,
      });
    }
    const legs = houseFeeLegs({ from: b.pubkey, feeSol: SHILL_PIN_SOL, mode: "even" });
    const pay = await confirmedHouseTransfers({
      signature: b.signature,
      from: b.pubkey,
      legs,
    });
    if (!pay.ok) return NextResponse.json({ error: "pay", message: pay.error || "Payment not found yet." }, { status: 400 });
    const token = (await tokenOf(mint)) || { mint, symbol: mint.slice(0, 4), name: "token" };
    const out = await withShill((st) => {
      st.shill = ensureShill(st.shill);
      return pinToken(st.shill, { owner: b.pubkey, token, sig: b.signature || "", paidSol: SHILL_PIN_SOL });
    }, true);
    if (!out.ok) {
      const message =
        out.error === "full"
          ? `No pin spots left. Next one frees in ${Math.max(1, Math.ceil(((out.nextFreeAt || Date.now()) - Date.now()) / 60_000))} min.`
          : out.error === "replay"
            ? "That payment was already used."
            : "Could not pin.";
      return NextResponse.json({ error: out.error, message, nextFreeAt: out.nextFreeAt }, { status: 400 });
    }
    bustShillSnap();
    try {
      await withLaunch((st) => {
        if (!st.launch) st.launch = emptyLaunchBook();
        creditEvenIncome(st.launch, SHILL_PIN_SOL, "pin");
      }, true);
    } catch {
      /* pin still stands */
    }
    return NextResponse.json({ ok: true, pin: out.pin });
  }

  if (b.action === "chat") {
    const blocked = guestBlock(req, ip, b.pubkey, true);
    if (blocked) return shillJson(req, { error: blocked.error, message: blocked.message }, blocked.status);
    const text = sanitizeText(b.text || "", 2000);
    const cas = extractCas(text);
    let token: ShillToken | undefined;
    if (cas[0]) token = (await tokenOf(cas[0])) || undefined;
    const posted = await withShill((st) => {
      st.shill = ensureShill(st.shill);
      return postShill(st.shill, {
        owner: b.pubkey,
        text,
        sticker: b.sticker,
        media: b.media,
        replyTo: b.replyTo,
        token,
        kind: b.sticker ? "sticker" : b.media ? "media" : "text",
      });
    }, true);
    if (!posted.ok) {
      const message =
        posted.error === "ca_cooldown"
          ? `Wait ${Math.ceil((posted.waitMs || 0) / 1000)}s before dropping another CA.`
          : posted.error === "empty"
            ? "Write something first."
            : posted.error === "banned"
              ? "This wallet is banned from Shill Zone."
              : posted.error === "muted"
                ? `Muted for ${Math.max(1, Math.ceil((posted.waitMs || 0) / 60_000))} min.`
                : "Could not send.";
      return NextResponse.json({ error: posted.error, message, waitMs: posted.waitMs }, { status: 400 });
    }
    let leveled = false;
    let rank = 1;
    try {
      const cred = await withLaunch((st) => {
        if (!st.launch) st.launch = emptyLaunchBook();
        return creditRank(st.launch, b.pubkey, "chat");
      }, true);
      if (cred.ok) {
        leveled = cred.leveled;
        rank = cred.rank;
      }
    } catch {
      /* chat still sent */
    }
    bustShillSnap();
    return NextResponse.json({ ok: true, message: posted.message, leveled, rank });
  }

  if (b.action === "react") {
    const blocked = guestBlock(req, ip, b.pubkey, true);
    if (blocked) return shillJson(req, { error: blocked.error, message: blocked.message }, blocked.status);
  }
  if (b.action === "read") {
    const blocked = guestBlock(req, ip, b.pubkey, false);
    if (blocked) return NextResponse.json({ ok: true });
  }

  const posted = await withShill((st) => {
    st.shill = ensureShill(st.shill);
    const book = st.shill;
    touchMember(book, b.pubkey);
    if (b.action === "read") return { ok: true as const };
    if (b.action === "delete") {
      if (!canModerateChat(st, b.pubkey)) return { ok: false as const, error: "forbidden" };
      return deleteShill(book, b.id || "") ? { ok: true as const } : { ok: false as const, error: "missing" };
    }
    if (b.action === "mute") {
      if (!canModerateChat(st, b.pubkey)) return { ok: false as const, error: "forbidden" };
      const target = b.target || "";
      if (!isSolanaAddress(target) || staffRole(st, target) === "admin") return { ok: false as const, error: "bad_target" };
      return muteShill(book, target, 24 * 60 * 60 * 1000) ? { ok: true as const } : { ok: false as const, error: "missing" };
    }
    if (b.action === "ban") {
      if (!canModerateChat(st, b.pubkey)) return { ok: false as const, error: "forbidden" };
      const target = b.target || "";
      if (!isSolanaAddress(target) || staffRole(st, target) === "admin") return { ok: false as const, error: "bad_target" };
      return banShill(book, target, b.banned !== false) ? { ok: true as const } : { ok: false as const, error: "missing" };
    }
    if (b.action === "react") {
      return reactShill(book, { owner: b.pubkey, id: b.id || "", emoji: b.emoji || "" })
        ? { ok: true as const }
        : { ok: false as const, error: "missing" };
    }
    return { ok: false as const, error: "bad_action" };
  }, true);
  if (!posted.ok) return NextResponse.json({ error: posted.error }, { status: 400 });
  bustShillSnap();
  return NextResponse.json({ ok: true });
}
