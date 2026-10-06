import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { isSolanaAddress } from "../security";
import { connection } from "../solana/connection";
import type { AdminPlatformOnchain } from "./types";

const CACHE_MS = 60_000;
const USER_CAP = 80;

let cache: { at: number; value: AdminPlatformOnchain } | null = null;

async function sumLamports(pks: string[]): Promise<{ sol: number; sampled: number }> {
  const uniq = [...new Set(pks.filter((p) => isSolanaAddress(p)))];
  if (!uniq.length) return { sol: 0, sampled: 0 };
  const conn = connection();
  let lamports = 0;
  for (let i = 0; i < uniq.length; i += 100) {
    const chunk = uniq.slice(i, i + 100);
    const infos = await conn.getMultipleAccountsInfo(
      chunk.map((p) => new PublicKey(p)),
      "confirmed",
    );
    for (const info of infos) lamports += info?.lamports || 0;
  }
  return { sol: lamports / LAMPORTS_PER_SOL, sampled: uniq.length };
}

export async function loadPlatformOnchain(
  users: string[],
  protocol: string[],
): Promise<AdminPlatformOnchain> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const userSlice = [...new Set(users.filter((p) => isSolanaAddress(p)))].slice(0, USER_CAP);
  const proto = [...new Set(protocol.filter((p) => isSolanaAddress(p)))];
  const [user, protoBal] = await Promise.all([sumLamports(userSlice), sumLamports(proto)]);
  const value: AdminPlatformOnchain = {
    userSol: user.sol,
    protocolSol: protoBal.sol,
    sampled: user.sampled,
  };
  cache = { at: Date.now(), value };
  return value;
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
