import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createEmailAccount, publicAccount } from "@/lib/auth/accounts";
import { verifyBot } from "@/lib/auth/challenge";
import { consumeSignupOtp, otpEmailHtml, startSignupOtp } from "@/lib/auth/otp";
import { setAccountCookie } from "@/lib/auth/session";
import { withSignature } from "@/lib/email/desk";
import { queueEmail } from "@/lib/email/send";
import { clientIp, rateLimit } from "@/lib/security";
import { mutateState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Start = z.object({
  action: z.literal("start").optional(),
  email: z.string(),
  password: z.string(),
  tos: z.boolean(),
  privacy: z.boolean(),
  website: z.string().optional(),
  challengeToken: z.string().optional(),
  challengeAnswer: z.string().optional(),
  turnstile: z.string().optional(),
});

const Verify = z.object({
  action: z.literal("verify"),
  email: z.string(),
  otp: z.string(),
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const raw = await req.json().catch(() => null);
  const asVerify = Verify.safeParse(raw);
  if (asVerify.success) {
    if (!rateLimit(ip + ":otp-verify", 12, 10 * 60_000)) {
      return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
    }
    const out = await mutateState((s) => {
      const consumed = consumeSignupOtp(s, asVerify.data);
      if (!consumed.ok) return consumed;
      return createEmailAccount(s, {
        email: consumed.pending.emailNorm,
        passwordHash: consumed.pending.passwordHash,
        tos: consumed.pending.tos,
        privacy: consumed.pending.privacy,
        verified: true,
      });
    });
    if (!out.ok) {
      return NextResponse.json({ error: "otp_failed", message: out.error }, { status: 400 });
    }
    const res = NextResponse.json({ ok: true, account: publicAccount(out.account) });
    setAccountCookie(res, out.account.id);
    return res;
  }

  if (!rateLimit(ip + ":otp-start", 6, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const parsed = Start.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", message: "Enter email, password, and agree to the terms." }, { status: 400 });
  }
  const bot = await verifyBot(parsed.data, ip);
  if (!bot.ok) return NextResponse.json({ error: "bot", message: bot.error }, { status: 400 });

  let code = "";
  const out = await mutateState(async (s) => {
    const started = startSignupOtp(s, parsed.data);
    if (!started.ok) return started;
    code = started.otp;
    const html = withSignature(otpEmailHtml(started.otp));
    const mail = await queueEmail(s, started.email, "Your Solphia code", html);
    return { ok: true as const, email: started.email, mailStatus: mail.status };
  });
  if (!out.ok) {
    return NextResponse.json({ error: "otp_failed", message: out.error }, { status: 400 });
  }
  const preview = process.env.NODE_ENV !== "production" && out.mailStatus !== "sent";
  return NextResponse.json({
    ok: true,
    pending: true,
    email: out.email,
    preview: preview || undefined,
    devCode: preview ? code : undefined,
  });
}
