import { NextRequest, NextResponse } from "next/server";
import { signToken, verifyToken } from "@/lib/security";

const secret = process.env.ADMIN_SECRET || "solphia-dev-only";
export const SESSION_COOKIE = "solphia_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90;
export const OAUTH_COOKIE = "solphia_oauth";
export const TOTP_COOKIE = "solphia_2fa";
const TOTP_MAX_AGE = 10 * 60;

export function sessionCookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function shortCookieOpts(seconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: seconds,
  };
}

export function accountToken(accountId: string): string {
  return signToken(`acct:${accountId}:${Date.now()}`, secret);
}

export function readAccountId(req: NextRequest): string | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const payload = verifyToken(raw, secret);
  if (!payload?.startsWith("acct:")) return null;
  return payload.split(":")[1] || null;
}

export function setAccountCookie(res: NextResponse, accountId: string) {
  res.cookies.set(SESSION_COOKIE, accountToken(accountId), sessionCookieOpts());
}

export function clearAccountCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOpts(), maxAge: 0 });
}

export function totpPendingToken(accountId: string): string {
  return signToken(`2fa:${accountId}:${Date.now()}`, secret);
}

export function readTotpPendingId(req: NextRequest): string | null {
  const raw = req.cookies.get(TOTP_COOKIE)?.value;
  if (!raw) return null;
  const payload = verifyToken(raw, secret);
  if (!payload?.startsWith("2fa:")) return null;
  const parts = payload.split(":");
  const at = Number(parts[2] || 0);
  if (!at || Date.now() - at > TOTP_MAX_AGE * 1000) return null;
  return parts[1] || null;
}

export function setTotpPendingCookie(res: NextResponse, accountId: string) {
  res.cookies.set(TOTP_COOKIE, totpPendingToken(accountId), shortCookieOpts(TOTP_MAX_AGE));
}

export function clearTotpPendingCookie(res: NextResponse) {
  res.cookies.set(TOTP_COOKIE, "", { ...shortCookieOpts(0), maxAge: 0 });
}

export function signOauthState(tos: boolean, privacy: boolean): string {
  return signToken(`oauth:${tos ? "1" : "0"}:${privacy ? "1" : "0"}:${Date.now()}`, secret);
}

export function readOauthState(raw: string | undefined): { tos: boolean; privacy: boolean } | null {
  if (!raw) return null;
  const payload = verifyToken(raw, secret);
  if (!payload?.startsWith("oauth:")) return null;
  const parts = payload.split(":");
  const at = Number(parts[3] || 0);
  if (!at || Date.now() - at > 15 * 60_000) return null;
  return { tos: parts[1] === "1", privacy: parts[2] === "1" };
}
