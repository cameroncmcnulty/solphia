import { Keypair } from "@solana/web3.js";
import { isSolanaAddress } from "./addr";
import { loadOwner, persistOwner } from "./owner";
import {
  decodeSecretPayload,
  encodeSecretPayload,
  pinMatches,
  pinOk,
  pinVerifier,
  unwrapWithPin,
  wrapWithPin,
  type Cipher,
} from "./vaultCrypto";
import { importKeypair, newPhrase, phraseOk, secretB58 } from "./phrase";

export const VAULT_EVENT = "solphia:vault";
export const VAULT_UNLOCK_EVENT = "solphia:wallet-unlock";
const META_KEY = "solphia_vault_meta";
const SECRETS_KEY = "solphia_vault_secrets";

export type WalletKind = "embedded" | "phantom";

export type VaultWallet = {
  id: string;
  kind: WalletKind;
  pubkey: string;
  nickname: string;
  hidden: boolean;
  backupConfirmed: boolean;
  createdAt: number;
  account: number;
};

type Meta = {
  v: 1;
  activeId: string;
  pin: Cipher | null;
  wallets: VaultWallet[];
};

type Secrets = Record<string, Cipher>;

type Unlocked = {
  secret: Uint8Array;
  mnemonic?: string;
  keypair: Keypair;
};

let pinKey = "";
const unlocked = new Map<string, Unlocked>();
let unlockWait: ((ok: boolean) => void) | null = null;

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  const s = store();
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  const s = store();
  if (!s) throw new Error("This browser blocked local wallet storage.");
  s.setItem(key, JSON.stringify(value));
}

function newId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function emptyMeta(): Meta {
  return { v: 1, activeId: "", pin: null, wallets: [] };
}

export function readVaultMeta(): Meta {
  const meta = readJson<Meta>(META_KEY, emptyMeta());
  if (!meta || meta.v !== 1 || !Array.isArray(meta.wallets)) return emptyMeta();
  return {
    v: 1,
    activeId: typeof meta.activeId === "string" ? meta.activeId : "",
    pin: meta.pin || null,
    wallets: meta.wallets.filter((w) => w && isSolanaAddress(w.pubkey)),
  };
}

function writeMeta(meta: Meta) {
  writeJson(META_KEY, meta);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VAULT_EVENT, { detail: meta }));
  }
}

function readSecrets(): Secrets {
  const raw = readJson<Secrets>(SECRETS_KEY, {});
  return raw && typeof raw === "object" ? raw : {};
}

function writeSecrets(next: Secrets) {
  writeJson(SECRETS_KEY, next);
}

export function vaultHasPin(): boolean {
  return Boolean(readVaultMeta().pin);
}

export function vaultUnlocked(): boolean {
  return Boolean(pinKey);
}

export function listWallets(opts?: { hidden?: boolean }): VaultWallet[] {
  const rows = readVaultMeta().wallets.slice().sort((a, b) => a.createdAt - b.createdAt);
  if (opts?.hidden) return rows;
  return rows.filter((w) => !w.hidden);
}

export function activeWallet(): VaultWallet | null {
  const meta = readVaultMeta();
  return meta.wallets.find((w) => w.id === meta.activeId) || meta.wallets.find((w) => !w.hidden) || null;
}

export function walletByPubkey(pubkey: string | null | undefined): VaultWallet | null {
  if (!pubkey) return null;
  return readVaultMeta().wallets.find((w) => w.pubkey === pubkey) || null;
}

export function activeIsEmbedded(): boolean {
  return activeWallet()?.kind === "embedded";
}

function announceOwner(pubkey: string) {
  persistOwner(pubkey);
}

function rememberUnlocked(id: string, secret: Uint8Array, mnemonic: string | undefined, pubkey: string) {
  unlocked.set(id, {
    secret,
    mnemonic,
    keypair: Keypair.fromSecretKey(secret),
  });
  void pubkey;
}

export function lockVault() {
  pinKey = "";
  for (const row of unlocked.values()) {
    row.secret.fill(0);
  }
  unlocked.clear();
}

export async function unlockVault(pin: string): Promise<void> {
  const clean = pin.trim();
  if (!pinOk(clean)) throw new Error("PIN is 4–8 digits.");
  const meta = readVaultMeta();
  if (!meta.pin) throw new Error("Set a PIN when you create a Solphia wallet.");
  if (!(await pinMatches(clean, meta.pin))) throw new Error("Wrong PIN.");
  pinKey = clean;
  const secrets = readSecrets();
  for (const w of meta.wallets) {
    if (w.kind !== "embedded") continue;
    const cipher = secrets[w.id];
    if (!cipher) continue;
    const payload = decodeSecretPayload(await unwrapWithPin(clean, cipher));
    rememberUnlocked(w.id, payload.secret, payload.mnemonic, payload.pubkey);
  }
}

