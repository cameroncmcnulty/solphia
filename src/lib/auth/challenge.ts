import { signToken, verifyToken } from "@/lib/security";
import { randomBytes } from "crypto";

const secret = process.env.ADMIN_SECRET || "solphia-dev-only";
const CHAL_MS = 10 * 60_000;

export function turnstileSiteKey(): string {
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
}

export function turnstileSecret(): string {
  return (process.env.TURNSTILE_SECRET || "").trim();
}

export function issueChallenge(now = Date.now()): { token: string; prompt: string } {
  const buf = randomBytes(2);
  const a = 2 + (buf[0] % 9);
  const b = 2 + (buf[1] % 9);
  return {
    token: signToken(`chal:${a}:${b}:${now}`, secret),
    prompt: `What is ${a} + ${b}?`,
  };
}

export function verifyMathChallenge(token: string | undefined, answer: string | undefined): boolean {
  if (!token) return false;
  const payload = verifyToken(token, secret);
  if (!payload?.startsWith("chal:")) return false;
  const parts = payload.split(":");
  const a = Number(parts[1]);
  const b = Number(parts[2]);
  const at = Number(parts[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !at) return false;
  if (Date.now() - at > CHAL_MS) return false;
  const n = Number(String(answer || "").trim());
  return n === a + b;
}

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const key = turnstileSecret();
  if (!key) return false;
  const response = (token || "").trim();
  if (!response) return false;
  try {
    const body = new URLSearchParams({ secret: key, response });
    if (ip && ip !== "local") body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const j = (await r.json().catch(() => ({}))) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}

export type BotProof = {
  website?: string;
  challengeToken?: string;
  challengeAnswer?: string;
  turnstile?: string;
};

export async function verifyBot(proof: BotProof, ip?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if ((proof.website || "").trim()) return { ok: false, error: "Could not verify this request." };
  if (turnstileSecret()) {
    const ok = await verifyTurnstile(proof.turnstile, ip);
    if (!ok) return { ok: false, error: "Complete the bot check." };
    return { ok: true };
  }
  if (!verifyMathChallenge(proof.challengeToken, proof.challengeAnswer)) {
    return { ok: false, error: "Solve the bot check." };
  }
  return { ok: true };
}
