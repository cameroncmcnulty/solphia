import fs from "fs";
import path from "path";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { Keypair } from "@solana/web3.js";
import { ADMIN_SECRET } from "../config";
import { DEFAULT_FUND } from "../protocolWallets";
import { durableConfigured, kvGetJson, kvSetJson, KEYS } from "../persist";
import { loadState } from "../store";
import { ownerAddress } from "../ownerWallet";
import { treasuryAddress } from "../treasury";

export type ProjectSignRole = "treasury" | "owner" | "foundation";

const ENV: Record<ProjectSignRole, string[]> = {
  treasury: ["PROJECT_TREASURY_SECRET", "TREASURY_SECRET"],
  owner: ["PROJECT_OWNER_SECRET", "OWNER_SECRET"],
  foundation: ["PROJECT_FOUNDATION_SECRET", "FOUNDATION_SECRET"],
};

const ROLES: ProjectSignRole[] = ["treasury", "owner", "foundation"];
const FILE = path.join(process.cwd(), "data", "project-keys.json");

type Blob = { v: 1; iv: string; tag: string; ct: string };
type Packed = Partial<Record<ProjectSignRole, Blob>>;

function wrapKey(): Buffer {
  return createHash("sha256").update(`solphia-project-keys:${ADMIN_SECRET || "off"}`).digest();
}

function seal(plain: Uint8Array): Blob {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", wrapKey(), iv);
  const ct = Buffer.concat([c.update(Buffer.from(plain)), c.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), ct: ct.toString("base64") };
}

function unseal(blob: Blob): Uint8Array {
  const d = createDecipheriv("aes-256-gcm", wrapKey(), Buffer.from(blob.iv, "base64"));
  d.setAuthTag(Buffer.from(blob.tag, "base64"));
  return new Uint8Array(Buffer.concat([d.update(Buffer.from(blob.ct, "base64")), d.final()]));
}

function parseSecret(raw: string): Keypair | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    if (t.startsWith("[")) {
      const arr = JSON.parse(t) as unknown;
      if (!Array.isArray(arr) || (arr.length !== 32 && arr.length !== 64)) return null;
      const bytes = Uint8Array.from(arr.map((n) => Number(n)));
      return bytes.length === 32 ? Keypair.fromSeed(bytes) : Keypair.fromSecretKey(bytes);
    }
    const buf = Buffer.from(t, "base64");
    if (buf.length === 32) return Keypair.fromSeed(new Uint8Array(buf));
    if (buf.length === 64) return Keypair.fromSecretKey(new Uint8Array(buf));
  } catch {
    return null;
  }
  return null;
}

function fromFile(role: ProjectSignRole): Keypair | null {
  const p = path.join(process.cwd(), "programs", "solphia-pad", "keys", `project-${role}.json`);
  try {
    if (!fs.existsSync(p)) return null;
    return parseSecret(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function fromEnv(role: ProjectSignRole): Keypair | null {
  for (const name of ENV[role]) {
    const kp = parseSecret(process.env[name] || "");
    if (kp) return kp;
  }
  return null;
}

export function projectExpectedPk(role: ProjectSignRole): string {
  if (role === "treasury") return treasuryAddress();
  if (role === "owner") return ownerAddress();
  try {
    const w = (loadState().foundationWallet || "").trim();
    if (w) return w;
  } catch {
    /* empty */
  }
  return DEFAULT_FUND;
}

export function projectServerKeypair(role: ProjectSignRole): Keypair | null {
  const want = projectExpectedPk(role);
  if (!want) return null;
  const cands = [fromEnv(role), fromFile(role)].filter(Boolean) as Keypair[];
  return cands.find((kp) => kp.publicKey.toBase58() === want) || null;
}

let durable: Partial<Record<ProjectSignRole, Keypair | null>> | null = null;

async function loadDurable(): Promise<void> {
  if (durable) return;
  durable = {};
  let packed: Packed | null = null;
  try {
    if (durableConfigured()) packed = (await kvGetJson(KEYS.projectKeys)) as Packed | null;
    else if (fs.existsSync(FILE)) packed = JSON.parse(fs.readFileSync(FILE, "utf8")) as Packed;
  } catch {
    packed = null;
  }
  if (!packed || typeof packed !== "object") return;
  for (const role of ROLES) {
    const blob = packed[role];
    if (!blob?.ct) continue;
    try {
      const kp = Keypair.fromSecretKey(unseal(blob));
      if (kp.publicKey.toBase58() === projectExpectedPk(role)) durable[role] = kp;
    } catch {
      durable[role] = null;
    }
  }
}

export async function loadProjectServerKeypair(role: ProjectSignRole): Promise<Keypair | null> {
  const live = projectServerKeypair(role);
  if (live) return live;
  await loadDurable();
  return durable?.[role] || null;
}

export async function projectServerReady(): Promise<Record<ProjectSignRole, boolean>> {
  const [treasury, owner, foundation] = await Promise.all([
    loadProjectServerKeypair("treasury"),
    loadProjectServerKeypair("owner"),
    loadProjectServerKeypair("foundation"),
  ]);
  return { treasury: Boolean(treasury), owner: Boolean(owner), foundation: Boolean(foundation) };
}

export async function saveProjectSecrets(raw: Partial<Record<ProjectSignRole, string>>): Promise<
  { ok: true; ready: Record<ProjectSignRole, boolean> } | { ok: false; error: string }
> {
  const packed: Packed = {};
  const next: Partial<Record<ProjectSignRole, Keypair | null>> = { ...(durable || {}) };
  for (const role of ROLES) {
    const text = (raw[role] || "").trim();
    if (!text) continue;
    const kp = parseSecret(text);
    if (!kp) return { ok: false, error: `Could not read the ${role} key.` };
    if (kp.publicKey.toBase58() !== projectExpectedPk(role)) {
      return { ok: false, error: `The ${role} key does not match the saved project wallet.` };
    }
    packed[role] = seal(kp.secretKey);
    next[role] = kp;
  }
  if (!Object.keys(packed).length) return { ok: false, error: "No project keys in the body." };
  let existing: Packed = {};
  try {
    if (durableConfigured()) existing = ((await kvGetJson(KEYS.projectKeys)) as Packed) || {};
    else if (fs.existsSync(FILE)) existing = JSON.parse(fs.readFileSync(FILE, "utf8")) as Packed;
  } catch {
    existing = {};
  }
  const merged = { ...existing, ...packed };
  if (durableConfigured()) await kvSetJson(KEYS.projectKeys, merged);
  else {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(merged));
  }
  durable = { ...(durable || {}), ...next };
  return { ok: true, ready: await projectServerReady() };
}
