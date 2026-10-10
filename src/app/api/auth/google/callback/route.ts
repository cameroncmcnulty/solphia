import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { upsertGoogleAccount } from "@/lib/auth/accounts";
import {
  OAUTH_COOKIE,
  clearAccountCookie,
  readOauthState,
  setAccountCookie,
  setTotpPendingCookie,
  shortCookieOpts,
  signClaimTicket,
} from "@/lib/auth/session";
import { totpEnabled } from "@/lib/auth/totp";
import { mutateState } from "@/lib/store";

export const dynamic = "force-dynamic";

function siteOrigin(): string {
  return SITE_URL.replace(/\/$/, "");
}

function attr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function fail(req: NextRequest, code: string) {
  const res = NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(code)}`, req.url));
  res.cookies.set(OAUTH_COOKIE, "", { ...shortCookieOpts(0), maxAge: 0, expires: new Date(0) });
  return res;
}

function htmlPage(body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signing in</title></head><body style="background:#04000a;color:#f7f4ff;font-family:sans-serif;padding:2rem">${body}</body></html>`;
}

/** 200 HTML so Set-Cookie is first-party. Session is claimed on a same-origin POST, not a Google 302. */
function finishHtml(opts: { accountId: string; dest: string; twoFa?: boolean }) {
  const dest = opts.dest.startsWith("/") ? opts.dest : "/?signedin=1";
  let html: string;
  if (opts.twoFa) {
    html = htmlPage(
      `Signing in…<script>location.replace(${JSON.stringify(dest)})</script><meta http-equiv="refresh" content="2;url=${attr(dest)}">`,
    );
  } else {
    const ticket = signClaimTicket(opts.accountId);
    html = htmlPage(
      `Signing in…<form id="c" method="POST" action="/api/auth/claim"><input type="hidden" name="ticket" value="${attr(ticket)}"><input type="hidden" name="next" value="${attr(dest)}"></form><script>document.getElementById("c").submit()</script><meta http-equiv="refresh" content="3;url=${attr(dest)}">`,
    );
  }
  const res = new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
  if (opts.twoFa) {
    clearAccountCookie(res);
    setTotpPendingCookie(res, opts.accountId);
  } else {
    setAccountCookie(res, opts.accountId);
  }
  res.cookies.set(OAUTH_COOKIE, "", { ...shortCookieOpts(0), maxAge: 0, expires: new Date(0) });
  return res;
}

export async function GET(req: NextRequest) {
  const id = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const secret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (!id || !secret) return fail(req, "google_off");
  const err = req.nextUrl.searchParams.get("error");
  if (err) return fail(req, "google_denied");
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  if (!code || !state) return fail(req, "google_state");
  const legal = readOauthState(state);
  if (!legal) return fail(req, "google_state");

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
  if (!tokenRes?.ok) return fail(req, "google");
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  if (!token.access_token) return fail(req, "google");

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!infoRes?.ok) return fail(req, "google");
  const info = (await infoRes.json().catch(() => ({}))) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
  };
  if (!info.sub) return fail(req, "google");
  const email = info.email_verified && info.email ? info.email : undefined;

  const out = await mutateState((s) =>
    upsertGoogleAccount(s, { googleId: info.sub!, email, tos: legal.tos, privacy: legal.privacy }),
  );
  if (!out.ok) {
    const code =
      out.error === "no_account" ? "no_account" : out.error.toLowerCase().includes("terms") ? "tos" : "google";
    return fail(req, code);
  }

  if (totpEnabled(out.account)) {
    return finishHtml({ accountId: out.account.id, dest: "/?auth_2fa=1", twoFa: true });
  }
  return finishHtml({ accountId: out.account.id, dest: "/?signedin=1" });
}
