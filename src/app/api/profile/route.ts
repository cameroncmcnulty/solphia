import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { withLaunch, withShill } from "@/lib/store";
import { emptyLaunchBook, referredBy } from "@/lib/launch/engine";
import { INTRO_MAX, profilePhotoUrl, publicCard, setFavourite, setIntro } from "@/lib/rank/engine";
import { displayMedia } from "@/lib/pinata";
import { lookupMarketMint } from "@/lib/launch/market";
import { staffRole } from "@/lib/access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  action: z.enum(["intro", "favourite"]),
  pubkey: z.string(),
  intro: z.string().max(INTRO_MAX).optional(),
  mint: z.string().optional(),
});

function bookOf(s: { launch?: ReturnType<typeof emptyLaunchBook> }) {
  if (!s.launch) s.launch = emptyLaunchBook();
  if (!s.launch.accounts) s.launch.accounts = {};
  return s.launch;
}

function photo(raw: string | undefined, pubkey: string) {
  return profilePhotoUrl(raw, pubkey, "pfp") || displayMedia(raw);
}

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  const viewer = req.nextUrl.searchParams.get("viewer") || "";
  if (!isSolanaAddress(pubkey)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
  const s = await withLaunch((st) => st, false);
  const book = bookOf(s);
  const acc = book.accounts[pubkey];
  const card = publicCard(acc, pubkey);
  const role = staffRole(s, pubkey);
  const viewerRole = isSolanaAddress(viewer) ? staffRole(s, viewer) : null;
  const sh = await withShill((st) => st, false);
  const mem = sh.shill?.members?.[pubkey];
  return NextResponse.json({
    ...card,
    role,
    canModerate: Boolean(viewerRole),
    viewerRole,
    banned: Boolean(mem?.banned),
    mutedUntil: mem?.mutedUntil || 0,
    pfp: photo(acc?.pfp, pubkey),
    intro: acc?.intro || "",
    fav: acc?.favMint
      ? {
          mint: acc.favMint,
          symbol: acc.favSymbol || "",
          name: acc.favName || "",
          image: displayMedia(acc.favImage),
        }
      : null,
    launched: book.coins.filter((c) => c.creator === pubkey).length,
    referred: referredBy(book, pubkey).length,
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":profile", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Slow down and try again." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request", message: "Could not save. Reconnect your wallet." }, { status: 400 });
  }
  const b = parsed.data;
  if (b.action === "intro") {
    const out = await withLaunch((s) => setIntro(bookOf(s), b.pubkey, b.intro || ""), true);
    if (!out.ok) return NextResponse.json({ error: out.error, message: "Could not save intro." }, { status: 400 });
    return NextResponse.json({ ok: true, intro: out.account.intro || "" });
  }
  if (b.action === "favourite") {
    const mint = (b.mint || "").trim();
    if (!mint) {
      await withLaunch((s) => setFavourite(bookOf(s), b.pubkey, null), true);
      return NextResponse.json({ ok: true, fav: null });
    }
    if (!isSolanaAddress(mint)) {
      return NextResponse.json({ error: "bad_mint", message: "Paste a real token contract address." }, { status: 400 });
    }
    let symbol = mint.slice(0, 4).toUpperCase();
    let name = "Token";
    let image = "";
    try {
      const row = await Promise.race([
        lookupMarketMint(mint),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);
      if (row?.coin) {
        symbol = row.coin.symbol || symbol;
        name = row.coin.name || name;
        image = row.coin.image || "";
      }
    } catch {
      /* CA still saves */
    }
    const out = await withLaunch((s) => setFavourite(bookOf(s), b.pubkey, { mint, symbol, name, image }), true);
    if (!out.ok) return NextResponse.json({ error: out.error, message: "Could not save that project." }, { status: 400 });
    return NextResponse.json({ ok: true, fav: { mint, symbol, name, image } });
  }
  return NextResponse.json({ error: "bad_action" }, { status: 400 });
}
