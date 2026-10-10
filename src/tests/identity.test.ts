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

  it("keeps a local embedded wallet only while the account cache is present", async () => {
    const { mem } = mockBrowser();
    const { createEmbeddedWallet } = await import("../lib/wallet/vault");
    const { newPhrase } = await import("../lib/wallet/phrase");
    const created = await createEmbeddedWallet({ pin: "2468", phrase: newPhrase() });
    mem.set(
      "solphia_account",
      JSON.stringify({
        id: "acct_test",
        email: "a@solphia.io",
        google: true,
        emailVerified: true,
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
  });

  it("Google sign-in skips the bot check and pins OAuth to SITE_URL", async () => {
    const { readFileSync } = await import("node:fs");
    const start = readFileSync(new URL("../app/api/auth/google/route.ts", import.meta.url), "utf8");
    assert.equal(start.includes("verifyBot"), false);
    assert.match(start, /SITE_URL/);
    const cb = readFileSync(new URL("../app/api/auth/google/callback/route.ts", import.meta.url), "utf8");
    assert.match(cb, /SITE_URL/);
    assert.match(cb, /cookieState && state !== cookieState/);
    assert.match(cb, /readOauthState\(state\)/);
    const gate = readFileSync(new URL("../components/auth/AccountGate.tsx", import.meta.url), "utf8");
    const googleBlock = gate.slice(gate.indexOf('screen === "google"'), gate.indexOf('screen === "email"'));
    assert.equal(googleBlock.includes("BotCheck"), false);
    assert.match(gate, /mode === "signin"/);
  });

  it("wallet remember cookie is not an identity without an account session", async () => {
    const { readFileSync } = await import("node:fs");
    const remember = readFileSync(new URL("../app/api/wallet/remember/route.ts", import.meta.url), "utf8");
    assert.match(remember, /readAccountId/);
    const owner = readFileSync(new URL("../lib/wallet/owner.ts", import.meta.url), "utf8");
    assert.match(owner, /accountCached/);
    const logout = readFileSync(new URL("../lib/auth/client.ts", import.meta.url), "utf8");
    assert.match(logout, /forgetOwner/);
  });
});
