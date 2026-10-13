"use client";

import { forgetOwner, persistOwner } from "@/lib/wallet/owner";
import { isSolanaAddress } from "@/lib/wallet/addr";
import { lockVault } from "@/lib/wallet/vault";
import type { PublicAccount } from "./accounts";

export type { PublicAccount };

export const AUTH_EVENT = "solphia:auth";
export const ACCOUNT_CACHE_KEY = "solphia_account";
export const SIGNED_OUT_KEY = "solphia_signed_out";
const CACHE_KEY = ACCOUNT_CACHE_KEY;

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readCache(): PublicAccount | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(CACHE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as PublicAccount;
    if (!j?.id) return null;
    return j;
  } catch {
    return null;
  }
}

export function peekAccount(): PublicAccount | null {
  if (isSignedOutLocked()) return null;
  return readCache();
}

function writeCache(account: PublicAccount | null) {
  const s = store();
  if (s) {
    try {
      if (account) s.setItem(CACHE_KEY, JSON.stringify(account));
      else s.removeItem(CACHE_KEY);
    } catch {
      /* private mode */
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: account }));
  }
}

export function isSignedOutLocked(): boolean {
  const s = store();
  if (!s) return false;
  try {
    return s.getItem(SIGNED_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearSignedOutLock() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(SIGNED_OUT_KEY);
  } catch {
    /* private mode */
  }
}

function lockSignedOut() {
  const s = store();
  if (!s) return;
  try {
    s.setItem(SIGNED_OUT_KEY, "1");
  } catch {
    /* private mode */
  }
}

let trustedUntil = 0;
let logoutTail: Promise<void> | null = null;
let lastLogoutId = "";

export function waitForLogout(): Promise<void> {
  return logoutTail || Promise.resolve();
}

/** Write a freshly signed-in account and drop the forced-logout lock. */
export function acceptAccount(account: PublicAccount) {
  if (!account?.id) return;
  lastLogoutId = "";
  clearSignedOutLock();
  trustedUntil = Date.now() + 15_000;
  writeCache(account);
}

export async function refreshAccount(): Promise<PublicAccount | null> {
  if (isSignedOutLocked()) {
    writeCache(null);
    return null;
  }
  const held = readCache();
  try {
    const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    const j = (await r.json().catch(() => ({}))) as { account?: PublicAccount | null };
    const account = j.account || null;
    if (isSignedOutLocked()) {
      writeCache(null);
      return null;
    }
    const grace = Date.now() < trustedUntil;
    if (held?.id && account?.id && held.id !== account.id) {
      if (grace) return held;
    }
    if (held?.id && !account && grace) return held;
    writeCache(account);
    return account;
  } catch {
    if (isSignedOutLocked()) {
      writeCache(null);
      return null;
    }
    return peekAccount();
  }
}

export async function startWalletSession(
  pubkey: string,
  legal: { tos: boolean; privacy: boolean },
): Promise<PublicAccount> {
  if (!isSolanaAddress(pubkey)) throw new Error("Create or import a Solphia wallet first.");
  await waitForLogout();
  const r = await fetch("/api/auth/wallet-session", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pubkey, tos: legal.tos, privacy: legal.privacy }),
  });
  const j = (await r.json().catch(() => ({}))) as { account?: PublicAccount; message?: string };
  if (!r.ok || !j.account) {
    throw new Error(j.message || "Could not open this wallet.");
  }
  acceptAccount(j.account);
  persistOwner(pubkey);
  return j.account;
}

export async function linkAccountWallet(pubkey: string): Promise<PublicAccount> {
  const signedIn = peekAccount() || (await refreshAccount());
  if (!signedIn) throw new Error("Unlock this wallet first.");
  const r = await fetch("/api/auth/wallets", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pubkey }),
  });
  const j = (await r.json().catch(() => ({}))) as { account?: PublicAccount; message?: string };
  if (!r.ok || !j.account) {
    throw new Error(j.message || "Could not save that wallet on the account.");
  }
  acceptAccount(j.account);
  return j.account;
}

export async function logoutAccount(): Promise<void> {
  const existing = readCache();
  if (existing?.id) lastLogoutId = existing.id;
  lockSignedOut();
  trustedUntil = 0;
  writeCache(null);
  lockVault();
  forgetOwner();
  const work = Promise.all([
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: existing?.id || lastLogoutId || "" }),
    }).catch(() => undefined),
    fetch("/api/wallet/remember", { method: "DELETE", credentials: "include" }).catch(() => undefined),
  ]).then(() => undefined);
  logoutTail = work;
  try {
    await work;
  } finally {
    if (logoutTail === work) logoutTail = null;
  }
}
