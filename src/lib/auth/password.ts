import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
export { PASSWORD_HINT, passwordIssue, passwordOk, passwordRules } from "./passwordPolicy";

const N = 16384;
const R = 8;
const P = 1;
const DK = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const dk = scryptSync(password, salt, DK, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${dk.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!n || !r || !p) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64url");
    expected = Buffer.from(parts[5], "base64url");
  } catch {
    return false;
  }
  if (!salt.length || !expected.length) return false;
  const dk = scryptSync(password, salt, expected.length, { N: n, r, p });
  if (dk.length !== expected.length) return false;
  return timingSafeEqual(dk, expected);
}
