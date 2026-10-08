import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";
import { digitsOtp, otpLooksRight } from "./otp";

const STEP_MS = 30_000;
const DIGITS = 6;
const WINDOW = 1;
const BACKUP_N = 8;
const BACKUP_ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const TOTP_ISSUER = "Solphia";

export type TotpSlot = {
  totpSecret?: string;
  totpEnabledAt?: number;
  totpBackupHashes?: string[];
  totpPendingSecret?: string;
  totpPendingBackupHashes?: string[];
  totpLastCounter?: number;
};

function wrapKey(): Buffer {
  return createHash("sha256")
    .update(`solphia-totp:${process.env.ADMIN_SECRET || "solphia-dev-only"}`)
    .digest();
}

function hmacKey(): string {
  return process.env.ADMIN_SECRET || "solphia-dev-only";
}

export function encodeBase32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function decodeBase32(raw: string): Buffer {
  const s = (raw || "").toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of s) {
    const n = B32.indexOf(ch);
    if (n < 0) continue;
    value = (value << 5) | n;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function totpCounter(at = Date.now()): number {
  return Math.floor(at / STEP_MS);
}

export function totpCodeAt(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function totpCode(secret: string, at = Date.now()): string {
  return totpCodeAt(secret, totpCounter(at));
}

export function totpMatch(secret: string, code: string, at = Date.now()): { ok: true; counter: number } | { ok: false } {
  const want = digitsOtp(code);
  if (!otpLooksRight(want) || !secret) return { ok: false };
  const center = totpCounter(at);
  for (let i = -WINDOW; i <= WINDOW; i++) {
    const counter = center + i;
    const got = totpCodeAt(secret, counter);
    const a = Buffer.from(got);
    const b = Buffer.from(want);
    if (a.length === b.length && timingSafeEqual(a, b)) return { ok: true, counter };
  }
  return { ok: false };
}

export function totpAuthUrl(opts: { label: string; secret: string; issuer?: string }): string {
  const issuer = opts.issuer || TOTP_ISSUER;
  const label = encodeURIComponent(`${issuer}:${opts.label}`);
  const q = new URLSearchParams({
    secret: opts.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: "30",
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}

export function makeBackupCodes(n = BACKUP_N): string[] {
  const out: string[] = [];
  while (out.length < n) {
    const raw = randomBytes(8);
    let s = "";
    for (const b of raw) s += BACKUP_ALPH[b % BACKUP_ALPH.length];
    const code = `${s.slice(0, 4)}-${s.slice(4, 8)}`;
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

export function normalizeBackup(code: string): string {
  return (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashBackupCode(code: string): string {
  return createHmac("sha256", hmacKey()).update(normalizeBackup(code)).digest("hex");
}

export function backupIndex(hashes: string[] | undefined, code: string): number {
  const want = hashBackupCode(code);
  const a = Buffer.from(want);
  const rows = hashes || [];
  for (let i = 0; i < rows.length; i++) {
    const b = Buffer.from(rows[i] || "");
    if (a.length === b.length && timingSafeEqual(a, b)) return i;
  }
  return -1;
}

export function sealTotpSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", wrapKey(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1$${iv.toString("base64url")}$${c.getAuthTag().toString("base64url")}$${enc.toString("base64url")}`;
}

export function unsealTotpSecret(stored: string): string {
  const parts = (stored || "").split("$");
  if (parts.length === 1 && /^[A-Z2-7]+$/.test(stored)) return stored;
  if (parts[0] !== "v1" || parts.length !== 4) throw new Error("bad_totp_secret");
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const enc = Buffer.from(parts[3], "base64url");
  const d = createDecipheriv("aes-256-gcm", wrapKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

export function totpEnabled(slot: TotpSlot | null | undefined): boolean {
  return Boolean(slot?.totpEnabledAt && slot.totpSecret);
}

export function beginTotp(slot: TotpSlot, label: string): { secret: string; otpauth: string; backupCodes: string[] } {
  const secret = generateTotpSecret();
  const backupCodes = makeBackupCodes();
  slot.totpPendingSecret = sealTotpSecret(secret);
  slot.totpPendingBackupHashes = backupCodes.map(hashBackupCode);
  return { secret, otpauth: totpAuthUrl({ label, secret }), backupCodes };
}

export function confirmTotp(slot: TotpSlot, code: string, at = Date.now()): { ok: true } | { ok: false; error: string } {
  if (!slot.totpPendingSecret) return { ok: false, error: "Start authenticator setup first." };
  let secret = "";
  try {
    secret = unsealTotpSecret(slot.totpPendingSecret);
  } catch {
    return { ok: false, error: "Start authenticator setup first." };
  }
  const hit = totpMatch(secret, code, at);
  if (!hit.ok) return { ok: false, error: "That authenticator code is wrong." };
  slot.totpSecret = slot.totpPendingSecret;
  slot.totpBackupHashes = slot.totpPendingBackupHashes || [];
  slot.totpEnabledAt = at;
  slot.totpLastCounter = hit.counter;
  delete slot.totpPendingSecret;
  delete slot.totpPendingBackupHashes;
  return { ok: true };
}

export function verifyTotp(
  slot: TotpSlot,
  code: string,
  at = Date.now(),
): { ok: true; via: "totp" | "backup" } | { ok: false; error: string } {
  if (!totpEnabled(slot) || !slot.totpSecret) return { ok: false, error: "Authenticator is not on." };
  const trimmed = (code || "").trim();
  if (otpLooksRight(digitsOtp(trimmed))) {
    let secret = "";
    try {
      secret = unsealTotpSecret(slot.totpSecret);
    } catch {
      return { ok: false, error: "Authenticator is not on." };
    }
    const hit = totpMatch(secret, trimmed, at);
    if (!hit.ok) return { ok: false, error: "That authenticator code is wrong." };
    if (slot.totpLastCounter != null && hit.counter <= slot.totpLastCounter) {
      return { ok: false, error: "That code was already used. Wait for the next one." };
    }
    slot.totpLastCounter = hit.counter;
    return { ok: true, via: "totp" };
  }
  const i = backupIndex(slot.totpBackupHashes, trimmed);
  if (i < 0) return { ok: false, error: "That authenticator or backup code is wrong." };
  slot.totpBackupHashes = (slot.totpBackupHashes || []).filter((_, n) => n !== i);
  return { ok: true, via: "backup" };
}

export function disableTotp(slot: TotpSlot, code: string, at = Date.now()): { ok: true } | { ok: false; error: string } {
  const hit = verifyTotp(slot, code, at);
  if (!hit.ok) return hit;
  delete slot.totpSecret;
  delete slot.totpEnabledAt;
  delete slot.totpBackupHashes;
  delete slot.totpPendingSecret;
  delete slot.totpPendingBackupHashes;
  delete slot.totpLastCounter;
  return { ok: true };
}

export function rotateBackupCodes(slot: TotpSlot, code: string, at = Date.now()): { ok: true; backupCodes: string[] } | { ok: false; error: string } {
  const hit = verifyTotp(slot, code, at);
  if (!hit.ok) return hit;
  const backupCodes = makeBackupCodes();
  slot.totpBackupHashes = backupCodes.map(hashBackupCode);
  return { ok: true, backupCodes };
}

export function backupLeft(slot: TotpSlot | null | undefined): number {
  return (slot?.totpBackupHashes || []).length;
}
