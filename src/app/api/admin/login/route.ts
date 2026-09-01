import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SECRET } from "@/lib/config";
import { adminCookie, setAdminCookie, clearAdminCookie } from "@/lib/admin/auth";
import { clientIp, rateLimit } from "@/lib/security";
import { mutateState, audit, pushBounded } from "@/lib/store";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function safeEq(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":admin", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = z.object({ secret: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !ADMIN_SECRET || !safeEq(parsed.data.secret, ADMIN_SECRET)) {
    return NextResponse.json({ error: "denied" }, { status: 401 });
  }
  await mutateState((s) => {
    pushBounded(s.audit, audit("admin", "login", "admin dashboard", clientIp(req)), 400);
  });
  const res = NextResponse.json({ ok: true });
  setAdminCookie(res, adminCookie());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
