import { Keypair } from "@solana/web3.js";
import { treasuryAddress } from "../treasury";
export {
  TREASURY_KEEP_LAMPORTS,
  TREASURY_MIN_SEND_LAMPORTS,
  planTreasuryWithdraw,
  type WithdrawKind,
  type WithdrawPlan,
} from "./plan";

function keypairFromTreasurySecret(): Keypair | null {
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
    return Keypair.fromSecretKey(bytes);
  } catch {
    return null;
  }
}

/**
 * Optional hot key for the displayed treasury Phantom.
 * Only signs when TREASURY_SECRET's pubkey equals treasuryAddress().
 * Not required: feeClaimer is that Phantom, and partner claims are Phantom-signed.
 * Never log this.
 */
export function treasuryKeypair(): Keypair | null {
  const kp = keypairFromTreasurySecret();
  if (!kp) return null;
  if (kp.publicKey.toBase58() !== treasuryAddress()) return null;
  return kp;
}

/** Same as treasuryKeypair — cron harvest only if the secret is the displayed treasury. */
export function harvestKeypair(): Keypair | null {
  return treasuryKeypair();
}

/** Always the Phantom treasury they set. Never a different harvest wallet. */
export function harvestAddress(): string {
  return treasuryAddress();
}

export function treasuryHot(): boolean {
  return Boolean(treasuryKeypair());
}
