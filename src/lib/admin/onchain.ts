import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { KEYS, kvGetJson, kvSetJson } from "../persist";
import { isSolanaAddress } from "../security";
import { connection } from "../solana/connection";
import { lastPairPrices } from "../tick";
import type { AdminPlatformOnchain } from "./types";

const CACHE_MS = 60_000;
const USER_CAP = 400;
const CHUNK = 100;
const SAMPLE_BUDGET_MS = 10_000;

let cache: { at: number; value: AdminPlatformOnchain } | null = null;
let persistWriteAt = 0;

function parseStored(raw: unknown): { at: number; value: AdminPlatformOnchain } | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { at?: unknown; userSol?: unknown; protocolSol?: unknown; sampled?: unknown; solUsd?: unknown };
  const at = Number(row.at) || 0;
  if (!(at > 0)) return null;
  return {
    at,
    value: {
      userSol: Number(row.userSol) || 0,
      protocolSol: Number(row.protocolSol) || 0,
      sampled: Number(row.sampled) || 0,
      solUsd: Number(row.solUsd) || 0,
    },
  };
}

export function peekPlatformOnchain(): AdminPlatformOnchain | null {
  return cache?.value || null;
}

export function rememberPlatformOnchain(value: AdminPlatformOnchain, at = Date.now()) {
  cache = { at, value };
}

async function persistSample(value: AdminPlatformOnchain) {
  cache = { at: Date.now(), value };
  if (Date.now() - persistWriteAt < CACHE_MS) return;
  persistWriteAt = Date.now();
  try {
    await kvSetJson(KEYS.platformOnchain, { at: Date.now(), ...value });
  } catch {
    /* last in-memory sample still holds */
  }
}

/** Load the last durable sample onto this instance. Skip RPC. */
export async function hydratePlatformOnchain(): Promise<AdminPlatformOnchain | null> {
  if (cache) return cache.value;
  try {
    const stored = parseStored(await kvGetJson(KEYS.platformOnchain, 4_000));
    if (stored) {
      cache = stored;
      return stored.value;
    }
  } catch {
    /* RPC sample still runs */
  }
  return null;
}

async function sumLamports(pks: string[], deadline: number): Promise<{ sol: number; sampled: number }> {
  const uniq = [...new Set(pks.filter((p) => isSolanaAddress(p)))];
  if (!uniq.length) return { sol: 0, sampled: 0 };
  const conn = connection();
  let lamports = 0;
  let sampled = 0;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    if (Date.now() >= deadline) break;
    const chunk = uniq.slice(i, i + CHUNK);
    try {
      const infos = await conn.getMultipleAccountsInfo(
        chunk.map((p) => new PublicKey(p)),
        "confirmed",
      );
      for (const info of infos) lamports += info?.lamports || 0;
      sampled += chunk.length;
    } catch {
      break;
    }
  }
  return { sol: lamports / LAMPORTS_PER_SOL, sampled };
}

export async function loadPlatformOnchain(
  users: string[],
  protocol: string[],
): Promise<AdminPlatformOnchain> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const fallback = cache?.value || null;
  const userSlice = [...new Set(users.filter((p) => isSolanaAddress(p)))].slice(0, USER_CAP);
  const proto = [...new Set(protocol.filter((p) => isSolanaAddress(p)))];
  const deadline = Date.now() + SAMPLE_BUDGET_MS;
  try {
    const [user, protoBal] = await Promise.all([sumLamports(userSlice, deadline), sumLamports(proto, deadline)]);
    if (user.sampled + protoBal.sampled === 0 && fallback) return fallback;
    const solUsd = Number(lastPairPrices().solUsd) || Number(fallback?.solUsd) || 0;
    const value: AdminPlatformOnchain = {
      userSol: user.sol,
      protocolSol: protoBal.sol,
      sampled: user.sampled,
      solUsd,
    };
    void persistSample(value);
    return value;
  } catch {
    if (fallback) return fallback;
    throw new Error("platform_onchain");
  }
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch(() => {
      clearTimeout(t);
      resolve(null);
    });
  });
}
