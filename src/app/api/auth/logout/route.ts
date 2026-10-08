import { NextResponse } from "next/server";
import { clearAccountCookie, clearTotpPendingCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAccountCookie(res);
  clearTotpPendingCookie(res);
  return res;
}
