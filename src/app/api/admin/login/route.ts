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
import { adminTotpOf, pullAdminTotp, saveAdminTotp } from "@/lib/admin/totp";
import { beginTotp, confirmTotp, totpEnabled, verifyTotp } from "@/lib/auth/totp";
import { qrSvg } from "@/lib/wallet/qr";
import { clientIp, rateLimit } from "@/lib/security";
import { mutateState, audit, pushBounded } from "@/lib/store";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEq(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

const Body = z.object({
  action: z.enum(["start", "verify", "confirm"]).optional(),
  secret: z.string().optional(),
  otp: z.string().optional(),
  code: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":admin", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "denied" }, { status: 401 });
  const action = parsed.data.action || "start";
  const code = (parsed.data.code || parsed.data.otp || "").trim();

  if (action === "verify" || action === "confirm") {
    if (!isAdminOtpRequest(req)) {
      return NextResponse.json({ error: "otp_expired", message: "Sign in again." }, { status: 401 });
    }
    const out = await mutateState(async (s) => {
      await pullAdminTotp(s);
      const slot = adminTotpOf(s);
      const hit = action === "confirm" ? confirmTotp(slot, code) : verifyTotp(slot, code);
      await saveAdminTotp(slot);
      return hit;
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

  const out = await mutateState(async (s) => {
    await pullAdminTotp(s);
    const slot = adminTotpOf(s);
    if (totpEnabled(slot)) return { ok: true as const, setup: false as const };
    const started = beginTotp(slot, "admin");
    await saveAdminTotp(slot);
    return { ok: true as const, setup: true as const, ...started };
  });
  if (!out.ok) return NextResponse.json({ error: "otp_failed", message: "Could not start authenticator." }, { status: 400 });

  const res = NextResponse.json(
    out.setup
      ? {
          ok: true,
          pending: true,
          setup: true,
          otpauth: out.otpauth,
          qr: qrSvg(out.otpauth, "#14f195"),
          backupCodes: out.backupCodes,
        }
      : { ok: true, pending: true, totp: true },
  );
  setAdminOtpCookie(res, adminOtpCookie());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  clearAdminOtpCookie(res);
  return res;
}
