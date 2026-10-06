import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginEmail, publicAccount } from "@/lib/auth/accounts";
import { setAccountCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security";
import { mutateState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":login", 10, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", message: "Email or password is wrong." }, { status: 400 });
  }
  const out = await mutateState((s) => loginEmail(s, parsed.data));
  if (!out.ok) {
    return NextResponse.json({ error: "login_failed", message: out.error }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, account: publicAccount(out.account) });
  setAccountCookie(res, out.account.id);
  return res;
}
