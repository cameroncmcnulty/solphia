"use client";

import { Keypair, Transaction } from "@solana/web3.js";
import { isSolanaAddress } from "./addr";
import { encodeTx } from "../token/mint";
import { b64ToBytes, bytesToB64 } from "../solana/wire";
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
export const PROJECT_PIN = "1113";

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
    blurb: "Seats, 25% of curve fees, 50% of widget open-market / boosts / pins, and the 4.6% $SPHA allocation minted at launch. Claim pad partner fees with this wallet.",
    stateKey: "treasuryWallet",
  },
  {
    id: "owner",
    label: "Owner",
    kicker: "OWNER · OUT",
    blurb: "25% of curve fees (12.5% if referred) and 50% of widget open-market / boosts / pins. Signs the $SPHA launch and mints the 8.6% team slice at T0.",
    stateKey: "ownerWallet",
  },
  {
    id: "foundation",
    label: "Solphia Foundation",
    kicker: "FOUNDATION · $SPHA",
    blurb: "9.7% community / ecosystem / airdrop allocation minted at launch. Not treasury SOL. Not trading keys.",
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

/** Wipes the PIN vault on this browser only. On-chain wallets stay; re-import phrases with PROJECT_PIN. */
export function resetProjectVaultOnThisDevice() {
  lockProjectVault();
  const s = store();
  s?.removeItem(META_KEY);
  s?.removeItem(SECRETS_KEY);
  writeMeta(emptyMeta());
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
  const clean = pin && pinOk(pin.trim()) ? pin.trim() : PROJECT_PIN;
  if (readProjectMeta().pin) {
    try {
      await unlockProjectVault(clean);
    } catch {
      if (clean !== PROJECT_PIN) throw new Error("Unlock project wallets with your PIN first.");
      resetProjectVaultOnThisDevice();
      await setProjectPin(PROJECT_PIN);
    }
  } else {
    await setProjectPin(clean);
  }
  return pinKey;
}

export async function unlockProjectVaultWithDefault(): Promise<boolean> {
  if (projectUnlocked()) return true;
  if (!projectHasPin()) {
    await setProjectPin(PROJECT_PIN);
    return true;
  }
  try {
    await unlockProjectVault(PROJECT_PIN);
    return true;
  } catch {
    return false;
  }
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

let serverReady: Partial<Record<ProjectRole, boolean>> | null = null;
let serverPub: Partial<Record<ProjectRole, string>> = {};

export async function projectServerReady(): Promise<Record<ProjectRole, boolean>> {
  if (serverReady?.treasury != null && serverReady.owner != null && serverReady.foundation != null) {
    return { treasury: Boolean(serverReady.treasury), owner: Boolean(serverReady.owner), foundation: Boolean(serverReady.foundation) };
  }
  try {
    const r = await fetch("/api/admin/project-sign", { cache: "no-store" });
    const j = (await r.json().catch(() => ({}))) as {
      ready?: Partial<Record<ProjectRole, boolean>>;
      pubkeys?: Partial<Record<ProjectRole, string>>;
    };
    serverReady = {
      treasury: Boolean(j.ready?.treasury),
      owner: Boolean(j.ready?.owner),
      foundation: Boolean(j.ready?.foundation),
    };
    serverPub = j.pubkeys || {};
  } catch {
    serverReady = { treasury: false, owner: false, foundation: false };
  }
  return {
    treasury: Boolean(serverReady.treasury),
    owner: Boolean(serverReady.owner),
    foundation: Boolean(serverReady.foundation),
  };
}

export async function canSignProject(role: ProjectRole): Promise<boolean> {
  if (projectKeypair(role)) return true;
  await unlockProjectVaultWithDefault();
  if (projectKeypair(role)) return true;
  const ready = await projectServerReady();
  return Boolean(ready[role]);
}

export async function ensureProjectSigner(role: ProjectRole): Promise<Keypair | null> {
  const have = projectKeypair(role);
  if (have) return have;
  if (await unlockProjectVaultWithDefault()) {
    const ready = projectKeypair(role);
    if (ready) return ready;
  }
  if (await canSignProject(role)) return projectKeypair(role);
  const ok = await requestProjectUnlock();
  if (!ok) return null;
  return projectKeypair(role);
}

async function signOnServer(role: ProjectRole, packed: string, extra?: Keypair[]): Promise<string> {
  const extraSecrets = (extra || []).map((k) => bytesToB64(k.secretKey));
  const r = await fetch("/api/admin/project-sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role, transaction: packed, extraSecrets }),
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string; signature?: string };
  if (!r.ok || !j.signature) throw new Error(j.message || j.error || "Unlock the project wallet to sign.");
  return j.signature;
}

export async function signAndSendProjectTx(role: ProjectRole, packed: string, extra?: Keypair[]): Promise<string> {
  if (!projectKeypair(role)) await unlockProjectVaultWithDefault();
  const kp = projectKeypair(role);
  if (kp) {
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
  return signOnServer(role, packed, extra);
}

export async function sendProjectSol(role: ProjectRole, to: string, sol: number): Promise<string> {
  if (!isSolanaAddress(to)) throw new Error("That is not a valid Solana address.");
  if (!(sol > 0)) throw new Error("Enter an amount.");
  const local = projectKeypair(role);
  if (!serverPub[role]) await projectServerReady();
  const from = local?.publicKey.toBase58() || projectWallet(role)?.pubkey || serverPub[role] || "";
  if (!isSolanaAddress(from)) throw new Error("Create or import this project wallet first.");
  const { buildTransfer } = await import("./trading");
  const tx = await buildTransfer(from, to, sol);
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
