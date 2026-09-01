import type { AppState } from "./types";

const FOUNDER_MS = 10 * 365 * 24 * 60 * 60 * 1000;

export function envFounders(): string[] {
  return (process.env.FOUNDER_WALLETS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isFounder(state: AppState, pubkey?: string | null): boolean {
  if (!pubkey) return false;
  if (envFounders().includes(pubkey)) return true;
  if ((state.adminWallets || []).includes(pubkey)) return true;
  const u = state.users.find((x) => x.pubkey === pubkey);
  return Boolean(u?.comped);
}

export function grantFounder(state: AppState, pubkey: string) {
  if (!state.adminWallets) state.adminWallets = [];
  if (!state.adminWallets.includes(pubkey)) state.adminWallets.push(pubkey);
  let user = state.users.find((u) => u.pubkey === pubkey);
  if (!user) {
    user = {
      pubkey,
      plan: "full",
      comped: true,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      alertsEnabled: true,
      subscribedUntil: Date.now() + FOUNDER_MS,
    };
    state.users.push(user);
  } else {
    user.plan = "full";
    user.comped = true;
    user.subscribedUntil = Date.now() + FOUNDER_MS;
    user.alertsEnabled = true;
  }
}
