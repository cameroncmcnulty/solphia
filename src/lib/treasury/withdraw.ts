import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { treasuryAddress } from "../treasury";

/** Leave enough for rent + a couple of fees so the treasury account stays open. */
export const TREASURY_KEEP_LAMPORTS = 2_000_000;
export const TREASURY_MIN_SEND_LAMPORTS = 1_000_000;

export type WithdrawKind = "pct" | "sol";

export type WithdrawPlan =
  | { ok: true; lamports: number; sol: number; remainingLamports: number; remainingSol: number }
  | { ok: false; error: "empty" | "dust" | "bad_value" };

export function planTreasuryWithdraw(balanceLamports: number, kind: WithdrawKind, value: number): WithdrawPlan {
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "bad_value" };
  const spendable = Math.max(0, Math.floor(balanceLamports) - TREASURY_KEEP_LAMPORTS);
  if (spendable < TREASURY_MIN_SEND_LAMPORTS) return { ok: false, error: "empty" };
  let lamports = 0;
  if (kind === "pct") {
    const pct = Math.min(100, value);
    lamports = Math.floor((spendable * pct) / 100);
  } else {
    lamports = Math.round(value * LAMPORTS_PER_SOL);
  }
  if (lamports > spendable) lamports = spendable;
  if (lamports < TREASURY_MIN_SEND_LAMPORTS) return { ok: false, error: "dust" };
  const remainingLamports = Math.floor(balanceLamports) - lamports;
  return {
    ok: true,
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
    remainingLamports,
    remainingSol: remainingLamports / LAMPORTS_PER_SOL,
  };
}

/** Optional hot key. JSON byte array or base64 of the 64-byte secret. Never log this. */
export function treasuryKeypair(): Keypair | null {
  const raw = (process.env.TREASURY_SECRET || "").trim();
  if (!raw) return null;
  try {
    let bytes: Uint8Array | null = null;
    if (raw.startsWith("[")) {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr) && (arr.length === 64 || arr.length === 32)) {
        bytes = Uint8Array.from(arr.map((n) => Number(n)));
      }
    } else {
      const buf = Buffer.from(raw, "base64");
      if (buf.length === 64 || buf.length === 32) bytes = new Uint8Array(buf);
    }
    if (!bytes) return null;
    const kp = Keypair.fromSecretKey(bytes);
    if (kp.publicKey.toBase58() !== treasuryAddress()) return null;
    return kp;
  } catch {
    return null;
  }
}

export function treasuryHot(): boolean {
  return Boolean(treasuryKeypair());
}
