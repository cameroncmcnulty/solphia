import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { upsertGoogleAccount } from "@/lib/auth/accounts";
import { OAUTH_COOKIE, clearAccountCookie, readOauthState, setAccountCookie, setTotpPendingCookie, shortCookieOpts } from "@/lib/auth/session";
import { totpEnabled } from "@/lib/auth/totp";
import { mutateState } from "@/lib/store";

export const dynamic = "force-dynamic";

function siteOrigin(): string {
  return SITE_URL.replace(/\/$/, "");
}

function fail(code: string) {
  const res = NextResponse.redirect(`${siteOrigin()}/?auth_error=${encodeURIComponent(code)}`);
  res.cookies.set(OAUTH_COOKIE, "", { ...shortCookieOpts(0), maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const id = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const secret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (!id || !secret) return fail("google_off");
  const err = req.nextUrl.searchParams.get("error");
  if (err) return fail("google_denied");
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  if (!code || !state) return fail("google_state");
  const legal = readOauthState(state);
  if (!legal) return fail("google_state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: `${siteOrigin()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!tokenRes?.ok) return fail("google");
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  if (!token.access_token) return fail("google");

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!infoRes?.ok) return fail("google");
  const info = (await infoRes.json().catch(() => ({}))) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
  };
  if (!info.sub) return fail("google");
  const email = info.email_verified && info.email ? info.email : undefined;

  const out = await mutateState((s) =>
    upsertGoogleAccount(s, { googleId: info.sub!, email, tos: legal.tos, privacy: legal.privacy }),
  );
  if (!out.ok) {
    const code = out.error.toLowerCase().includes("terms") ? "tos" : "google";
    return fail(code);
  }

  if (totpEnabled(out.account)) {
    const res = NextResponse.redirect(`${siteOrigin()}/?auth_2fa=1`);
    clearAccountCookie(res);
    setTotpPendingCookie(res, out.account.id);
    res.cookies.set(OAUTH_COOKIE, "", { ...shortCookieOpts(0), maxAge: 0 });
    return res;
  }
  const res = NextResponse.redirect(`${siteOrigin()}/?signedin=1`);
  setAccountCookie(res, out.account.id);
  res.cookies.set(OAUTH_COOKIE, "", { ...shortCookieOpts(0), maxAge: 0 });
  return res;
}
