import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import {
  buyCoin,
  createCoin,
  launchError,
  publicCoin,
  quotePreview,
  sellCoin,
  setOwnerWallet,
  withdrawDev,
  withdrawOwner,
} from "@/lib/launch/engine";
import { lastPairPrices } from "@/lib/tick";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["create", "buy", "sell", "quote", "withdraw_dev", "withdraw_owner", "set_owner"]),
  pubkey: z.string(),
  id: z.string().optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  blurb: z.string().optional(),
  image: z.string().max(90_000).optional(),
  website: z.string().optional(),
  x: z.string().optional(),
  telegram: z.string().optional(),
  discord: z.string().optional(),
  launchBuySol: z.number().optional(),
  sol: z.number().optional(),
  tokens: z.number().optional(),
  ownerWallet: z.string().optional(),
  adminSecret: z.string().optional(),
});

function bookOf(s: { launch?: ReturnType<typeof emptyLaunchBook>; ownerWallet?: string }) {
  if (!s.launch) s.launch = emptyLaunchBook();
  if (s.ownerWallet && !s.launch.ownerWallet) s.launch.ownerWallet = s.ownerWallet;
  return s.launch;
}

function fail(code: string, status = 400) {
  return NextResponse.json({ error: code, message: launchError(code) }, { status });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  const viewer = req.nextUrl.searchParams.get("pubkey") || "";
  const s = await withLaunch((st) => st, false);
  const book = bookOf(s);
  const solUsd = lastPairPrices().solUsd || 0;
  if (id) {
    const coin = book.coins.find((c) => c.id === id);
    if (!coin) return fail("not_found", 404);
    return NextResponse.json({ coin: publicCoin(coin, solUsd, viewer), solUsd });
  }
  return NextResponse.json({
    coins: book.coins.slice(0, 80).map((c) => publicCoin(c, solUsd, viewer)),
    solUsd,
    ownerWallet: book.ownerWallet || null,
    ownerEarningsSol: book.ownerEarningsSol,
    fee: { swapBps: 100, devShare: "50% of swap fees paid to the dev", createSol: 0 },
  });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":launch", 20, 60_000)) {
    return fail("rate_limited", 429);
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return fail("bad_request");
  }
  const b = parsed.data;
  const solUsd = lastPairPrices().solUsd || 0;

  if (b.action === "quote") {
    const s = await withLaunch((st) => st, false);
    const coin = bookOf(s).coins.find((c) => c.id === b.id);
    if (!coin) return fail("not_found", 404);
    const q = quotePreview(coin, b.tokens ? "sell" : "buy", b.tokens || b.sol || 0);
    return NextResponse.json({ quote: q, coin: publicCoin(coin, solUsd, b.pubkey) });
  }

  const out = await withLaunch((s) => {
    const book = bookOf(s);
    if (b.action === "create") {
      return createCoin(book, {
        creator: b.pubkey,
        name: sanitizeText(b.name || "", 24),
        symbol: sanitizeText(b.symbol || "", 10),
        blurb: sanitizeText(b.blurb || "", 280),
        image: b.image,
        website: sanitizeText(b.website || "", 160),
        x: sanitizeText(b.x || "", 80),
        telegram: sanitizeText(b.telegram || "", 80),
        discord: sanitizeText(b.discord || "", 120),
        launchBuySol: Number(b.launchBuySol) || 0,
      });
    }
    if (b.action === "buy") return buyCoin(book, { id: b.id || "", owner: b.pubkey, sol: Number(b.sol) || 0 });
    if (b.action === "sell") return sellCoin(book, { id: b.id || "", owner: b.pubkey, tokens: Number(b.tokens) || 0 });
    if (b.action === "withdraw_dev") return withdrawDev(book, { id: b.id || "", owner: b.pubkey });
    if (b.action === "withdraw_owner") return withdrawOwner(book, { owner: b.pubkey });
    if (b.action === "set_owner") {
      const secret = process.env.ADMIN_SECRET || "";
      if (!secret || b.adminSecret !== secret) return { ok: false as const, error: "admin_only" };
      const r = setOwnerWallet(book, b.ownerWallet || "");
      if (r.ok) s.ownerWallet = book.ownerWallet;
      return r;
    }
    return { ok: false as const, error: "bad_action" };
  }, true);

  if (!out || !("ok" in out) || !out.ok) {
    return fail((out as { error?: string })?.error || "failed");
  }
  if ("coin" in out && out.coin) {
    return NextResponse.json({
      ok: true,
      coin: publicCoin(out.coin, solUsd, b.pubkey),
      fill: "fill" in out ? out.fill : undefined,
    });
  }
  return NextResponse.json(out);
}
