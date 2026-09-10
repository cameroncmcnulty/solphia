import fs from "fs";
import path from "path";
import { Keypair } from "@solana/web3.js";
import { durableConfigured, KEYS, kvDel, kvGetJson, kvSetJson } from "../persist";
import { decryptBytes, encryptBytes, secretFromB64, signerConfigured } from "./crypto";

export { signerConfigured };

export type SignerRecord = {
  v: 1;
  pubkey: string;
  iv: string;
  tag: string;
  ct: string;
  at: number;
};

function localDir() {
  const root = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/solphia" : path.join(process.cwd(), "data"));
  return path.join(root, "signers");
}

function localPath(owner: string) {
  return path.join(localDir(), `${owner}.json`);
}

async function readRecord(owner: string): Promise<SignerRecord | null> {
  if (durableConfigured()) {
    const raw = await kvGetJson(KEYS.signer(owner));
    if (raw && typeof raw === "object") return raw as SignerRecord;
    return null;
  }
  try {
    const p = localPath(owner);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as SignerRecord;
  } catch {
    return null;
  }
}

async function writeRecord(owner: string, rec: SignerRecord): Promise<boolean> {
  if (durableConfigured()) return kvSetJson(KEYS.signer(owner), rec);
  fs.mkdirSync(localDir(), { recursive: true });
  fs.writeFileSync(localPath(owner), JSON.stringify(rec));
  return true;
}

export async function saveDelegatedSigner(owner: string, secretB64: string): Promise<{ pubkey: string }> {
  if (!signerConfigured()) throw new Error("Server is missing LIVE_SIGNER_SECRET (or ADMIN_SECRET).");
  const secret = secretFromB64(secretB64);
  const kp = Keypair.fromSecretKey(secret);
  const blob = encryptBytes(secret);
  const rec: SignerRecord = {
    v: 1,
    pubkey: kp.publicKey.toBase58(),
    iv: blob.iv,
    tag: blob.tag,
    ct: blob.ct,
    at: Date.now(),
  };
  const ok = await writeRecord(owner, rec);
  if (!ok) throw new Error("Could not store the encrypted trading key.");
  return { pubkey: rec.pubkey };
}

export async function loadDelegatedKeypair(owner: string): Promise<Keypair | null> {
  if (!signerConfigured()) return null;
  const rec = await readRecord(owner);
  if (!rec) return null;
  try {
    const secret = decryptBytes({ v: 1, iv: rec.iv, tag: rec.tag, ct: rec.ct });
    if (secret.length !== 64) return null;
    const kp = Keypair.fromSecretKey(secret);
    if (kp.publicKey.toBase58() !== rec.pubkey) return null;
    return kp;
  } catch {
    return null;
  }
}

export async function revokeDelegatedSigner(owner: string): Promise<void> {
  if (durableConfigured()) {
    await kvDel(KEYS.signer(owner));
    return;
  }
  try {
    fs.unlinkSync(localPath(owner));
  } catch {
    /* missing is fine */
  }
}

export async function delegatedStatus(owner: string): Promise<{ delegated: boolean; pubkey: string | null; at: number | null }> {
  const rec = await readRecord(owner);
  if (!rec?.pubkey) return { delegated: false, pubkey: null, at: null };
  return { delegated: true, pubkey: rec.pubkey, at: rec.at || null };
}
