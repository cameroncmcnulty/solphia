import { NextResponse } from "next/server";
import { clearAccountCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAccountCookie(res);
  return res;
}
