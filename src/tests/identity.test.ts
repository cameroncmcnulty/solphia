import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Keypair } from "@solana/web3.js";
import { OWNER_HYDRATE_SCRIPT, OWNER_KEY } from "../lib/wallet/owner";

function mockBrowser() {
  const mem = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] || null,
    get length() {
      return mem.size;
    },
  };
  const g = globalThis as unknown as {
    window: Record<string, unknown>;
    localStorage: typeof ls;
    sessionStorage: typeof ls;
    document: { cookie: string };
    location: { protocol: string };
    fetch?: typeof fetch;
  };
  g.localStorage = ls;
  g.sessionStorage = ls;
  g.document = { cookie: "" };
  g.location = { protocol: "http:" };
  g.window = {
    localStorage: ls,
    sessionStorage: ls,
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    crypto: globalThis.crypto,
  };
  g.fetch = (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
  return { mem, ls, g };
}

describe("header identity", () => {
  it("does not treat a remember cookie as a login when this device has no Solphia wallet", async () => {
    const { mem } = mockBrowser();
    const phantomPk = Keypair.generate().publicKey.toBase58();
    mem.set(OWNER_KEY, phantomPk);
    const { persistOwner } = await import("../lib/wallet/owner");
    persistOwner(phantomPk, { announce: false, server: false });
    const { syncOwnerToSignedInAccount, ownerIsEmbedded } = await import("../lib/wallet/identity");
    assert.equal(ownerIsEmbedded(phantomPk), false);
    assert.equal(syncOwnerToSignedInAccount(), null);
    const { loadOwner } = await import("../lib/wallet/owner");
    assert.equal(loadOwner(), null);
  });

  it("does not keep a local embedded wallet as identity without a signed-in account", async () => {
    const { mem } = mockBrowser();
    const { createEmbeddedWallet } = await import("../lib/wallet/vault");
    const { newPhrase } = await import("../lib/wallet/phrase");
    const created = await createEmbeddedWallet({ pin: "2468", phrase: newPhrase() });
    const { syncOwnerToSignedInAccount, ownerIsEmbedded } = await import("../lib/wallet/identity");
    assert.equal(ownerIsEmbedded(created.wallet.pubkey), true);
    assert.equal(Boolean(mem.get("solphia_account")), false);
    assert.equal(syncOwnerToSignedInAccount(), null);
    const { loadOwner } = await import("../lib/wallet/owner");
    assert.equal(loadOwner(), null);
  });

  it("does not attach a leftover vault wallet to an account that does not own it", async () => {
    const { mem } = mockBrowser();
    const { createEmbeddedWallet } = await import("../lib/wallet/vault");
    const { newPhrase } = await import("../lib/wallet/phrase");
    const created = await createEmbeddedWallet({ pin: "2468", phrase: newPhrase() });
    mem.set(
      "solphia_account",
      JSON.stringify({
        id: "acct_other",
        email: null,
        google: false,
        emailVerified: false,
        tosAcceptedAt: 1,
        wallets: [] as string[],
        createdAt: 1,
        totpEnabled: false,
      }),
    );
    const { syncOwnerToSignedInAccount, ownerIsEmbedded } = await import("../lib/wallet/identity");
    assert.equal(ownerIsEmbedded(created.wallet.pubkey), true);
    assert.equal(syncOwnerToSignedInAccount(), null);
    const { loadOwner } = await import("../lib/wallet/owner");
    assert.equal(loadOwner(), null);
  });

  it("keeps a local embedded wallet only while the account cache lists that pubkey", async () => {
    const { mem } = mockBrowser();
    const { createEmbeddedWallet } = await import("../lib/wallet/vault");
    const { newPhrase } = await import("../lib/wallet/phrase");
    const created = await createEmbeddedWallet({ pin: "2468", phrase: newPhrase() });
    mem.set(
      "solphia_account",
      JSON.stringify({
        id: "acct_test",
        email: null,
        google: false,
        emailVerified: false,
        tosAcceptedAt: 1,
        wallets: [created.wallet.pubkey],
        createdAt: 1,
        totpEnabled: false,
      }),
    );
    const { syncOwnerToSignedInAccount, ownerIsEmbedded } = await import("../lib/wallet/identity");
    assert.equal(ownerIsEmbedded(created.wallet.pubkey), true);
    assert.equal(syncOwnerToSignedInAccount(), created.wallet.pubkey);
    const { loadOwner } = await import("../lib/wallet/owner");
    assert.equal(loadOwner(), created.wallet.pubkey);
  });

  it("boot script ignores a wallet unless a cached account and local embedded vault both exist", () => {
    assert.match(OWNER_HYDRATE_SCRIPT, /solphia_account/);
    assert.match(OWNER_HYDRATE_SCRIPT, /solphia_vault_meta/);
    assert.match(OWNER_HYDRATE_SCRIPT, /kind==="embedded"/);
    assert.match(OWNER_HYDRATE_SCRIPT, /!signed\|\|!pk\|\|!embedded/);
    assert.match(OWNER_HYDRATE_SCRIPT, /Max-Age=0/);
    assert.match(OWNER_HYDRATE_SCRIPT, /__SOLPHIA_OWNER=null/);
  });

  it("header menu chips the signed-in account, not a leftover wallet", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../components/AccountMenu.tsx", import.meta.url), "utf8");
    assert.match(src, /if \(!signedIn\) return <WalletConnect \/>/);
    const keep = readFileSync(new URL("../components/WalletConnect.tsx", import.meta.url), "utf8");
    assert.match(keep, /syncOwnerToSignedInAccount/);
    assert.equal(keep.includes("logoutAccount"), false);
    assert.match(keep, /refreshAccount/);
    const connect = keep.slice(keep.indexOf("export function WalletConnect"));
    assert.equal(connect.includes("btn-ghost"), false);
    assert.equal(connect.includes("z-[70]"), false);
    const sheet = readFileSync(new URL("../components/wallet/sheet.tsx", import.meta.url), "utf8");
    assert.match(sheet, /createPortal/);
  });

  it("connect is wallet create/import only — no email, no Google, no Phantom login", async () => {
    const { readFileSync } = await import("node:fs");
    const connectSrc = readFileSync(new URL("../components/WalletConnect.tsx", import.meta.url), "utf8");
    const connectBtn = connectSrc.slice(connectSrc.indexOf("export function WalletConnect"));
    assert.match(connectBtn, />WALLET</);
    assert.equal(connectBtn.includes("SIGN IN"), false);
    assert.equal(connectBtn.includes(">CONNECT<"), false);
    const gate = readFileSync(new URL("../components/auth/AccountGate.tsx", import.meta.url), "utf8");
    assert.match(gate, /WalletOnboard/);
    assert.equal(gate.includes("/api/auth/google"), false);
    assert.equal(gate.includes("/api/auth/signup"), false);
    const host = readFileSync(new URL("../components/wallet/WalletHost.tsx", import.meta.url), "utf8");
    assert.match(host, /CONNECT_FLOW/);
    assert.equal(host.includes("<AccountGate"), false);
    const google = readFileSync(new URL("../app/api/auth/google/route.ts", import.meta.url), "utf8");
    assert.match(google, /retiredAuthBody/);
    const signup = readFileSync(new URL("../app/api/auth/signup/route.ts", import.meta.url), "utf8");
    assert.match(signup, /retiredAuthBody/);
    const login = readFileSync(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
    assert.match(login, /retiredAuthBody/);
    const client = readFileSync(new URL("../lib/auth/client.ts", import.meta.url), "utf8");
    assert.match(client, /startWalletSession/);
    assert.equal(client.includes("linkDeviceWallets"), false);
    const persist = readFileSync(new URL("../lib/persist.ts", import.meta.url), "utf8");
    assert.match(persist, /loginAccounts: "solphia:login-accounts"/);
    const store = readFileSync(new URL("../lib/store.ts", import.meta.url), "utf8");
    assert.match(store, /overlayLoginAccounts/);
    assert.match(store, /persistLoginAccounts/);
    assert.match(store, /KEYS.loginAccounts/);
    const menu = readFileSync(new URL("../components/AccountMenu.tsx", import.meta.url), "utf8");
    assert.match(menu, /authReady/);
  });

  it("create flow copies the phrase, then confirm words, then a PIN", async () => {
    const { readFileSync } = await import("node:fs");
    const onboard = readFileSync(new URL("../components/wallet/WalletOnboard.tsx", import.meta.url), "utf8");
    assert.match(onboard, /Copy phrase/);
    assert.match(onboard, /I saved these words/);
    assert.match(onboard, /pickConfirmSlots/);
    assert.match(onboard, /Create a PIN/);
    assert.match(onboard, /wipeVault/);
    assert.match(onboard, /startWalletSession/);
    assert.match(onboard, /markBackupConfirmed/);
    assert.match(onboard, /addDerivedWallet/);
    assert.equal(onboard.includes("/api/auth/google"), false);
    assert.equal(onboard.includes("/api/auth/signup"), false);
  });

  it("a new seed after sign-out wipes the leftover vault instead of attaching it", async () => {
    const { readFileSync } = await import("node:fs");
    const onboard = readFileSync(new URL("../components/wallet/WalletOnboard.tsx", import.meta.url), "utf8");
    assert.match(onboard, /replace: !signedIn/);
    assert.match(onboard, /wipeVault\(\)/);
    assert.match(onboard, /startWalletSession/);
    const vault = readFileSync(new URL("../lib/wallet/vault.ts", import.meta.url), "utf8");
    assert.match(vault, /export function wipeVault/);
    assert.match(vault, /This device already has a wallet/);
    const client = readFileSync(new URL("../lib/auth/client.ts", import.meta.url), "utf8");
    assert.match(client, /Unlock this wallet first/);
    assert.match(client, /acceptAccount\(j\.account\)/);
  });

  it("linkAccountWallet refuses when there is no signed-in account", async () => {
    mockBrowser();
    const { linkAccountWallet } = await import("../lib/auth/client");
    await assert.rejects(
      () => linkAccountWallet("D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81"),
      /Unlock this wallet first/,
    );
  });

  it("linkAccountWallet writes the account cache when the server attaches the pubkey", async () => {
    const { mem } = mockBrowser();
    const pk = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
    const account = {
      id: "acct_test",
      email: null as string | null,
      google: false,
      emailVerified: false,
      tosAcceptedAt: 1,
      wallets: [] as string[],
      createdAt: 1,
      totpEnabled: false,
    };
    mem.set("solphia_account", JSON.stringify(account));
    const g = globalThis as unknown as { fetch?: typeof fetch };
    g.fetch = (async (_url: string, init?: RequestInit) => {
      if (String(_url).includes("/api/auth/wallets") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ ok: true, account: { ...account, wallets: [pk] } }),
        };
      }
      return { ok: true, json: async () => ({ account }) };
    }) as unknown as typeof fetch;
    const { linkAccountWallet, peekAccount } = await import("../lib/auth/client");
    const linked = await linkAccountWallet(pk);
    assert.deepEqual(linked.wallets, [pk]);
    assert.deepEqual(peekAccount()?.wallets, [pk]);
  });

  it("startWalletSession writes the account for that pubkey only", async () => {
    mockBrowser();
    const pk = "D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81";
    const account = {
      id: "acct_wallet",
      email: null as string | null,
      google: false,
      emailVerified: false,
      tosAcceptedAt: 1,
      wallets: [pk],
      createdAt: 1,
      totpEnabled: false,
    };
    const g = globalThis as unknown as { fetch?: typeof fetch };
    g.fetch = (async (url: string) => {
      if (String(url).includes("/api/auth/wallet-session")) {
        return { ok: true, json: async () => ({ ok: true, account }) };
      }
      return { ok: true, json: async () => ({ account }) };
    }) as unknown as typeof fetch;
    const { startWalletSession, peekAccount } = await import("../lib/auth/client");
    const opened = await startWalletSession(pk, { tos: true, privacy: true });
    assert.equal(opened.id, "acct_wallet");
    assert.deepEqual(opened.wallets, [pk]);
    assert.equal(peekAccount()?.id, "acct_wallet");
  });

  it("wallet remember cookie is not an identity without an account session", async () => {
    const { readFileSync } = await import("node:fs");
    const remember = readFileSync(new URL("../app/api/wallet/remember/route.ts", import.meta.url), "utf8");
    assert.match(remember, /readAccountId/);
    const owner = readFileSync(new URL("../lib/wallet/owner.ts", import.meta.url), "utf8");
    assert.match(owner, /accountCached/);
    const logout = readFileSync(new URL("../lib/auth/client.ts", import.meta.url), "utf8");
    assert.match(logout, /forgetOwner/);
    assert.match(logout, /lockVault/);
    assert.match(logout, /solphia_signed_out/);
    assert.match(logout, /lockSignedOut\(\)/);
    const host = readFileSync(new URL("../components/wallet/WalletHost.tsx", import.meta.url), "utf8");
    assert.match(host, /clearSignedOutLock/);
    assert.match(host, /signedin/);
    const keep = readFileSync(new URL("../components/WalletConnect.tsx", import.meta.url), "utf8");
    assert.match(keep, /isSignedOutLocked\(\)/);
    assert.match(keep, /30_000/);
    assert.equal(keep.includes("setInterval(() => void align(), 8000)"), false);
    const live = readFileSync(new URL("../components/LiveRunner.tsx", import.meta.url), "utf8");
    assert.match(live, /document\.hidden/);
    const seat = readFileSync(new URL("../components/SeatRunner.tsx", import.meta.url), "utf8");
    assert.match(seat, /document\.hidden/);
    const session = readFileSync(new URL("../lib/auth/session.ts", import.meta.url), "utf8");
    assert.match(session, /cookies\.delete\(SESSION_COOKIE\)/);
  });

  it("forced sign-out stays signed out until an explicit sign-in", async () => {
    const { mem } = mockBrowser();
    const account = {
      id: "acct_test",
      email: null as string | null,
      google: false,
      emailVerified: false,
      tosAcceptedAt: 1,
      wallets: [] as string[],
      createdAt: 1,
      totpEnabled: false,
    };
    mem.set("solphia_account", JSON.stringify(account));
    let meCalls = 0;
    const g = globalThis as unknown as { fetch?: typeof fetch };
    g.fetch = (async (url: string) => {
      if (String(url).includes("/api/auth/me")) {
        meCalls += 1;
        return { ok: true, json: async () => ({ account }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    }) as unknown as typeof fetch;
    const { logoutAccount, refreshAccount, peekAccount, acceptAccount, isSignedOutLocked } = await import("../lib/auth/client");
    await logoutAccount();
    assert.equal(peekAccount(), null);
    assert.equal(isSignedOutLocked(), true);
    assert.equal(mem.get("solphia_signed_out"), "1");
    const restored = await refreshAccount();
    assert.equal(restored, null);
    assert.equal(peekAccount(), null);
    assert.equal(meCalls, 0);
    acceptAccount(account);
    assert.equal(isSignedOutLocked(), false);
    assert.equal(peekAccount()?.id, "acct_test");
    const after = await refreshAccount();
    assert.equal(after?.id, "acct_test");
    assert.equal(meCalls, 1);
  });

  it("a newer wallet session stays when /me still has the other cookie", async () => {
    const { mem } = mockBrowser();
    const a = {
      id: "acct_a",
      email: null as string | null,
      google: false,
      emailVerified: false,
      tosAcceptedAt: 1,
      wallets: [] as string[],
      createdAt: 1,
      totpEnabled: false,
    };
    const b = { ...a, id: "acct_b", wallets: ["D4uCNcBKAbG9NAkmhQg7pBiztuejNzbWrZDcZmFGut81"] };
    mem.set("solphia_account", JSON.stringify(a));
    const g = globalThis as unknown as { fetch?: typeof fetch };
    g.fetch = (async (url: string) => {
      if (String(url).includes("/api/auth/me")) {
        return { ok: true, json: async () => ({ account: a }) };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    }) as unknown as typeof fetch;
    const { logoutAccount, refreshAccount, peekAccount, acceptAccount } = await import("../lib/auth/client");
    await logoutAccount();
    assert.equal(peekAccount(), null);
    acceptAccount(b);
    assert.equal(peekAccount()?.id, "acct_b");
    const raced = await refreshAccount();
    assert.equal(raced?.id, "acct_b");
    assert.equal(peekAccount()?.id, "acct_b");
  });

  it("account settings reveals the phrase only after a warning", async () => {
    const { readFileSync } = await import("node:fs");
    const settings = readFileSync(new URL("../components/wallet/RecoveryPhrase.tsx", import.meta.url), "utf8");
    assert.match(settings, /Do not share this phrase/);
    assert.match(settings, /Solphia will never ask for it/);
    assert.match(settings, /Show recovery phrase/);
    const account = readFileSync(new URL("../app/account/page.tsx", import.meta.url), "utf8");
    assert.match(account, /RecoveryPhraseSettings/);
    assert.equal(account.includes("TotpSettings"), false);
    const wallet = readFileSync(new URL("../app/wallet/page.tsx", import.meta.url), "utf8");
    assert.match(wallet, /RefreshCw/);
    assert.match(wallet, /Refresh balances/);
    assert.match(wallet, /Show secret recovery phrase/);
  });
});
