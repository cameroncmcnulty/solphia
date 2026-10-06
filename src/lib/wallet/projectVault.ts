"use client";

import { Keypair, Transaction } from "@solana/web3.js";
import { isSolanaAddress } from "./addr";
import { encodeTx } from "../token/mint";
import { b64ToBytes } from "../solana/wire";
import { parseTx, signPackedB64 } from "../solana/extraSign";
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
import { importKeypair, newPhrase, phraseOk } from "./phrase";

export const PROJECT_VAULT_EVENT = "solphia:project-vault";
export const PROJECT_UNLOCK_EVENT = "solphia:project-unlock";

const META_KEY = "solphia_project_vault_meta";
const SECRETS_KEY = "solphia_project_vault_secrets";
const IDLE_MS = 15 * 60_000;

export type ProjectRole = "treasury" | "owner" | "foundation";

export const PROJECT_ROLES: {
  id: ProjectRole;
  label: string;
  kicker: string;
  blurb: string;
  stateKey: "treasuryWallet" | "ownerWallet" | "foundationWallet";
}[] = [
  {
    id: "treasury",
    label: "Treasury",
    kicker: "TREASURY · IN",
    blurb: "Seats, 25% of curve fees, 50% of widget open-market / boosts / pins, and leftover $SPHA. Claim pad partner fees with this wallet.",
    stateKey: "treasuryWallet",
  },
  {
    id: "owner",
    label: "Owner",
    kicker: "OWNER · OUT",
    blurb: "25% of curve fees (12.5% if referred) and 50% of widget open-market / boosts / pins. Signs the $SPHA launch. Holds the 8.6% team slice.",
    stateKey: "ownerWallet",
  },
  {
    id: "foundation",
    label: "Solphia Foundation",
    kicker: "FOUNDATION · $SPHA",
    blurb: "9.7% community / ecosystem / airdrop allocation. Not treasury SOL. Not trading keys.",
    stateKey: "foundationWallet",
  },
];

export type ProjectWallet = {
  role: ProjectRole;
  pubkey: string;
  backupConfirmed: boolean;
  createdAt: number;
};

type Meta = {
  v: 1;
  pin: Cipher | null;
  wallets: ProjectWallet[];
};

type Secrets = Record<string, Cipher>;

type Unlocked = {
  secret: Uint8Array;
  mnemonic?: string;
  keypair: Keypair;
};

let pinKey = "";
const unlocked = new Map<ProjectRole, Unlocked>();
let lastTouch = 0;
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

function emptyMeta(): Meta {
  return { v: 1, pin: null, wallets: [] };
}

export function readProjectMeta(): Meta {
  const meta = readJson<Meta>(META_KEY, emptyMeta());
  if (!meta || meta.v !== 1 || !Array.isArray(meta.wallets)) return emptyMeta();
  return {
    v: 1,
    pin: meta.pin || null,
    wallets: meta.wallets.filter((w) => w && isSolanaAddress(w.pubkey)),
  };
}

function writeMeta(meta: Meta) {
  writeJson(META_KEY, meta);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROJECT_VAULT_EVENT, { detail: meta }));
  }
}

function readSecrets(): Secrets {
  const raw = readJson<Secrets>(SECRETS_KEY, {});
  return raw && typeof raw === "object" ? raw : {};
}

function writeSecrets(next: Secrets) {
  writeJson(SECRETS_KEY, next);
}

function touch() {
  lastTouch = Date.now();
}

export function projectHasPin(): boolean {
  return Boolean(readProjectMeta().pin);
}

export function projectUnlocked(): boolean {
  if (!pinKey) return false;
  if (lastTouch && Date.now() - lastTouch > IDLE_MS) {
    lockProjectVault();
    return false;
  }
  return true;
}

export function listProjectWallets(): ProjectWallet[] {
  return readProjectMeta().wallets.slice().sort((a, b) => a.createdAt - b.createdAt);
}

export function projectWallet(role: ProjectRole): ProjectWallet | null {
  return readProjectMeta().wallets.find((w) => w.role === role) || null;
}

export function lockProjectVault() {
  pinKey = "";
  for (const row of unlocked.values()) row.secret.fill(0);
  unlocked.clear();
}

export async function unlockProjectVault(pin: string): Promise<void> {
  const clean = pin.trim();
  if (!pinOk(clean)) throw new Error("PIN is 4–8 digits.");
  const meta = readProjectMeta();
  if (!meta.pin) throw new Error("Set a PIN when you create the first project wallet.");
  if (!(await pinMatches(clean, meta.pin))) throw new Error("Wrong PIN.");
  pinKey = clean;
  touch();
  const secrets = readSecrets();
  for (const w of meta.wallets) {
    const cipher = secrets[w.role];
    if (!cipher) continue;
    const payload = decodeSecretPayload(await unwrapWithPin(clean, cipher));
    unlocked.set(w.role, {
      secret: payload.secret,
      mnemonic: payload.mnemonic,
      keypair: Keypair.fromSecretKey(payload.secret),
    });
  }
}

export async function setProjectPin(pin: string): Promise<void> {
  const clean = pin.trim();
  if (!pinOk(clean)) throw new Error("PIN is 4–8 digits.");
  const meta = readProjectMeta();
  if (meta.pin && pinKey && pinKey !== clean) {
    const secrets = readSecrets();
    const next: Secrets = { ...secrets };
    for (const w of meta.wallets) {
      const row = unlocked.get(w.role);
      if (!row) throw new Error("Unlock project wallets before changing the PIN.");
      next[w.role] = await wrapWithPin(
        clean,
        encodeSecretPayload({ secret: row.secret, mnemonic: row.mnemonic, pubkey: w.pubkey }),
      );
    }
    writeSecrets(next);
  }
  meta.pin = await pinVerifier(clean);
  writeMeta(meta);
  pinKey = clean;
  touch();
}

