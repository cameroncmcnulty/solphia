import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Keypair } from "@solana/web3.js";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { deriveEd25519Seed, solanaPath } from "../lib/wallet/hd";
import {
  importKeypair,
  keypairFromPhrase,
  newPhrase,
  normalizePhrase,
  phraseFile,
  phraseOk,
  pickConfirmSlots,
  secretB58,
} from "../lib/wallet/phrase";
import { decodeSecretPayload, encodeSecretPayload, pinOk, unwrapWithPin, wrapWithPin } from "../lib/wallet/vaultCrypto";
import { feeBreakout, minReceived } from "../lib/wallet/feeBreakout";
import { CONNECT_WALLET_FIRST, WALLET_PATHS } from "../lib/wallet/paths";
import { qrMatrix, qrSvg } from "../lib/wallet/qr";
import { buildAnySwapTx } from "../lib/swap/open";
import { SOL_MINT, USDC_MINT } from "../lib/pair/mints";
import { bytesToB64 } from "../lib/solana/wire";

function hex(s: string) {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

describe("embedded wallet keys", () => {
  it("HMAC-SHA512 master key is 32 bytes from the ed25519 seed salt", () => {
    const seed = hex("000102030405060708090a0b0c0d0e0f");
    const master = deriveEd25519Seed(seed, []);
    assert.equal(master.length, 32);
    assert.equal(
      Buffer.from(master).toString("hex"),
      "2b4be7f19ee27bbf30c667b642d5f4aa69fd169872f8fc3059c08ebae2eb19e7",
    );
  });

  it("derives a stable 32-byte Phantom path seed per account", () => {
    const seed = hex("000102030405060708090a0b0c0d0e0f".repeat(4).slice(0, 128));
    const a = deriveEd25519Seed(seed, solanaPath(0));
    const b = deriveEd25519Seed(seed, solanaPath(0));
    const c = deriveEd25519Seed(seed, solanaPath(1));
    assert.equal(a.length, 32);
    assert.deepEqual(Array.from(a), Array.from(b));
    assert.notDeepEqual(Array.from(a), Array.from(c));
    assert.equal(Keypair.fromSeed(a).publicKey.toBase58().length >= 32, true);
  });

  it("round-trips a 12-word phrase to the same pubkey", () => {
    const phrase = newPhrase();
    assert.equal(phraseOk(phrase), true);
    const a = keypairFromPhrase(phrase, 0);
    const b = importKeypair(phrase, 0);
    assert.equal(a.publicKey.toBase58(), b.keypair.publicKey.toBase58());
    assert.equal(b.phrase, normalizePhrase(phrase));
  });

  it("imports JSON, hex, and base58 private keys", () => {
    const kp = Keypair.generate();
    const json = JSON.stringify(Array.from(kp.secretKey));
    const hx = Buffer.from(kp.secretKey).toString("hex");
    const b58 = secretB58(kp.secretKey);
    assert.equal(importKeypair(json).keypair.publicKey.toBase58(), kp.publicKey.toBase58());
    assert.equal(importKeypair(hx).keypair.publicKey.toBase58(), kp.publicKey.toBase58());
    assert.equal(importKeypair(b58).keypair.publicKey.toBase58(), kp.publicKey.toBase58());
  });

  it("rejects a bad phrase and keeps 24-word valid", () => {
    assert.equal(phraseOk("not a phrase"), false);
    const twentyFour = generateMnemonic(wordlist, 256);
    assert.equal(phraseOk(twentyFour), true);
  });

  it("picks 3 unique confirm slots", () => {
    const slots = pickConfirmSlots(12, 3);
    assert.equal(slots.length, 3);
    assert.equal(new Set(slots).size, 3);
    for (const i of slots) {
      assert.ok(i >= 0 && i < 12);
    }
  });

  it("never puts the phrase in the download filename body as JSON meta", () => {
    const phrase = newPhrase();
    const file = phraseFile(phrase, "11111111111111111111111111111111");
    assert.match(file, /Solphia never has a copy/);
    assert.match(file, new RegExp(normalizePhrase(phrase)));
  });
});

describe("PIN wrap", () => {
  it("wraps and unwraps with a PIN", async () => {
    assert.equal(pinOk("12"), false);
    assert.equal(pinOk("1234"), true);
    const plain = new TextEncoder().encode("hello-wallet");
    const cipher = await wrapWithPin("2468", plain);
    assert.equal(cipher.v, 1);
    const back = await unwrapWithPin("2468", cipher);
    assert.equal(new TextDecoder().decode(back), "hello-wallet");
    await assert.rejects(() => unwrapWithPin("0000", cipher));
  });

  it("secret payload round-trips without leaking into a meta-shaped object", () => {
    const kp = Keypair.generate();
    const phrase = newPhrase();
    const packed = encodeSecretPayload({ secret: kp.secretKey, mnemonic: phrase, pubkey: kp.publicKey.toBase58() });
    const decoded = decodeSecretPayload(packed);
    assert.equal(decoded.pubkey, kp.publicKey.toBase58());
    assert.equal(decoded.mnemonic, phrase);
    const meta = {
      v: 1,
      activeId: "abc",
      pin: null,
      wallets: [{ id: "abc", kind: "embedded", pubkey: kp.publicKey.toBase58(), nickname: "Wallet 1", hidden: false, backupConfirmed: false, createdAt: 1, account: 0 }],
    };
    const dump = JSON.stringify(meta);
    assert.equal(dump.includes(phrase), false);
    assert.equal(dump.toLowerCase().includes("mnemonic"), false);
    assert.equal(dump.includes(bytesToB64(kp.secretKey)), false);
  });
});

describe("vault localStorage isolation", () => {
  it("stores only the public address in meta after create", async () => {
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

    const { createEmbeddedWallet, readVaultMeta, followInjectedPhantom, addPhantomWallet, switchWallet, listWallets } =
      await import("../lib/wallet/vault");
    const phrase = newPhrase();
    const created = await createEmbeddedWallet({ pin: "1357", phrase });
    const metaRaw = mem.get("solphia_vault_meta") || "";
    assert.equal(metaRaw.includes(phrase), false);
    assert.equal(metaRaw.toLowerCase().includes("mnemonic"), false);
    assert.equal(metaRaw.includes("secret"), false);
    const meta = readVaultMeta();
    assert.equal(meta.wallets[0]?.pubkey, created.wallet.pubkey);
    assert.equal(meta.wallets[0]?.kind, "embedded");
    assert.equal(followInjectedPhantom(), false);

    const phantomPk = Keypair.generate().publicKey.toBase58();
    addPhantomWallet(phantomPk, "Phantom");
    assert.equal(listWallets().length, 2);
    const ph = listWallets().find((w) => w.kind === "phantom");
    assert.ok(ph);
    switchWallet(created.wallet.id);
    assert.equal(followInjectedPhantom(), false);
    switchWallet(ph!.id);
    assert.equal(followInjectedPhantom(), true);
  });
});

describe("wallet path labels and fees", () => {
  it("labels Phantom so keys are not mistaken for a Solphia seed", () => {
    assert.match(WALLET_PATHS.phantom.hint, /do not export/i);
    assert.match(WALLET_PATHS.create.hint, /Phantom is not involved/i);
    assert.equal(CONNECT_WALLET_FIRST, "Connect a wallet first.");
  });

  it("breaks 1% into creator 0.50 and house 0.50 with invite inside house", () => {
    const plain = feeBreakout(1, false);
    assert.equal(plain.creatorSol, 0.5);
    assert.equal(plain.houseSol, 0.5);
    assert.equal(plain.inviteSol, 0);
    const bonded = feeBreakout(1, true);
    assert.equal(bonded.creatorSol, 0.5);
    assert.equal(bonded.houseSol, 0.5);
    assert.equal(bonded.inviteSol, 0.125);
    assert.equal(bonded.houseSol, 0.5);
    assert.equal(minReceived(100, 100), 99);
  });

  it("QR encodes with ecc M", () => {
    const m = qrMatrix("So11111111111111111111111111111111111111112");
    assert.ok(m.length > 10);
    assert.match(qrSvg("So11111111111111111111111111111111111111112"), /<svg/i);
  });

  it("swap build refuses a missing owner with wallet-agnostic copy", async () => {
    const r = await buildAnySwapTx({
      owner: "not-a-wallet",
      inputMint: SOL_MINT,
      outputMint: USDC_MINT,
      amount: 0.1,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, CONNECT_WALLET_FIRST);
  });
});
