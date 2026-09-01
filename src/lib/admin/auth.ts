import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SECRET } from "../config";
import { signToken, verifyToken } from "../security";

const COOKIE = "solphia_admin";

export function adminCookie(secret = ADMIN_SECRET): string {
  return signToken(`admin:${Date.now()}`, secret);
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

export function setAdminCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
