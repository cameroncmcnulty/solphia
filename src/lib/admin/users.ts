import { isFounder } from "../access";
import { emptyAccount, referredBy, type LaunchBook } from "../launch/engine";
import type { AppState } from "../types";
import type { AdminUser } from "./types";

export function buildAdminUsers(state: AppState): AdminUser[] {
  const book: LaunchBook = state.launch || { coins: [], ownerWallet: "", ownerEarningsSol: 0, treasuryFeesSol: 0, accounts: {} };
  const keys = new Set<string>([
    ...Object.keys(state.traders || {}),
    ...(state.users || []).map((u) => u.pubkey),
    ...Object.keys(book.accounts || {}),
  ]);
  const now = Date.now();
  const rows: AdminUser[] = [];
  for (const pubkey of keys) {
    if (!pubkey) continue;
    const user = (state.users || []).find((u) => u.pubkey === pubkey);
    const trader = state.traders?.[pubkey];
    const acc = book.accounts?.[pubkey] || emptyAccount(pubkey);
    const launched = (book.coins || []).filter((c) => c.creator === pubkey).length;
    rows.push({
      pubkey,
      username: acc.username || user?.username || null,
      email: user?.email || null,
      notes: acc.notes || user?.notes || null,
      pfp: Boolean(acc.pfp),
      plan: user?.plan || "paper",
      paid: Boolean(user?.subscribedUntil && user.subscribedUntil > now),
      admin: isFounder(state, pubkey),
      comped: Boolean(user?.comped),
      createdAt: user?.createdAt || acc.referredAt || trader?.updatedAt || 0,
      lastSeen: Math.max(user?.lastSeen || 0, trader?.updatedAt || 0),
      subscribedUntil: user?.subscribedUntil || null,
      autoRenew: Boolean(user?.autoRenew),
      alertsEnabled: user?.alertsEnabled !== false,
      referredCount: referredBy(book, pubkey).length,
      referrer: acc.referrer || null,
      referralRewardsSol: acc.referralRewardsSol || 0,
      launched,
      depositedSol: trader?.depositedSol || 0,
      mode: trader?.auto?.mode === "live" ? "live" : "paper",
      killed: Boolean(trader?.book?.killed),
      liveDelegate: Boolean(trader?.auto?.liveDelegate),
      tradingPubkey: trader?.tradingPubkey || trader?.auto?.tradingPubkey || null,
    });
  }
  rows.sort((a, b) => b.lastSeen - a.lastSeen);
  return rows.slice(0, 400);
}