export async function setVaultPin(pin: string): Promise<void> {
  const clean = pin.trim();
  if (!pinOk(clean)) throw new Error("PIN is 4–8 digits.");
  const meta = readVaultMeta();
  if (meta.pin && pinKey && pinKey !== clean) {
    const secrets = readSecrets();
    const next: Secrets = { ...secrets };
    for (const w of meta.wallets) {
      if (w.kind !== "embedded") continue;
      const row = unlocked.get(w.id);
      if (!row) throw new Error("Unlock this wallet before changing the PIN.");
      next[w.id] = await wrapWithPin(
        clean,
        encodeSecretPayload({ secret: row.secret, mnemonic: row.mnemonic, pubkey: w.pubkey }),
      );
    }
    writeSecrets(next);
  }
  meta.pin = await pinVerifier(clean);
  writeMeta(meta);
  pinKey = clean;
}

async function requirePin(pin?: string): Promise<string> {
  if (pinKey) return pinKey;
  if (pin && pinOk(pin.trim())) {
    if (readVaultMeta().pin) await unlockVault(pin.trim());
    else await setVaultPin(pin.trim());
    return pinKey;
  }
  throw new Error("Unlock with your PIN first.");
}

export async function createEmbeddedWallet(opts: {
  pin?: string;
  nickname?: string;
  phrase?: string;
  secret?: string;
  account?: number;
}): Promise<{ wallet: VaultWallet; phrase?: string; firstTime: boolean }> {
  const firstTime = !vaultHasPin();
  const pin = await requirePin(opts.pin);
  const account = Math.max(0, Math.floor(opts.account || 0));
  let phrase: string | undefined;
  let keypair: Keypair;
  if (opts.secret) {
    const got = importKeypair(opts.secret, account);
    keypair = got.keypair;
    phrase = got.phrase;
  } else if (opts.phrase) {
    if (!phraseOk(opts.phrase)) throw new Error("That recovery phrase is not valid.");
    const got = importKeypair(opts.phrase, account);
    keypair = got.keypair;
    phrase = got.phrase;
  } else {
    phrase = newPhrase();
    const got = importKeypair(phrase, account);
    keypair = got.keypair;
  }
  const pubkey = keypair.publicKey.toBase58();
  const meta = readVaultMeta();
  if (meta.wallets.some((w) => w.pubkey === pubkey)) throw new Error("That wallet is already on this device.");
  const id = newId();
  const imported = Boolean(opts.phrase || opts.secret);
  const wallet: VaultWallet = {
    id,
    kind: "embedded",
    pubkey,
    nickname: (opts.nickname || "").trim().slice(0, 24) || `Wallet ${meta.wallets.length + 1}`,
    hidden: false,
    backupConfirmed: imported,
    createdAt: Date.now(),
    account,
  };
  const secrets = readSecrets();
  secrets[id] = await wrapWithPin(
    pin,
    encodeSecretPayload({ secret: keypair.secretKey, mnemonic: phrase, pubkey }),
  );
  writeSecrets(secrets);
  meta.wallets.push(wallet);
  meta.activeId = id;
  writeMeta(meta);
  rememberUnlocked(id, keypair.secretKey, phrase, pubkey);
  announceOwner(pubkey);
  return { wallet, phrase, firstTime };
}

export function addPhantomWallet(pubkey: string, nickname?: string): VaultWallet {
  if (!isSolanaAddress(pubkey)) throw new Error("Bad Phantom address.");
  const meta = readVaultMeta();
  const existing = meta.wallets.find((w) => w.pubkey === pubkey);
  if (existing) {
    existing.hidden = false;
    if (nickname) existing.nickname = nickname.trim().slice(0, 24);
    meta.activeId = existing.id;
    writeMeta(meta);
    announceOwner(pubkey);
    return existing;
  }
  const wallet: VaultWallet = {
    id: newId(),
    kind: "phantom",
    pubkey,
    nickname: (nickname || "").trim().slice(0, 24) || "Phantom",
    hidden: false,
    backupConfirmed: true,
    createdAt: Date.now(),
    account: 0,
  };
  meta.wallets.push(wallet);
  meta.activeId = wallet.id;
  writeMeta(meta);
  announceOwner(pubkey);
  return wallet;
}

export function switchWallet(id: string): VaultWallet {
  const meta = readVaultMeta();
  const wallet = meta.wallets.find((w) => w.id === id);
  if (!wallet) throw new Error("Wallet not on this device.");
  meta.activeId = id;
  writeMeta(meta);
  announceOwner(wallet.pubkey);
  return wallet;
}

export function renameWallet(id: string, nickname: string) {
  const meta = readVaultMeta();
  const wallet = meta.wallets.find((w) => w.id === id);
  if (!wallet) return;
  wallet.nickname = nickname.trim().slice(0, 24) || wallet.nickname;
  writeMeta(meta);
}

export function hideWallet(id: string, hidden: boolean) {
  const meta = readVaultMeta();
  const wallet = meta.wallets.find((w) => w.id === id);
  if (!wallet) return;
  wallet.hidden = hidden;
  if (hidden && meta.activeId === id) {
    const next = meta.wallets.find((w) => w.id !== id && !w.hidden);
    if (next) {
      meta.activeId = next.id;
      announceOwner(next.pubkey);
    }
  }
  writeMeta(meta);
}

