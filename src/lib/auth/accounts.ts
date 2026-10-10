import { randomNonce, isEmail, isSolanaAddress, sanitizeText } from "@/lib/security";
import type { AppState } from "@/lib/types";
import { hashPassword, passwordIssue, passwordOk, verifyPassword } from "./password";

export type LoginAccount = {
  id: string;
  email?: string;
  emailNorm?: string;
  googleId?: string;
  passwordHash?: string;
  tosAcceptedAt?: number;
  privacyAcceptedAt?: number;
  emailVerifiedAt?: number;
  notes?: string;
  wallets: string[];
  createdAt: number;
  lastSeen: number;
  totpSecret?: string;
  totpEnabledAt?: number;
  totpBackupHashes?: string[];
  totpPendingSecret?: string;
  totpPendingBackupHashes?: string[];
  totpLastCounter?: number;
};

export type PublicAccount = {
  id: string;
  email: string | null;
  google: boolean;
  emailVerified: boolean;
  tosAcceptedAt: number;
  wallets: string[];
  createdAt: number;
  totpEnabled: boolean;
};

export function normalizeEmail(email: string): string {
  return sanitizeText(email, 120).trim().toLowerCase();
}

export function emailOk(email: string): boolean {
  return isEmail(normalizeEmail(email));
}

export function emptyAccounts(): LoginAccount[] {
  return [];
}

export function accountsOf(state: AppState): LoginAccount[] {
  if (!Array.isArray(state.accounts)) state.accounts = [];
  return state.accounts;
}

export function publicAccount(row: LoginAccount): PublicAccount {
  return {
    id: row.id,
    email: row.email || null,
    google: Boolean(row.googleId),
    emailVerified: Boolean(row.emailVerifiedAt || row.googleId),
    tosAcceptedAt: row.tosAcceptedAt || 0,
    wallets: row.wallets.filter((pk) => isSolanaAddress(pk)),
    createdAt: row.createdAt,
    totpEnabled: Boolean(row.totpEnabledAt && row.totpSecret),
  };
}

export function findAccount(state: AppState, id: string | null | undefined): LoginAccount | null {
  if (!id) return null;
  return accountsOf(state).find((a) => a.id === id) || null;
}

export function findByEmail(state: AppState, email: string): LoginAccount | null {
  const norm = normalizeEmail(email);
  if (!norm) return null;
  return accountsOf(state).find((a) => a.emailNorm === norm) || null;
}

export function findByGoogle(state: AppState, googleId: string): LoginAccount | null {
  if (!googleId) return null;
  return accountsOf(state).find((a) => a.googleId === googleId) || null;
}

export function acceptLegal(row: LoginAccount, at = Date.now()) {
  row.tosAcceptedAt = at;
  row.privacyAcceptedAt = at;
  row.lastSeen = at;
}

export function createEmailAccount(
  state: AppState,
  opts: { email: string; password?: string; passwordHash?: string; tos: boolean; privacy: boolean; verified?: boolean },
): { ok: true; account: LoginAccount } | { ok: false; error: string } {
  if (!opts.tos || !opts.privacy) return { ok: false, error: "Agree to the terms and privacy policy." };
  if (!emailOk(opts.email)) return { ok: false, error: "Enter a valid email." };
  const existing = findByEmail(state, opts.email);
  const now = Date.now();
  const email = normalizeEmail(opts.email);
  if (existing) {
    if (existing.emailVerifiedAt) return { ok: false, error: "That email already has an account. Sign in." };
    if (opts.passwordHash) existing.passwordHash = opts.passwordHash;
    else if (opts.password) {
      if (!passwordOk(opts.password)) return { ok: false, error: passwordIssue(opts.password) || "Password needs upper, lower, and a symbol." };
      existing.passwordHash = hashPassword(opts.password);
    }
    if (opts.verified) existing.emailVerifiedAt = now;
    acceptLegal(existing, now);
    existing.lastSeen = now;
    return { ok: true, account: existing };
  }
  if (!opts.passwordHash && !passwordOk(opts.password || "")) {
    return { ok: false, error: passwordIssue(opts.password || "") || "Password needs upper, lower, and a symbol." };
  }
  const row: LoginAccount = {
    id: randomNonce(),
    email,
    emailNorm: email,
    passwordHash: opts.passwordHash || hashPassword(opts.password || ""),
    wallets: [],
    createdAt: now,
    lastSeen: now,
    emailVerifiedAt: opts.verified ? now : undefined,
  };
  acceptLegal(row, now);
  accountsOf(state).push(row);
  return { ok: true, account: row };
}

export function loginEmail(
  state: AppState,
  opts: { email: string; password: string },
): { ok: true; account: LoginAccount } | { ok: false; error: string } {
  const row = findByEmail(state, opts.email);
  if (!row) return { ok: false, error: "no_account" };
  if (!row.passwordHash) {
    if (row.googleId) return { ok: false, error: "use_google" };
    return { ok: false, error: "no_account" };
  }
  if (!verifyPassword(opts.password, row.passwordHash)) return { ok: false, error: "Email or password is wrong." };
  if (!row.emailVerifiedAt && !row.googleId) return { ok: false, error: "verify_email" };
  row.lastSeen = Date.now();
  return { ok: true, account: row };
}

export function upsertGoogleAccount(
  state: AppState,
  opts: { googleId: string; email?: string; tos: boolean; privacy: boolean },
): { ok: true; account: LoginAccount; created: boolean } | { ok: false; error: string } {
  const googleId = sanitizeText(opts.googleId, 64);
  if (!googleId) return { ok: false, error: "Google did not return an account." };
  const existing = findByGoogle(state, googleId) || (opts.email ? findByEmail(state, opts.email) : null);
  const now = Date.now();
  if (existing) {
    existing.googleId = googleId;
    if (opts.email && emailOk(opts.email) && !existing.email) {
      existing.email = normalizeEmail(opts.email);
      existing.emailNorm = existing.email;
    }
    existing.lastSeen = now;
    if (opts.email && emailOk(opts.email)) existing.emailVerifiedAt = existing.emailVerifiedAt || now;
    if (!existing.tosAcceptedAt) {
      if (!opts.tos || !opts.privacy) return { ok: false, error: "Agree to the terms and privacy policy." };
      acceptLegal(existing, now);
    }
    return { ok: true, account: existing, created: false };
  }
  if (!opts.tos || !opts.privacy) return { ok: false, error: "no_account" };
  const email = opts.email && emailOk(opts.email) ? normalizeEmail(opts.email) : undefined;
  const row: LoginAccount = {
    id: randomNonce(),
    email,
    emailNorm: email,
    googleId,
    wallets: [],
    createdAt: now,
    lastSeen: now,
    emailVerifiedAt: email ? now : undefined,
  };
  acceptLegal(row, now);
  accountsOf(state).push(row);
  return { ok: true, account: row, created: true };
}

export function attachWallet(
  row: LoginAccount,
  pubkey: string,
): { ok: true } | { ok: false; error: string } {
  if (!isSolanaAddress(pubkey)) return { ok: false, error: "Bad wallet." };
  if (!row.wallets.includes(pubkey)) row.wallets.push(pubkey);
  row.lastSeen = Date.now();
  return { ok: true };
}

export function detachWallet(
  row: LoginAccount,
  pubkey: string,
): { ok: true } | { ok: false; error: string } {
  if (!isSolanaAddress(pubkey)) return { ok: false, error: "Bad wallet." };
  row.wallets = row.wallets.filter((pk) => pk !== pubkey);
  row.lastSeen = Date.now();
  return { ok: true };
}
