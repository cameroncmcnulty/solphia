import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, randomNonce, rateLimit, sanitizeText, signToken } from "@/lib/security";
import { siwsMessage, verifySiws } from "@/lib/wallet/siws";
import { mutateState } from "@/lib/store";
import { SITE_URL } from "@/lib/config";
import { isEmail } from "@/lib/security";

export const dynamic = "force-dynamic";

const secret = process.env.ADMIN_SECRET || "solphia-dev-only";

export async function GET(req: NextRequest) {
  const nonce = randomNonce();
  const res = NextResponse.json({ nonce, message: siwsMessage("YOUR_WALLET", nonce, SITE_URL) });
  res.cookies.set("solphia_nonce", nonce, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
  return res;
}

const Body = z.object({
  pubkey: z.string(),
  signature: z.string(),
  email: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":siws", 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const nonce = req.cookies.get("solphia_nonce")?.value;
  if (!nonce) return NextResponse.json({ error: "nonce_expired" }, { status: 400 });
  const message = siwsMessage(parsed.data.pubkey, nonce, SITE_URL);
  if (!verifySiws(parsed.data.pubkey, message, parsed.data.signature)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }
  const email = parsed.data.email && isEmail(parsed.data.email) ? sanitizeText(parsed.data.email, 120) : undefined;
  await mutateState((s) => {
    const existing = s.users.find((u) => u.pubkey === parsed.data.pubkey);
    if (existing) {
      existing.lastSeen = Date.now();
      if (email) existing.email = email;
    } else {
      s.users.push({
        pubkey: parsed.data.pubkey,
        email,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        alertsEnabled: Boolean(email),
      });
    }
  });
  const token = signToken(`user:${parsed.data.pubkey}:${Date.now()}`, secret);
  const res = NextResponse.json({ ok: true, pubkey: parsed.data.pubkey });
  res.cookies.set("solphia_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
