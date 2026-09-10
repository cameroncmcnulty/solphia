import { isSolanaAddress } from "../security";
import { ensureAccount, type LaunchAccount, type LaunchBook } from "./engine";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

const RESERVED = new Set([
  "solphia",
  "spha",
  "admin",
  "official",
  "support",
  "help",
  "mod",
  "moderator",
  "team",
  "solana",
  "phantom",
  "launch",
  "token",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

export function usernameKey(raw: string): string {
  return normalizeUsername(raw).toLowerCase();
}

export function usernameOk(raw: string): boolean {
  const u = normalizeUsername(raw);
  if (!USERNAME_RE.test(u)) return false;
  if (RESERVED.has(u.toLowerCase())) return false;
  return true;
}

export function findUsernameOwner(book: LaunchBook, raw: string, except?: string): string | null {
  const key = usernameKey(raw);
  if (!key) return null;
  for (const [pk, acc] of Object.entries(book.accounts || {})) {
    if (!acc.username) continue;
    if (usernameKey(acc.username) !== key) continue;
    if (except && pk === except) continue;
    return pk;
  }
  return null;
}

export function setUsername(
  book: LaunchBook,
  pubkey: string,
  raw: string,
): { ok: true; account: LaunchAccount; username: string } | { ok: false; error: string } {
  if (!isSolanaAddress(pubkey)) return { ok: false, error: "bad_wallet" };
  const u = normalizeUsername(raw);
  if (!u) {
    const acc = ensureAccount(book, pubkey);
    acc.username = undefined;
    acc.usernameAt = undefined;
    return { ok: true, account: acc, username: "" };
  }
  if (!usernameOk(u)) return { ok: false, error: "bad_username" };
  const taken = findUsernameOwner(book, u, pubkey);
  if (taken) return { ok: false, error: "username_taken" };
  const acc = ensureAccount(book, pubkey);
  acc.username = u;
  acc.usernameAt = Date.now();
  return { ok: true, account: acc, username: u };
}
