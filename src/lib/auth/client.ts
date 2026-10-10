"use client";

import { forgetOwner } from "@/lib/wallet/owner";
import type { PublicAccount } from "./accounts";

export type { PublicAccount };

export const AUTH_EVENT = "solphia:auth";
export const ACCOUNT_CACHE_KEY = "solphia_account";
const CACHE_KEY = ACCOUNT_CACHE_KEY;

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function peekAccount(): PublicAccount | null {
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

function writeCache(account: PublicAccount | null) {
  const prevId = peekAccount()?.id || null;
  const nextId = account?.id || null;
  const s = store();
  if (!s) return;
  try {
    if (account) s.setItem(CACHE_KEY, JSON.stringify(account));
    else s.removeItem(CACHE_KEY);
  } catch {
    /* private mode */
  }
  if (typeof window !== "undefined" && prevId !== nextId) {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: account }));
  }
}

export async function refreshAccount(): Promise<PublicAccount | null> {
  try {
    const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    const j = (await r.json().catch(() => ({}))) as { account?: PublicAccount | null };
    const account = j.account || null;
    writeCache(account);
    return account;
  } catch {
    return peekAccount();
  }
}

export async function linkAccountWallet(pubkey: string): Promise<void> {
  if (!peekAccount() && !(await refreshAccount())) return;
  await fetch("/api/auth/wallets", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pubkey }),
  }).catch(() => undefined);
}

export async function linkDeviceWallets(pubkeys: string[]): Promise<void> {
  for (const pk of pubkeys) await linkAccountWallet(pk);
}

export async function logoutAccount(): Promise<void> {
  writeCache(null);
  forgetOwner();
  await Promise.all([
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined),
    fetch("/api/wallet/remember", { method: "DELETE", credentials: "include" }).catch(() => undefined),
  ]);
}
