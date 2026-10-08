import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAccount, publicAccount } from "@/lib/auth/accounts";
import {
  backupLeft,
  beginTotp,
  confirmTotp,
  disableTotp,
  rotateBackupCodes,
  totpEnabled,
  verifyTotp,
} from "@/lib/auth/totp";
import { qrSvg } from "@/lib/wallet/qr";
import {
  clearTotpPendingCookie,
  readAccountId,
  readTotpPendingId,
  setAccountCookie,
} from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security";
import { mutateState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["setup", "confirm", "verify", "disable", "backup"]),
  code: z.string().optional(),
});

function labelOf(email: string | undefined, id: string): string {
  return (email || "").trim() || `account-${id.slice(0, 8)}`;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(ip + ":totp", 20, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many tries. Wait a bit." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", message: "Bad request." }, { status: 400 });
  }
  const action = parsed.data.action;
  const code = parsed.data.code || "";

  if (action === "verify") {
    const pending = readTotpPendingId(req);
    if (!pending) {
      return NextResponse.json({ error: "otp_expired", message: "Sign in again." }, { status: 401 });
    }
    const out = await mutateState((s) => {
      const row = findAccount(s, pending);
      if (!row) return { ok: false as const, error: "Sign in again." };
      const hit = verifyTotp(row, code);
      if (!hit.ok) return hit;
      return { ok: true as const, account: row };
    });
    if (!out.ok) return NextResponse.json({ error: "otp_failed", message: out.error }, { status: 400 });
    const res = NextResponse.json({ ok: true, account: publicAccount(out.account) });
    setAccountCookie(res, out.account.id);
    clearTotpPendingCookie(res);
    return res;
  }

  const id = readAccountId(req);
  if (!id) return NextResponse.json({ error: "auth", message: "Sign in first." }, { status: 401 });

  if (action === "setup") {
    const out = await mutateState((s) => {
      const row = findAccount(s, id);
      if (!row) return { ok: false as const, error: "Sign in first." };
      if (totpEnabled(row)) return { ok: false as const, error: "Authenticator is already on." };
      const started = beginTotp(row, labelOf(row.email, row.id));
      return { ok: true as const, ...started };
    });
    if (!out.ok) return NextResponse.json({ error: "totp_failed", message: out.error }, { status: 400 });
    return NextResponse.json({
      ok: true,
      otpauth: out.otpauth,
      qr: qrSvg(out.otpauth, "#14f195"),
      backupCodes: out.backupCodes,
    });
  }

  if (action === "confirm") {
    const out = await mutateState((s) => {
      const row = findAccount(s, id);
      if (!row) return { ok: false as const, error: "Sign in first." };
      const hit = confirmTotp(row, code);
      if (!hit.ok) return hit;
      return { ok: true as const, account: row };
    });
    if (!out.ok) return NextResponse.json({ error: "totp_failed", message: out.error }, { status: 400 });
    return NextResponse.json({ ok: true, account: publicAccount(out.account) });
  }

  if (action === "disable") {
    const out = await mutateState((s) => {
      const row = findAccount(s, id);
      if (!row) return { ok: false as const, error: "Sign in first." };
      const hit = disableTotp(row, code);
      if (!hit.ok) return hit;
      return { ok: true as const, account: row };
    });
    if (!out.ok) return NextResponse.json({ error: "totp_failed", message: out.error }, { status: 400 });
    return NextResponse.json({ ok: true, account: publicAccount(out.account) });
  }

  const out = await mutateState((s) => {
    const row = findAccount(s, id);
    if (!row) return { ok: false as const, error: "Sign in first." };
    const hit = rotateBackupCodes(row, code);
    if (!hit.ok) return hit;
    return { ok: true as const, backupCodes: hit.backupCodes, left: backupLeft(row), account: row };
  });
  if (!out.ok) return NextResponse.json({ error: "totp_failed", message: out.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    backupCodes: out.backupCodes,
    account: publicAccount(out.account),
  });
}
