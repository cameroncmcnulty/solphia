import { SUBSCRIPTION_SOL } from "./config";
import type { AppState, AppUser } from "./types";

export const SEAT_PERIOD_DAYS = 30;
export const SEAT_PERIOD_MS = SEAT_PERIOD_DAYS * 24 * 60 * 60 * 1000;
/** Start collecting the next month 12 hours before the paid-through date. */
export const SEAT_RENEW_LEAD_MS = 12 * 60 * 60 * 1000;

export function seatSol(): number {
  return SUBSCRIPTION_SOL;
}

export function seatLamports(): number {
  return Math.round(seatSol() * 1_000_000_000);
}

export function upsertUser(state: AppState, pubkey: string): AppUser {
  let user = state.users.find((u) => u.pubkey === pubkey);
  if (!user) {
    user = {
      pubkey,
      plan: "paper",
      createdAt: Date.now(),
      lastSeen: Date.now(),
      alertsEnabled: false,
    };
    state.users.push(user);
  }
  user.lastSeen = Date.now();
  return user;
}

export function extendSeat(user: AppUser, now = Date.now(), autoRenew = true): AppUser {
  const base = Math.max(Number(user.subscribedUntil) || 0, now);
  user.subscribedUntil = base + SEAT_PERIOD_MS;
  user.plan = "live";
  user.lastPaidAt = now;
  user.autoRenew = autoRenew;
  return user;
}

export function unsubscribeSeat(user: AppUser, now = Date.now()): AppUser {
  user.autoRenew = false;
  user.unsubscribedAt = now;
  return user;
}

export function acceptTos(user: AppUser, now = Date.now()): AppUser {
  if (!user.tosAcceptedAt) user.tosAcceptedAt = now;
  return user;
}

/** True when auto-renew is on and the paid-through date is inside the lead window or already past. */
export function seatDue(user: AppUser | undefined, now = Date.now()): boolean {
  if (!user || user.autoRenew === false) return false;
  if (user.plan !== "live" && user.plan !== "full") return false;
  if (!user.subscribedUntil) return Boolean(user.autoRenew);
  return user.subscribedUntil - now <= SEAT_RENEW_LEAD_MS;
}

export function payerAllowed(state: AppState, owner: string, payer: string): boolean {
  if (payer === owner) return true;
  const t = state.traders[owner];
  return Boolean(t?.tradingPubkey && t.tradingPubkey === payer);
}

export function publicSeat(user: AppUser | undefined, now = Date.now()) {
  return {
    plan: user?.plan || "paper",
    subscribedUntil: user?.subscribedUntil || null,
    autoRenew: Boolean(user?.autoRenew),
    tosAcceptedAt: user?.tosAcceptedAt || null,
    due: seatDue(user, now),
    lastPaidAt: user?.lastPaidAt || null,
  };
}
