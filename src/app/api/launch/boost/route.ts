import { NextRequest, NextResponse } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { treasuryAddress } from "@/lib/treasury";
import { confirmedSolTransfer } from "@/lib/solana/connection";
import { withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import {
  ROCKET_MAX,
  ROCKET_PACKS,
  buyBoost,
  clampRockets,
  liveBoosts,
  ownerBoosts,
  publicLiveBoost,
  rankedBoosts,
  rocketSol,
  tickBoosts,
} from "@/lib/launch/boost";

export const dynamic = "force-dynamic";

const Body = z.object({
  pubkey: z.string(),
  coinId: z.string().max(80),
  rockets: z.number().int().min(1).max(ROCKET_MAX),
  signature: z.string().min(32).max(128).optional(),
});

function bookOf(s: { launch?: ReturnType<typeof emptyLaunchBook> }) {
  if (!s.launch) s.launch = emptyLaunchBook();
  tickBoosts(s.launch);
  return s.launch;
}

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  const first = await withLaunch((st) => {
    const book = bookOf(st);
    const dirty = tickBoosts(book);
    return { dirty, book };
  }, false);
  if (first.dirty) {
    await withLaunch((st) => {
      tickBoosts(bookOf(st));
    }, true);
  }
  const book = first.book;
  const now = Date.now();
  const ranked = rankedBoosts(book, now);
  const live = liveBoosts(book, now).map((b) => publicLiveBoost(b, now));
  const mine = isSolanaAddress(pubkey) ? ownerBoosts(book, pubkey, now) : { live: [], queued: [] };
  return NextResponse.json({
    packs: ROCKET_PACKS.map((p) => ({ ...p, sol: rocketSol(p.rockets) })),
    rocketSol: rocketSol(1),
    hours: 24,
    ranked,
    live,
    mine: {
      live: mine.live.map((b) => publicLiveBoost(b, now)),
      queued: [],
    },
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":boost", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Slow down." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request", message: "Connect your wallet." }, { status: 400 });
  }
  const rockets = clampRockets(parsed.data.rockets);
  const sol = rocketSol(rockets);
  const treasury = treasuryAddress();
  if (!treasury) {
    return NextResponse.json({ error: "no_treasury", message: "Boosts are paused." }, { status: 400 });
  }
  if (!parsed.data.signature) {
    const s = await withLaunch((st) => st, false);
    const book = bookOf(s);
    const coin = book.coins.find((c) => c.id === parsed.data.coinId || c.mint === parsed.data.coinId);
    if (!coin && !parsed.data.coinId) {
      return NextResponse.json({ error: "not_found", message: "Pick a token." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      needsSignature: true,
      treasury,
      sol,
      rockets,
    });
  }
  const pay = await confirmedSolTransfer({
    signature: parsed.data.signature,
    from: parsed.data.pubkey,
    to: treasury,
    lamports: Math.round(sol * LAMPORTS_PER_SOL),
  });
  if (!pay.ok) {
    return NextResponse.json({ error: "pay", message: pay.error || "Payment not found yet." }, { status: 400 });
  }
  const out = await withLaunch((s) => {
    const book = bookOf(s);
    return buyBoost(book, {
      owner: parsed.data.pubkey,
      coinId: parsed.data.coinId,
      rockets,
      sig: parsed.data.signature || "",
      paidSol: sol,
    });
  });
  if (!out.ok) {
    const message = out.error === "replay" ? "That payment was already used." : "Could not apply the boost.";
    return NextResponse.json({ error: out.error, message }, { status: 400 });
  }
  const s = await withLaunch((st) => st, false);
  const book = bookOf(s);
  const now = Date.now();
  const mine = ownerBoosts(book, parsed.data.pubkey, now);
  return NextResponse.json({
    ok: true,
    boost: publicLiveBoost(out.boost, now),
    status: out.boost.status,
    ranked: rankedBoosts(book, now),
    mine: {
      live: mine.live.map((b) => publicLiveBoost(b, now)),
      queued: [],
    },
  });
}
