import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { OWNER_KEY, OWNER_MAX_AGE, parseOwnerCookie } from "@/lib/wallet/owner";

export const dynamic = "force-dynamic";

const Body = z.object({ pubkey: z.string() });

function cookieOpts() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_MAX_AGE,
  };
}

export async function GET(req: NextRequest) {
  const fromJar = req.cookies.get(OWNER_KEY)?.value || "";
  const fromHeader = parseOwnerCookie(req.headers.get("cookie"));
  const pubkey = isSolanaAddress(fromJar) ? fromJar : fromHeader;
  return NextResponse.json({ pubkey: pubkey || null });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":wallet-remember", 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const pubkey = parsed.success ? parsed.data.pubkey.trim() : "";
  if (!isSolanaAddress(pubkey)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, pubkey });
  res.cookies.set(OWNER_KEY, pubkey, cookieOpts());
  return res;
}
