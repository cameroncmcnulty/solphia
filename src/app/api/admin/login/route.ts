import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SECRET } from "@/lib/config";
import {
  adminCookie,
  adminOtpCookie,
  clearAdminCookie,
  clearAdminOtpCookie,
  isAdminOtpRequest,
  setAdminCookie,
  setAdminOtpCookie,
} from "@/lib/admin/auth";
import { consumeAdminOtp, maskEmail, startAdminOtp, adminOtpEmailHtml, pullAdminOtp, saveAdminOtp } from "@/lib/admin/otp";
import { withSignature } from "@/lib/email/desk";
import { mailConfigured, mailOffHint, queueEmail } from "@/lib/email/send";
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

const Body = z.object({
  action: z.enum(["start", "verify", "resend"]).optional(),
  secret: z.string().optional(),
  otp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":admin", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "denied" }, { status: 401 });
  const action = parsed.data.action || "start";

  if (action === "verify" || action === "resend") {
    if (!isAdminOtpRequest(req)) {
      return NextResponse.json({ error: "otp_expired", message: "Sign in again." }, { status: 401 });
    }
    if (action === "resend") {
      let code = "";
      const out = await mutateState(async (s) => {
        await pullAdminOtp(s);
        const started = startAdminOtp(s);
        if (!started.ok) return started;
        await saveAdminOtp(s.adminOtpPending || null);
        code = started.otp;
        const mail = await queueEmail(s, started.email, "Solphia admin code", withSignature(adminOtpEmailHtml(started.otp)));
        if (mail.status !== "sent" && s.adminOtpPending) {
          s.adminOtpPending.sentAt = 0;
          await saveAdminOtp(s.adminOtpPending);
        }
        return { ok: true as const, email: started.email, mailStatus: mail.status, mailError: mail.error };
      });
      if (!out.ok) return NextResponse.json({ error: "otp_failed", message: out.error }, { status: 400 });
      if (out.mailStatus !== "sent" && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "mail_off", message: out.mailError || mailOffHint("admin") },
          { status: 503 },
        );
      }
      const preview = process.env.NODE_ENV !== "production" && out.mailStatus !== "sent";
      return NextResponse.json({
        ok: true,
        pending: true,
        email: maskEmail(out.email),
        preview: preview || undefined,
        devCode: preview ? code : undefined,
      });
    }
    const otp = (parsed.data.otp || "").trim();
    const out = await mutateState(async (s) => {
      await pullAdminOtp(s);
      const consumed = consumeAdminOtp(s, otp);
      await saveAdminOtp(s.adminOtpPending || null);
      return consumed;
    });
    if (!out.ok) return NextResponse.json({ error: "otp_failed", message: out.error }, { status: 400 });
    await mutateState((s) => {
      pushBounded(s.audit, audit("admin", "login", "admin dashboard", clientIp(req)), 400);
    });
    const res = NextResponse.json({ ok: true });
    setAdminCookie(res, adminCookie());
    clearAdminOtpCookie(res);
    return res;
  }

  if (!parsed.data.secret || !ADMIN_SECRET || !safeEq(parsed.data.secret, ADMIN_SECRET)) {
    return NextResponse.json({ error: "denied", message: "Wrong password." }, { status: 401 });
  }

  let code = "";
  const out = await mutateState(async (s) => {
    await pullAdminOtp(s);
    const started = startAdminOtp(s);
    if (!started.ok) return started;
    await saveAdminOtp(s.adminOtpPending || null);
    code = started.otp;
    const mail = await queueEmail(s, started.email, "Solphia admin code", withSignature(adminOtpEmailHtml(started.otp)));
    if (mail.status !== "sent" && s.adminOtpPending) {
      s.adminOtpPending.sentAt = 0;
      await saveAdminOtp(s.adminOtpPending);
    }
    return { ok: true as const, email: started.email, mailStatus: mail.status, mailError: mail.error };
  });
  if (!out.ok) return NextResponse.json({ error: "otp_failed", message: out.error }, { status: 400 });
  if (out.mailStatus !== "sent" && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "mail_off",
        message: mailConfigured()
          ? out.mailError || "Could not send the admin code."
          : mailOffHint("admin"),
      },
      { status: 503 },
    );
  }
  const preview = process.env.NODE_ENV !== "production" && out.mailStatus !== "sent";
  const res = NextResponse.json({
    ok: true,
    pending: true,
    email: maskEmail(out.email),
    preview: preview || undefined,
    devCode: preview ? code : undefined,
  });
  setAdminOtpCookie(res, adminOtpCookie());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  clearAdminOtpCookie(res);
  return res;
}
