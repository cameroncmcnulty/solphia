import { isFounder } from "../access";
import { accountsOf } from "../auth/accounts";
import { emptyAccount, referredBy, type LaunchBook } from "../launch/engine";
import { rankFromXp } from "../rank/engine";
import type { AppState } from "../types";
import type { AdminUser } from "./types";

function blankWallet(_pubkey: string): Omit<
  AdminUser,
  "pubkey" | "accountId" | "email" | "emailVerified" | "google" | "walletCount" | "auth" | "notes"
> {
  return {
    username: null,
    pfp: false,
    plan: "paper",
    paid: false,
    admin: false,
    mod: false,
    comped: false,
    createdAt: 0,
    lastSeen: 0,
    subscribedUntil: null,
    autoRenew: false,
    alertsEnabled: true,
    referredCount: 0,
    referrer: null,
    referralRewardsSol: 0,
    launched: 0,
    rank: 1,
    xp: 0,
    intro: null,
    favMint: null,
    depositedSol: 0,
    mode: "paper",
    killed: false,
    liveDelegate: false,
    tradingPubkey: null,
  };
}

export function buildAdminUsers(state: AppState): AdminUser[] {
  const book: LaunchBook = state.launch || { coins: [], ownerWallet: "", ownerEarningsSol: 0, treasuryFeesSol: 0, accounts: {} };
  const logins = accountsOf(state);
  const keys = new Set<string>([
    ...Object.keys(state.traders || {}),
    ...(state.users || []).map((u) => u.pubkey),
    ...Object.keys(book.accounts || {}),
    ...logins.flatMap((a) => a.wallets || []),
  ]);
  const now = Date.now();
  const rows: AdminUser[] = [];
  const seenLogin = new Set<string>();

  for (const pubkey of keys) {
    if (!pubkey) continue;
    const user = (state.users || []).find((u) => u.pubkey === pubkey);
    const trader = state.traders?.[pubkey];
    const acc = book.accounts?.[pubkey] || emptyAccount(pubkey);
    const launched = (book.coins || []).filter((c) => c.creator === pubkey).length;
    const login =
      logins.find((a) => a.id === user?.accountId) ||
      logins.find((a) => (a.wallets || []).includes(pubkey)) ||
      logins.find((a) => a.emailNorm && a.emailNorm === (user?.email || "").toLowerCase()) ||
      null;
    if (login) seenLogin.add(login.id);
    rows.push({
      pubkey,
      accountId: login?.id || user?.accountId || null,
      username: acc.username || user?.username || null,
      email: login?.email || user?.email || null,
      notes: acc.notes || user?.notes || login?.notes || null,
      pfp: Boolean(acc.pfp),
      plan: user?.plan || "paper",
      paid: Boolean(user?.subscribedUntil && user.subscribedUntil > now),
      admin: isFounder(state, pubkey),
      mod: !isFounder(state, pubkey) && (state.modWallets || []).includes(pubkey),
      comped: Boolean(user?.comped),
      createdAt: login?.createdAt || user?.createdAt || acc.referredAt || trader?.updatedAt || 0,
      lastSeen: Math.max(login?.lastSeen || 0, user?.lastSeen || 0, trader?.updatedAt || 0),
      subscribedUntil: user?.subscribedUntil || null,
      autoRenew: Boolean(user?.autoRenew),
      alertsEnabled: user?.alertsEnabled !== false,
      referredCount: referredBy(book, pubkey).length,
      referrer: acc.referrer || null,
      referralRewardsSol: acc.referralRewardsSol || 0,
      launched,
      rank: rankFromXp(acc.xp || 0),
      xp: acc.xp || 0,
      intro: acc.intro || null,
      favMint: acc.favMint || null,
      depositedSol: trader?.depositedSol || 0,
      mode: trader?.auto?.mode === "live" ? "live" : "paper",
      killed: Boolean(trader?.book?.killed),
      liveDelegate: Boolean(trader?.auto?.liveDelegate),
      tradingPubkey: trader?.tradingPubkey || trader?.auto?.tradingPubkey || null,
      emailVerified: Boolean(login?.emailVerifiedAt || login?.googleId),
      google: Boolean(login?.googleId),
      walletCount: login?.wallets?.length || 1,
      auth: login?.googleId ? "google" : login?.email ? "email" : "wallet",
    });
  }

  for (const login of logins) {
    if (seenLogin.has(login.id)) continue;
    rows.push({
      ...blankWallet(""),
      pubkey: "",
      accountId: login.id,
      email: login.email || null,
      notes: login.notes || null,
      createdAt: login.createdAt,
      lastSeen: login.lastSeen,
      emailVerified: Boolean(login.emailVerifiedAt || login.googleId),
      google: Boolean(login.googleId),
      walletCount: login.wallets?.length || 0,
      auth: login.googleId ? "google" : "email",
    });
  }

  rows.sort((a, b) => b.lastSeen - a.lastSeen);
  return rows.slice(0, 400);
}