export function markBackupConfirmed(id: string) {
  const meta = readVaultMeta();
  const wallet = meta.wallets.find((w) => w.id === id);
  if (!wallet) return;
  wallet.backupConfirmed = true;
  writeMeta(meta);
}

export function needsBackup(id?: string): boolean {
  const wallet = id ? readVaultMeta().wallets.find((w) => w.id === id) : activeWallet();
  return Boolean(wallet && wallet.kind === "embedded" && !wallet.backupConfirmed);
}

export async function removeWallet(id: string, confirmPhrase?: string): Promise<void> {
  const meta = readVaultMeta();
  const wallet = meta.wallets.find((w) => w.id === id);
  if (!wallet) return;
  if (wallet.kind === "embedded") {
    const row = unlocked.get(id);
    if (!row?.mnemonic) throw new Error("Unlock this wallet, then type three words from the phrase to remove it.");
    const words = row.mnemonic.split(" ");
    const typed = (confirmPhrase || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (typed.length < 3) throw new Error("Type any three words from the recovery phrase to remove it.");
    const have = new Set(words);
    if (!typed.every((w) => have.has(w))) throw new Error("Those words do not match this wallet.");
  }
  meta.wallets = meta.wallets.filter((w) => w.id !== id);
  const secrets = readSecrets();
  delete secrets[id];
  writeSecrets(secrets);
  unlocked.delete(id);
  if (meta.activeId === id) {
    const next = meta.wallets.find((w) => !w.hidden) || meta.wallets[0];
    meta.activeId = next?.id || "";
    if (next) announceOwner(next.pubkey);
  }
  writeMeta(meta);
}

export function unlockedKeypair(id?: string): Keypair | null {
  const wallet = id ? readVaultMeta().wallets.find((w) => w.id === id) : activeWallet();
  if (!wallet || wallet.kind !== "embedded") return null;
  return unlocked.get(wallet.id)?.keypair || null;
}

export function unlockedMnemonic(id?: string): string | null {
  const wallet = id ? readVaultMeta().wallets.find((w) => w.id === id) : activeWallet();
  if (!wallet) return null;
  return unlocked.get(wallet.id)?.mnemonic || null;
}

export function exportSecretB58(id?: string): string | null {
  const wallet = id ? readVaultMeta().wallets.find((w) => w.id === id) : activeWallet();
  if (!wallet) return null;
  const row = unlocked.get(wallet.id);
  if (!row) return null;
  return secretB58(row.secret);
}

export function followInjectedPhantom(): boolean {
  const active = activeWallet();
  if (!active) return false;
  return active.kind === "phantom";
}

/** Phantom is a send rail. Strip it from the vault so it cannot stay the signed-in identity. */
export function dropPhantomWallets(): string[] {
  const meta = readVaultMeta();
  const phantoms = meta.wallets.filter((w) => w.kind === "phantom");
  if (!phantoms.length) return [];
  const pubkeys = phantoms.map((w) => w.pubkey);
  meta.wallets = meta.wallets.filter((w) => w.kind !== "phantom");
  const next = meta.wallets.find((w) => !w.hidden) || meta.wallets[0];
  meta.activeId = next?.id || "";
  writeMeta(meta);
  return pubkeys;
}

export function phantomIsOwner(injectedPk?: string | null): boolean {
  const owner = loadOwner();
  const active = activeWallet();
  if (active?.kind === "phantom") return true;
  if (owner && listWallets({ hidden: true }).some((w) => w.kind === "phantom" && w.pubkey === owner)) return true;
  if (owner && injectedPk && owner === injectedPk) return true;
  return false;
}

export function ensurePhantomStub(_pubkey: string | null) {
  /* Phantom is a send/receive rail, not an identity. Do not auto-stub it as a wallet. */
}

export function requestUnlock(id?: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (vaultUnlocked() && unlockedKeypair(id)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const prev = unlockWait;
    unlockWait = (ok) => {
      unlockWait = null;
      prev?.(ok);
      resolve(ok);
    };
    window.dispatchEvent(new CustomEvent(VAULT_UNLOCK_EVENT, { detail: { id: id || activeWallet()?.id || "" } }));
    window.setTimeout(() => {
      if (unlockWait) {
        unlockWait(false);
        unlockWait = null;
      }
    }, 120_000);
  });
}

export function finishUnlockRequest(ok: boolean) {
  if (unlockWait) {
    unlockWait(ok);
    unlockWait = null;
  }
}

export async function ensureUnlockedSigner(): Promise<Keypair | null> {
  const wallet = activeWallet();
  if (!wallet || wallet.kind !== "embedded") return null;
  const have = unlocked.get(wallet.id);
  if (have) return have.keypair;
  const ok = await requestUnlock(wallet.id);
  if (!ok) return null;
  return unlocked.get(wallet.id)?.keypair || null;
}
