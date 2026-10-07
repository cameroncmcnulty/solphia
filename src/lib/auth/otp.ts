import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { AppState } from "@/lib/types";
import { durableConfigured, KEYS, kvDel, kvGetJson, kvSetEx } from "@/lib/persist";
import { hashPassword, passwordIssue, passwordOk } from "./password";
import { emailOk, findByEmail, normalizeEmail } from "./accounts";

function otpSecret(): string {
  return process.env.ADMIN_SECRET || "solphia-dev-only";
}
export const OTP_TTL_MS = 15 * 60_000;
export const OTP_RESEND_MS = 45_000;
export const OTP_MAX_TRIES = 5;
const PENDING_MAX = 200;

export type SignupPending = {
  emailNorm: string;
  passwordHash: string;
  otpHash: string;
  tries: number;
  expiresAt: number;
  tos: boolean;
  privacy: boolean;
  createdAt: number;
  sentAt: number;
};

export function pendingOf(state: AppState): SignupPending[] {
  if (!Array.isArray(state.signupPending)) state.signupPending = [];
  const now = Date.now();
  state.signupPending = state.signupPending.filter((p) => p && p.expiresAt > now);
  if (state.signupPending.length > PENDING_MAX) {
    state.signupPending = state.signupPending.slice(-PENDING_MAX);
  }
  return state.signupPending;
}

export function makeOtp(): string {
  const n = randomBytes(3).readUIntBE(0, 3) % 900000;
  return String(100000 + n);
}

export function hashOtp(emailNorm: string, otp: string): string {
  return createHmac("sha256", otpSecret()).update(`${emailNorm}:${otp}`).digest("hex");
}

export function otpMatch(emailNorm: string, otp: string, stored: string): boolean {
  const got = hashOtp(emailNorm, otp);
  const a = Buffer.from(got);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function digitsOtp(otp: string): string {
  return (otp || "").replace(/\D/g, "").slice(0, 6);
}

export function otpLooksRight(otp: string): boolean {
  return /^\d{6}$/.test(digitsOtp(otp));
}

export async function pullSignupOtp(state: AppState): Promise<void> {
  if (!durableConfigured()) return;
  const raw = await kvGetJson(KEYS.signupOtp);
  if (Array.isArray(raw)) state.signupPending = raw as SignupPending[];
}

export async function saveSignupOtp(rows: SignupPending[]): Promise<void> {
  if (!durableConfigured()) return;
  const live = (rows || []).filter((p) => p && p.expiresAt > Date.now());
  if (!live.length) {
    await kvDel(KEYS.signupOtp);
    return;
  }
  await kvSetEx(KEYS.signupOtp, live, Math.ceil(OTP_TTL_MS / 1000) + 60);
}

export function startSignupOtp(
  state: AppState,
  opts: { email: string; password: string; tos: boolean; privacy: boolean },
): { ok: true; email: string; otp: string } | { ok: false; error: string } {
  if (!opts.tos || !opts.privacy) return { ok: false, error: "Agree to the terms and privacy policy." };
  if (!emailOk(opts.email)) return { ok: false, error: "Enter a valid email." };
  if (!passwordOk(opts.password)) return { ok: false, error: passwordIssue(opts.password) || "Password needs upper, lower, and a symbol." };
  const email = normalizeEmail(opts.email);
  const existing = findByEmail(state, email);
  if (existing?.emailVerifiedAt) return { ok: false, error: "That email already has an account. Sign in." };
  if (existing && !existing.passwordHash && existing.googleId) {
    return { ok: false, error: "That email already has an account. Sign in with Google." };
  }
  const rows = pendingOf(state);
  const prev = rows.find((p) => p.emailNorm === email);
  if (prev && Date.now() - prev.sentAt < OTP_RESEND_MS) {
    return { ok: false, error: "Wait a moment, then resend the code." };
  }
  const otp = makeOtp();
  const now = Date.now();
  const row: SignupPending = {
    emailNorm: email,
    passwordHash: hashPassword(opts.password),
    otpHash: hashOtp(email, otp),
    tries: 0,
    expiresAt: now + OTP_TTL_MS,
    tos: true,
    privacy: true,
    createdAt: prev?.createdAt || now,
    sentAt: now,
  };
  const next = rows.filter((p) => p.emailNorm !== email);
  next.push(row);
  state.signupPending = next;
  return { ok: true, email, otp };
}

export function consumeSignupOtp(
  state: AppState,
  opts: { email: string; otp: string },
): { ok: true; pending: SignupPending } | { ok: false; error: string } {
  const code = digitsOtp(opts.otp);
  if (!otpLooksRight(code)) return { ok: false, error: "Enter the 6-digit code." };
  const email = normalizeEmail(opts.email);
  const rows = pendingOf(state);
  const row = rows.find((p) => p.emailNorm === email);
  if (!row) return { ok: false, error: "That code expired. Send a new one." };
  if (Date.now() > row.expiresAt) {
    state.signupPending = rows.filter((p) => p.emailNorm !== email);
    return { ok: false, error: "That code expired. Send a new one." };
  }
  if (row.tries >= OTP_MAX_TRIES) return { ok: false, error: "Too many tries. Send a new code." };
  if (!otpMatch(email, code, row.otpHash)) {
    row.tries += 1;
    return { ok: false, error: "That code is wrong." };
  }
  state.signupPending = rows.filter((p) => p.emailNorm !== email);
  return { ok: true, pending: row };
}

export function otpEmailHtml(code: string): string {
  const digits = digitsOtp(code);
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f0ea;padding:28px;">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #eadfce;">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;color:#7a708c;">SOLPHIA</p>
    <p style="margin:0 0 8px;font-size:18px;color:#140c00;">Your one-time code</p>
    <p style="margin:20px 0;font-size:36px;letter-spacing:0.24em;font-family:ui-monospace,Consolas,monospace;color:#140c00;font-weight:700;">${digits}</p>
    <p style="margin:0;font-size:13px;color:#7a708c;line-height:1.5;">Expires in 15 minutes. Solphia never asks for a seed phrase or PIN.</p>
  </div>
</div>`;
}
