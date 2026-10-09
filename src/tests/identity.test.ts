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
    const { syncOwnerToDeviceVault, ownerIsEmbedded } = await import("../lib/wallet/identity");
    assert.equal(ownerIsEmbedded(phantomPk), false);
    assert.equal(syncOwnerToDeviceVault(), null);
    const { loadOwner } = await import("../lib/wallet/owner");
    assert.equal(loadOwner(), null);
  });

  it("keeps a local embedded wallet as identity", async () => {
    mockBrowser();
    const { createEmbeddedWallet } = await import("../lib/wallet/vault");
    const { newPhrase } = await import("../lib/wallet/phrase");
    const created = await createEmbeddedWallet({ pin: "2468", phrase: newPhrase() });
    const { syncOwnerToDeviceVault, ownerIsEmbedded } = await import("../lib/wallet/identity");
    assert.equal(ownerIsEmbedded(created.wallet.pubkey), true);
    assert.equal(syncOwnerToDeviceVault(), created.wallet.pubkey);
    const { loadOwner } = await import("../lib/wallet/owner");
    assert.equal(loadOwner(), created.wallet.pubkey);
  });

  it("boot script ignores a cookie unless that pubkey is a local embedded wallet", () => {
    assert.match(OWNER_HYDRATE_SCRIPT, /solphia_vault_meta/);
    assert.match(OWNER_HYDRATE_SCRIPT, /kind==="embedded"/);
    assert.match(OWNER_HYDRATE_SCRIPT, /Max-Age=0/);
    assert.match(OWNER_HYDRATE_SCRIPT, /__SOLPHIA_OWNER=null/);
  });

  it("header menu only chips an embedded Solphia wallet", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../components/AccountMenu.tsx", import.meta.url), "utf8");
    assert.match(src, /vault\?\.kind !== "embedded"/);
    const keep = readFileSync(new URL("../components/WalletConnect.tsx", import.meta.url), "utf8");
    assert.match(keep, /syncOwnerToDeviceVault/);
    assert.match(keep, /ownerIsEmbedded/);
  });
});
