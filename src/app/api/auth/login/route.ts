import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginEmail, publicAccount } from "@/lib/auth/accounts";
import { verifyBot } from "@/lib/auth/challenge";
import { setAccountCookie } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security";
import { mutateState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string(),
  password: z.string(),
  website: z.string().optional(),
  challengeToken: z.string().optional(),
  challengeAnswer: z.string().optional(),
  turnstile: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(ip + ":login", 10, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", message: "Email or password is wrong." }, { status: 400 });
  }
  const bot = await verifyBot(parsed.data, ip);
  if (!bot.ok) return NextResponse.json({ error: "bot", message: bot.error }, { status: 400 });
  const out = await mutateState((s) => loginEmail(s, parsed.data));
  if (!out.ok) {
    const status = out.error === "verify_email" ? 403 : 401;
    const message =
      out.error === "verify_email" ? "Verify this email with the one-time code we send." : out.error;
    return NextResponse.json({ error: out.error, message }, { status });
  }
  const res = NextResponse.json({ ok: true, account: publicAccount(out.account) });
  setAccountCookie(res, out.account.id);
  return res;
}
