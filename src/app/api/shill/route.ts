import { NextRequest, NextResponse } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { withLaunch, withShill } from "@/lib/store";
import { treasuryAddress } from "@/lib/treasury";
import { displayMedia } from "@/lib/pinata";
import { confirmedSolTransfer } from "@/lib/solana/connection";
import { lookupMarketMint } from "@/lib/launch/market";
import {
  deleteShill,
  ensureShill,
  extractCas,
  livePins,
  nextPinFreeAt,
  pinSlotsLeft,
  pinToken,
  postShill,
  reactShill,
  touchMember,
} from "@/lib/shill/engine";
import { SHILL_PIN_SOL, SHILL_REACTS, SHILL_STICKERS, type ShillToken } from "@/lib/shill/types";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { creditRank, leaderboard, publicCard } from "@/lib/rank/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const typingMem = new Map<string, number>();

const Body = z.object({
  action: z.enum(["chat", "react", "typing", "read", "delete", "pin"]),
  pubkey: z.string(),
  text: z.string().max(2000).optional(),
  sticker: z.string().max(16).optional(),
  media: z.string().max(400).optional(),
  replyTo: z.string().max(40).optional(),
  id: z.string().optional(),
  emoji: z.string().max(8).optional(),
  mint: z.string().optional(),
  signature: z.string().min(32).max(128).optional(),
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

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  const since = Number(req.nextUrl.searchParams.get("since") || 0);
  const s = await withShill((st) => st, false);
  const book = ensureShill(s.shill);
  const now = Date.now();
  const typing = [...typingMem.entries()]
    .filter(([pk, until]) => pk !== pubkey && until > now)
    .map(([pk]) => pk);
  const messages = book.messages.filter((m) => m.at > since).slice(-120).map((m) => ({
    ...m,
    media: m.media ? displayMedia(m.media) : m.media,
    token: m.token ? { ...m.token, image: displayMedia(m.token.image) } : m.token,
  }));
  const people = [...new Set(messages.map((m) => m.owner).concat(typing, pubkey ? [pubkey] : []))];
  const profiles: Record<string, ReturnType<typeof publicCard>> = {};
  const launch = s.launch || emptyLaunchBook();
  for (const pk of people) {
    profiles[pk] = publicCard(launch.accounts?.[pk], pk);
  }
  const pins = livePins(book, now).map((p) => ({ ...p, image: displayMedia(p.image) }));
  return NextResponse.json({
    members: Object.keys(book.members).length,
    messages,
    pins,
    pinSlots: pinSlotsLeft(book, now),
    nextFreeAt: nextPinFreeAt(book, now),
    pinSol: SHILL_PIN_SOL,
    stickers: SHILL_STICKERS,
    reacts: SHILL_REACTS,
    typing,
    profiles,
    board: leaderboard(launch, 10),
    you: pubkey && isSolanaAddress(pubkey) ? publicCard(launch.accounts?.[pubkey], pubkey) : null,
    treasury: treasuryAddress(),
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":shill", 40, 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Slow down." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request", message: "Connect your wallet." }, { status: 400 });
  }
  const b = parsed.data;
  if (b.action === "typing") {
    typingMem.set(b.pubkey, Date.now() + 4000);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "pin") {
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
      return NextResponse.json({ ok: true, needsSignature: true, treasury, sol: SHILL_PIN_SOL });
    }
    const pay = await confirmedSolTransfer({
      signature: b.signature,
      from: b.pubkey,
      to: treasury,
      lamports: Math.round(SHILL_PIN_SOL * LAMPORTS_PER_SOL),
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
    return NextResponse.json({ ok: true, pin: out.pin });
  }

  if (b.action === "chat") {
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
    return NextResponse.json({ ok: true, message: posted.message, leveled, rank });
  }

  const posted = await withShill((st) => {
    st.shill = ensureShill(st.shill);
    const book = st.shill;
    touchMember(book, b.pubkey);
    if (b.action === "read") return { ok: true as const };
    if (b.action === "delete") {
      return deleteShill(book, b.id || "", b.pubkey) ? { ok: true as const } : { ok: false as const, error: "missing" };
    }
    if (b.action === "react") {
      return reactShill(book, { owner: b.pubkey, id: b.id || "", emoji: b.emoji || "" })
        ? { ok: true as const }
        : { ok: false as const, error: "missing" };
    }
    return { ok: false as const, error: "bad_action" };
  }, true);
  if (!posted.ok) return NextResponse.json({ error: posted.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
