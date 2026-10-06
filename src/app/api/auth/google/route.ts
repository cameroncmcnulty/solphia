import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { OAUTH_COOKIE, shortCookieOpts, signOauthState } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

function googleId(): string {
  return (process.env.GOOGLE_CLIENT_ID || "").trim();
}

function redirectUri(req: NextRequest): string {
  const origin = req.nextUrl.origin || SITE_URL;
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":google", 20, 10 * 60_000)) {
    return NextResponse.redirect(new URL("/?auth_error=rate", req.url));
  }
  const id = googleId();
  if (!id || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/?auth_error=google_off", req.url));
  }
  const tos = req.nextUrl.searchParams.get("tos") === "1";
  const privacy = req.nextUrl.searchParams.get("privacy") === "1";
  const state = signOauthState(tos, privacy);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", redirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  const res = NextResponse.redirect(url.toString());
  res.cookies.set(OAUTH_COOKIE, state, shortCookieOpts(15 * 60));
  return res;
}
