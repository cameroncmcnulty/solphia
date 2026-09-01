import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

const buckets = new Map<string, number[]>();

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function sanitizeText(input: string, max = 280): string {
  return input.replace(/[<>\u0000-\u001F]/g, "").trim().slice(0, max);
}

export function isSolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length < 120;
}

export function signToken(payload: string, secret: string): string {
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string, secret: string): string | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function randomNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function neverCustody(): void {
  // Solphia never asks for, stores, or transmits a private key or seed phrase.
}

export function assertNoSecretLeak(obj: unknown): void {
  const text = JSON.stringify(obj).toLowerCase();
  const banned = ["privatekey", "private_key", "secretkey", "seed phrase", "mnemonic", "begin private"];
  for (const word of banned) {
    if (text.includes(word)) {
      throw new Error("Refusing to serialize a custody-sensitive field.");
    }
  }
}
