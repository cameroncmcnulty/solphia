import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SECRET, CRON_SECRET } from "../config";
import { isSolanaAddress, randomNonce, signToken, verifyToken } from "../security";

export const SHILL_DEV_COOKIE = "solphia_shill_dev";
export const SHILL_OK_COOKIE = "solphia_shill_ok";
export const SHILL_IP_WALLET_MAX = 3;
export const SHILL_DEVICE_WALLET_MAX = 3;
export const SHILL_WALLET_WINDOW_MS = 6 * 3600_000;
export const SHILL_OK_MS = 2 * 3600_000;

type Hit = { pk: string; at: number };
const buckets = new Map<string, Hit[]>();

function secret() {
  return ADMIN_SECRET || CRON_SECRET || "solphia.shill.ok";
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function prune(key: string, now: number, windowMs: number): Hit[] {
  const hits = (buckets.get(key) || []).filter((h) => now - h.at < windowMs);
  buckets.set(key, hits);
  return hits;
}

/** Same wallet can return. A 4th new wallet from this IP or device is blocked. Never call this from house ticks. */
export function shillWalletAllowed(
  ip: string,
  device: string,
  pubkey: string,
  now = Date.now(),
): { ok: true } | { ok: false; error: "wallet_flood"; message: string } {
  if (!isSolanaAddress(pubkey)) return { ok: true };
  const fail = {
    ok: false as const,
    error: "wallet_flood" as const,
    message: "Too many wallets from this connection. Keep using the one you already shill with.",
  };
  const check = (key: string, max: number) => {
    const hits = prune(key, now, SHILL_WALLET_WINDOW_MS);
    if (hits.some((h) => h.pk === pubkey)) {
      const i = hits.findIndex((h) => h.pk === pubkey);
      hits[i] = { pk: pubkey, at: now };
      buckets.set(key, hits);
      return true;
    }
    const distinct = new Set(hits.map((h) => h.pk));
    if (distinct.size >= max) return false;
    hits.push({ pk: pubkey, at: now });
    buckets.set(key, hits);
    return true;
  };
  if (ip && ip !== "local" && !check(`ip:${ip}`, SHILL_IP_WALLET_MAX)) return fail;
  if (device && !check(`dev:${device}`, SHILL_DEVICE_WALLET_MAX)) return fail;
  return { ok: true };
}

export function readShillDevice(req: NextRequest): string {
  const cur = (req.cookies.get(SHILL_DEV_COOKIE)?.value || "").trim();
  if (cur.length >= 16 && cur.length <= 80) return cur;
  return "";
}

export function stampShillDevice(req: NextRequest, res: NextResponse): string {
  let id = readShillDevice(req);
  if (!id) id = randomNonce();
  res.cookies.set(SHILL_DEV_COOKIE, id, { ...cookieBase(), maxAge: 60 * 60 * 24 * 400 });
  return id;
}

export function issueShillOk(ip: string, now = Date.now()): string {
  return signToken(`shillok\t${ip}\t${now + SHILL_OK_MS}`, secret());
}

export function shillHumanOk(req: NextRequest, ip: string, now = Date.now()): boolean {
  const tok = (req.cookies.get(SHILL_OK_COOKIE)?.value || "").trim();
  if (!tok) return false;
  const raw = verifyToken(tok, secret());
  if (!raw) return false;
  const [kind, boundIp, exp] = raw.split("\t");
  if (kind !== "shillok") return false;
  if (boundIp && boundIp !== "local" && ip && ip !== "local" && boundIp !== ip) return false;
  const until = Number(exp) || 0;
  return until > now;
}

export function stampShillOk(req: NextRequest, res: NextResponse, ip: string, now = Date.now()) {
  stampShillDevice(req, res);
  res.cookies.set(SHILL_OK_COOKIE, issueShillOk(ip, now), { ...cookieBase(), maxAge: Math.floor(SHILL_OK_MS / 1000) });
}

export function shillJson(req: NextRequest, body: unknown, status = 200): NextResponse {
  const res = NextResponse.json(body, { status });
  stampShillDevice(req, res);
  return res;
}
