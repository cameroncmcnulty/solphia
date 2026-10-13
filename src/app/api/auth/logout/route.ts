import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clearAccountCookie, clearTotpPendingCookie, logoutClearsCookie, readAccountId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const cookieId = readAccountId(req);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const want = parsed.success ? parsed.data.id || "" : "";
  const res = NextResponse.json({ ok: true });
  if (!logoutClearsCookie(cookieId, want)) return res;
  clearAccountCookie(res);
  clearTotpPendingCookie(res);
  return res;
}
