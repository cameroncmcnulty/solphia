import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { LIVE_SIGNER_SECRET } from "../config";

export type EncryptedBlob = {
  v: 1;
  iv: string;
  tag: string;
  ct: string;
};

export function signerConfigured(): boolean {
  return Boolean(LIVE_SIGNER_SECRET);
}

export function signerKey(secret = LIVE_SIGNER_SECRET): Buffer {
  const s = (secret || "").trim();
  if (!s) throw new Error("no_signer_secret");
  return createHash("sha256").update(`solphia-live-signer:${s}`).digest();
}

export function encryptBytes(plain: Uint8Array, key = signerKey()): EncryptedBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plain)), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: ct.toString("base64"),
  };
}

export function decryptBytes(blob: EncryptedBlob, key = signerKey()): Uint8Array {
  if (blob.v !== 1 || !blob.iv || !blob.tag || !blob.ct) throw new Error("bad_blob");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(blob.ct, "base64")), decipher.final()]);
  return new Uint8Array(plain);
}

/** Same encoding as the on-device `exportSecret()` backup. */
export function secretFromB64(b64: string): Uint8Array {
  const buf = Buffer.from(b64.trim(), "base64");
  if (buf.length !== 64) throw new Error("Backup is not a 64-byte trading key.");
  return new Uint8Array(buf);
}
