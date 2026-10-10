import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SITE_URL } from "@/lib/config";
import { OAUTH_COOKIE, shortCookieOpts, signOauthState } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const Body = z.object({
  tos: z.boolean().optional(),
  privacy: z.boolean().optional(),
  website: z.string().optional(),
});

function googleId(): string {
  return (process.env.GOOGLE_CLIENT_ID || "").trim();
}

function siteOrigin(): string {
  return SITE_URL.replace(/\/$/, "");
}

function redirectUri(): string {
  return `${siteOrigin()}/api/auth/google/callback`;
}

function googleUrl(tos: boolean, privacy: boolean) {
  const id = googleId();
  const state = signOauthState(tos, privacy);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return { url: url.toString(), state };
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(ip + ":google", 20, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const id = googleId();
  const secret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (!id || !secret) {
    return NextResponse.json({ error: "google_off", message: "Google sign-in is not configured yet." }, { status: 400 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", message: "Could not start Google sign-in." }, { status: 400 });
  }
  if ((parsed.data.website || "").trim()) {
    return NextResponse.json({ error: "bot", message: "Could not verify this request." }, { status: 400 });
  }
  const tos = Boolean(parsed.data.tos);
  const privacy = Boolean(parsed.data.privacy);
  const { url, state } = googleUrl(tos, privacy);
  const res = NextResponse.json({ ok: true, url });
  res.cookies.set(OAUTH_COOKIE, state, shortCookieOpts(15 * 60));
  return res;
}
