import { Keypair } from "@solana/web3.js";
import { treasuryAddress } from "../treasury";
export {
  TREASURY_KEEP_LAMPORTS,
  TREASURY_MIN_SEND_LAMPORTS,
  planTreasuryWithdraw,
  type WithdrawKind,
  type WithdrawPlan,
} from "./plan";

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
