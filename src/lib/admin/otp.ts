import type { AppState } from "@/lib/types";
import { emailOk, normalizeEmail } from "@/lib/auth/accounts";
import { hashOtp, makeOtp, otpLooksRight, otpMatch, OTP_MAX_TRIES, OTP_RESEND_MS, OTP_TTL_MS } from "@/lib/auth/otp";

export const DEFAULT_ADMIN_OTP_EMAIL = "CameronCmcnulty@gmail.com";

export type AdminOtpPending = {
  emailNorm: string;
  otpHash: string;
  tries: number;
  expiresAt: number;
  sentAt: number;
};

export function adminOtpEmailOf(state: AppState): string {
  const set = (state.adminOtpEmail || "").trim();
  if (set && emailOk(set)) return normalizeEmail(set);
  return normalizeEmail(DEFAULT_ADMIN_OTP_EMAIL);
}

export function maskEmail(email: string): string {
  const clean = normalizeEmail(email);
  const at = clean.indexOf("@");
  if (at < 1) return "***";
  const name = clean.slice(0, at);
  const domain = clean.slice(at + 1);
  const keep = Math.min(2, name.length);
  return `${name.slice(0, keep)}${"*".repeat(Math.max(1, name.length - keep))}@${domain}`;
}

export function startAdminOtp(state: AppState): { ok: true; email: string; otp: string } | { ok: false; error: string } {
  const email = adminOtpEmailOf(state);
  if (!emailOk(email)) return { ok: false, error: "Set a valid admin OTP email first." };
  const prev = state.adminOtpPending;
  if (prev && Date.now() - prev.sentAt < OTP_RESEND_MS) {
    return { ok: false, error: "Wait a moment, then resend the code." };
  }
  const otp = makeOtp();
  const now = Date.now();
  state.adminOtpPending = {
    emailNorm: email,
    otpHash: hashOtp(email, otp),
    tries: 0,
    expiresAt: now + OTP_TTL_MS,
    sentAt: now,
  };
  return { ok: true, email, otp };
}

export function consumeAdminOtp(state: AppState, otp: string): { ok: true } | { ok: false; error: string } {
  if (!otpLooksRight(otp)) return { ok: false, error: "Enter the 6-digit code." };
  const row = state.adminOtpPending;
  if (!row) return { ok: false, error: "That code expired. Sign in again." };
  if (Date.now() > row.expiresAt) {
    state.adminOtpPending = null;
    return { ok: false, error: "That code expired. Sign in again." };
  }
  if (row.tries >= OTP_MAX_TRIES) return { ok: false, error: "Too many tries. Sign in again." };
  if (!otpMatch(row.emailNorm, otp.trim(), row.otpHash)) {
    row.tries += 1;
    return { ok: false, error: "That code is wrong." };
  }
  state.adminOtpPending = null;
  return { ok: true };
}

export function adminOtpEmailHtml(code: string): string {
  return `<div style="font-family:Georgia,serif;color:#f4f0ea;background:#04000a;padding:28px;">
  <p style="margin:0 0 12px;font-size:14px;color:#7a708c;letter-spacing:0.18em;">SOLPHIA · ADMIN</p>
  <p style="margin:0 0 8px;font-size:18px;">Dashboard one-time code</p>
  <p style="margin:16px 0;font-size:32px;letter-spacing:0.28em;font-family:ui-monospace,monospace;color:#14f195;">${code}</p>
  <p style="margin:0;font-size:13px;color:#7a708c;line-height:1.5;">Expires in 15 minutes. Solphia never asks for a seed phrase or PIN.</p>
</div>`;
}