async function requirePin(pin?: string): Promise<string> {
  if (projectUnlocked()) return pinKey;
  if (pin && pinOk(pin.trim())) {
    if (readProjectMeta().pin) await unlockProjectVault(pin.trim());
    else await setProjectPin(pin.trim());
    return pinKey;
  }
  throw new Error("Unlock project wallets with your PIN first.");
}

export async function createProjectWallet(opts: {
  role: ProjectRole;
  pin?: string;
  phrase?: string;
  secret?: string;
}): Promise<{ wallet: ProjectWallet; phrase?: string; firstTime: boolean }> {
  const firstTime = !projectHasPin();
  const pin = await requirePin(opts.pin);
  let phrase: string | undefined;
  let keypair: Keypair;
  if (opts.secret) {
    const got = importKeypair(opts.secret, 0);
    keypair = got.keypair;
    phrase = got.phrase;
  } else if (opts.phrase) {
    if (!phraseOk(opts.phrase)) throw new Error("That recovery phrase is not valid.");
    const got = importKeypair(opts.phrase, 0);
    keypair = got.keypair;
    phrase = got.phrase;
  } else {
    phrase = newPhrase();
    const got = importKeypair(phrase, 0);
    keypair = got.keypair;
  }
  const pubkey = keypair.publicKey.toBase58();
  const meta = readProjectMeta();
  if (meta.wallets.some((w) => w.role !== opts.role && w.pubkey === pubkey)) {
    throw new Error("That wallet is already used by another project role.");
  }
  const imported = Boolean(opts.phrase || opts.secret);
  const wallet: ProjectWallet = {
    role: opts.role,
    pubkey,
    backupConfirmed: imported,
    createdAt: Date.now(),
  };
  const secrets = readSecrets();
  secrets[opts.role] = await wrapWithPin(
    pin,
    encodeSecretPayload({ secret: keypair.secretKey, mnemonic: phrase, pubkey }),
  );
  writeSecrets(secrets);
  meta.wallets = meta.wallets.filter((w) => w.role !== opts.role);
  meta.wallets.push(wallet);
  writeMeta(meta);
  unlocked.set(opts.role, { secret: keypair.secretKey, mnemonic: phrase, keypair });
  touch();
  return { wallet, phrase, firstTime };
}

export function markProjectBackupConfirmed(role: ProjectRole) {
  const meta = readProjectMeta();
  const wallet = meta.wallets.find((w) => w.role === role);
  if (!wallet) return;
  wallet.backupConfirmed = true;
  writeMeta(meta);
}

export function projectMnemonic(role: ProjectRole): string | null {
  if (!projectUnlocked()) return null;
  return unlocked.get(role)?.mnemonic || null;
}

export function projectKeypair(role: ProjectRole): Keypair | null {
  if (!projectUnlocked()) return null;
  return unlocked.get(role)?.keypair || null;
}

export function requestProjectUnlock(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (projectUnlocked()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const prev = unlockWait;
    unlockWait = (ok) => {
      unlockWait = null;
      prev?.(ok);
      resolve(ok);
    };
    window.dispatchEvent(new CustomEvent(PROJECT_UNLOCK_EVENT));
    window.setTimeout(() => {
      if (unlockWait) {
        unlockWait(false);
        unlockWait = null;
      }
    }, 120_000);
  });
}

export function finishProjectUnlock(ok: boolean) {
  if (unlockWait) {
    unlockWait(ok);
    unlockWait = null;
  }
}

export async function ensureProjectSigner(role: ProjectRole): Promise<Keypair | null> {
  const have = projectKeypair(role);
  if (have) return have;
  const ok = await requestProjectUnlock();
  if (!ok) return null;
  return projectKeypair(role);
}

export async function signAndSendProjectTx(role: ProjectRole, packed: string, extra?: Keypair[]): Promise<string> {
  const kp = await ensureProjectSigner(role);
  if (!kp) throw new Error("Unlock the project wallet to sign.");
  const signers = extra ? [kp, ...extra] : [kp];
  const signed = signPackedB64(packed, signers);
  const r = await fetch("/api/sol/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transaction: signed, skipPreflight: false }),
    signal: AbortSignal.timeout(12_000),
  });
  const j = (await r.json().catch(() => ({}))) as { error?: string; signature?: string };
  if (!r.ok || !j.signature) throw new Error(j.error || "send failed");
  touch();
  return j.signature;
}

export async function sendProjectSol(role: ProjectRole, to: string, sol: number): Promise<string> {
  if (!isSolanaAddress(to)) throw new Error("That is not a valid Solana address.");
  if (!(sol > 0)) throw new Error("Enter an amount.");
  const kp = await ensureProjectSigner(role);
  if (!kp) throw new Error("Unlock the project wallet to sign.");
  const { buildTransfer } = await import("./trading");
  const tx = await buildTransfer(kp.publicKey.toBase58(), to, sol);
  return signAndSendProjectTx(role, encodeTx(tx));
}

export function packedNeedsProjectSigner(packed: string, role: ProjectRole): boolean {
  const wallet = projectWallet(role);
  if (!wallet) return false;
  try {
    const tx = parseTx(b64ToBytes(packed));
    if ("instructions" in tx && Array.isArray((tx as Transaction).instructions)) {
      return (tx as Transaction).signatures.some((s) => s.publicKey?.toBase58() === wallet.pubkey);
    }
  } catch {
    /* ignore */
  }
  return true;
}
