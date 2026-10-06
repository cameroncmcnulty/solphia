import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SECRET } from "../config";
import { signToken, verifyToken } from "../security";

const COOKIE = "solphia_admin";
const OTP_COOKIE = "solphia_admin_otp";
const OTP_MAX_AGE = 15 * 60;

export function adminCookie(secret = ADMIN_SECRET): string {
  return signToken(`admin:${Date.now()}`, secret);
}

export function adminOtpCookie(secret = ADMIN_SECRET): string {
  return signToken(`adminotp:${Date.now()}`, secret);
}

export function isAdminRequest(req: NextRequest): boolean {
  if (!ADMIN_SECRET) return false;
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return false;
  const payload = verifyToken(token, ADMIN_SECRET);
  return Boolean(payload && payload.startsWith("admin:"));
}

export function requireAdmin(req: NextRequest): NextResponse | null {
  if (isAdminRequest(req)) return null;
  return NextResponse.json({ error: "admin_auth_required" }, { status: 401 });
}

export function isAdminOtpRequest(req: NextRequest): boolean {
  if (!ADMIN_SECRET) return false;
  const token = req.cookies.get(OTP_COOKIE)?.value;
  if (!token) return false;
  const payload = verifyToken(token, ADMIN_SECRET);
  if (!payload?.startsWith("adminotp:")) return false;
  const at = Number(payload.split(":")[1] || 0);
  return Boolean(at && Date.now() - at < OTP_MAX_AGE * 1000);
}

export function setAdminCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function setAdminOtpCookie(res: NextResponse, token: string) {
  res.cookies.set(OTP_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OTP_MAX_AGE,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function clearAdminOtpCookie(res: NextResponse) {
  res.cookies.set(OTP_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
