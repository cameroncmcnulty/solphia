import { isSolanaAddress } from "../security";
import { emptyLaunchBook } from "../launch/engine";
import { ensureShill } from "../shill/engine";
import { SHILL_HOUSE_OWNER } from "../shill/types";
import { activeMembers, ensureCircle } from "../circle/engine";
import { accountsOf } from "../auth/accounts";
import { bookHoldingUsd, type Prices } from "./stats";
import type { AppState } from "../types";
import type { AdminPlatform, AdminPlatformOnchain } from "./types";

const DAY = 86_400_000;

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function round4(n: number) {
  return Math.round((Number(n) || 0) * 10_000) / 10_000;
}

function addPk(set: Set<string>, pk?: string | null) {
  const v = (pk || "").trim();
  if (v && isSolanaAddress(v)) set.add(v);
}

/** User-facing wallets on Solphia (not protocol / not the house bot). */
export function userWalletsOf(state: AppState): string[] {
  const set = new Set<string>();
  for (const u of state.users || []) addPk(set, u.pubkey);
  for (const a of accountsOf(state)) for (const pk of a.wallets || []) addPk(set, pk);
  for (const pk of Object.keys(state.launch?.accounts || {})) addPk(set, pk);
  for (const t of Object.values(state.traders || {})) {
    addPk(set, t.owner);
    addPk(set, t.tradingPubkey || t.auto?.tradingPubkey);
  }
  for (const pk of protocolWalletsOf(state)) set.delete(pk);
  return [...set];
}

export function protocolWalletsOf(state: AppState): string[] {
  const set = new Set<string>();
  addPk(set, state.treasuryWallet);
  addPk(set, state.ownerWallet || state.launch?.ownerWallet);
  addPk(set, state.foundationWallet);
  addPk(set, state.airdropWallet);
  addPk(set, state.lpWallet);
  addPk(set, state.devWallet);
  return [...set];
}

export function buildPlatformSnapshot(
  state: AppState,
  now = Date.now(),
  prices: Prices = { solUsd: 0, spyxUsd: 0, qqqxUsd: 0, gldxUsd: 0 },
  onchain?: AdminPlatformOnchain | null,
): AdminPlatform {
  const launch = state.launch || emptyLaunchBook();
  const coins = launch.coins || [];
  const shill = ensureShill(state.shill);
  const circle = ensureCircle(state.circle);
  const logins = accountsOf(state);
  const users = state.users || [];
  const solUsd = Number(prices.solUsd) || 0;
  const px: Prices = {
    solUsd,
    spyxUsd: Number(prices.spyxUsd) || 0,
    qqqxUsd: Number(prices.qqqxUsd) || 0,
    gldxUsd: Number(prices.gldxUsd) || 0,
  };

  const since24 = now - DAY;
  const since7 = now - 7 * DAY;

  const active24 = new Set<string>();
  const active7 = new Set<string>();
  const mark = (pk: string | undefined, at: number) => {
    if (!pk || pk === SHILL_HOUSE_OWNER || !isSolanaAddress(pk) || !(at > 0)) return;
    if (at >= since7) active7.add(pk);
    if (at >= since24) active24.add(pk);
  };

  for (const u of users) {
    mark(u.pubkey, u.lastSeen);
    mark(u.pubkey, u.createdAt);
  }
  for (const a of logins) {
    mark(a.wallets?.[0], a.lastSeen);
    mark(a.wallets?.[0], a.createdAt);
    for (const pk of a.wallets || []) mark(pk, a.lastSeen);
  }
  for (const t of Object.values(state.traders || {})) mark(t.owner, t.updatedAt);

  let padVolSol24h = 0;
  let padTxns24h = 0;
  const padTraders = new Set<string>();
  let padTvlSol = 0;
  let liveLaunches = 0;
  let graduated = 0;

  for (const c of coins) {
    if (c.status === "graduated") graduated += 1;
    else liveLaunches += 1;
    padTvlSol += Number(c.curve?.realSol) || 0;
    for (const f of c.fills || []) {
      mark(f.owner, f.at);
      if (f.at >= since24) {
        padVolSol24h += Number(f.sol) || 0;
        padTxns24h += 1;
        if (f.owner) padTraders.add(f.owner);
      }
    }
  }

  let shillMsgs24h = 0;
  for (const m of shill.messages || []) {
    if (m.at >= since24) shillMsgs24h += 1;
    if (m.owner !== SHILL_HOUSE_OWNER) mark(m.owner, m.at);
  }
  for (const mem of Object.values(shill.members || {})) {
    mark(mem.pubkey, mem.lastReadAt || mem.lastCaAt || 0);
  }

  for (const acc of Object.values(launch.accounts || {})) {
    for (const ev of acc.rankEvents || []) mark(acc.pubkey, ev.at);
  }

  for (const m of circle.messages || []) mark(m.owner, m.at);

  const loginIds24 = new Set(logins.filter((a) => now - (a.createdAt || 0) < DAY).map((a) => a.id));
  const newWalletOnly = users.filter((u) => {
    if (now - (u.createdAt || 0) >= DAY) return false;
    if (u.accountId && loginIds24.has(u.accountId)) return false;
    return true;
  }).length;

  const wallets = userWalletsOf(state);
  const protocol = protocolWalletsOf(state);
  let deskUsd = bookHoldingUsd(state.paper, px);
  for (const t of Object.values(state.traders || {})) {
    deskUsd += bookHoldingUsd(t.book, px);
  }

  const userWalletSol = round4(onchain?.userSol || 0);
  const protocolSol = round4(onchain?.protocolSol || 0);
  const sampledWallets = onchain?.sampled || 0;
  const assetsUsd = round2(deskUsd + (padTvlSol + userWalletSol + protocolSol) * solUsd);

  let swaps24h = padTxns24h;
  for (const acc of Object.values(launch.accounts || {})) {
    for (const ev of acc.rankEvents || []) {
      if (ev.kind === "swap" && ev.at >= since24) swaps24h += 1;
    }
  }

  return {
    wallets: wallets.length,
    logins: logins.length,
    active24h: active24.size,
    active7d: active7.size,
    new24h: loginIds24.size + newWalletOnly,
    launches: coins.length,
    liveLaunches,
    graduated,
    padTvlSol: round4(padTvlSol),
    padVolSol24h: round4(padVolSol24h),
    padTxns24h,
    padTraders24h: padTraders.size,
    shillMembers: Object.keys(shill.members || {}).length,
    shillMsgs24h,
    circleMembers: activeMembers(circle).length,
    ranked: Object.values(launch.accounts || {}).filter((a) => (a.xp || 0) > 0).length,
    swaps24h,
    deskUsd: round2(deskUsd),
    userWalletSol,
    protocolSol,
    sampledWallets,
    knownWallets: wallets.length + protocol.length,
    assetsUsd,
    solUsd: round2(solUsd),
  };
}
