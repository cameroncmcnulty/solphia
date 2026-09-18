/**
 * In-house send + confirm. Every server-signed Solana tx should land through here
 * so pad, desk, seats, and payouts share one confirmation path.
 */
import { Connection, Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import { connection } from "../solana/connection";

export type SendOk = { ok: true; signature: string };
export type SendErr = { ok: false; error: string; signature?: string };
export type SendResult = SendOk | SendErr;

export async function confirmSig(conn: Connection, signature: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const latest = await conn.getLatestBlockhash("confirmed");
  const conf = await conn.confirmTransaction({ signature, ...latest }, "confirmed");
  if (conf.value.err) return { ok: false, error: "Transaction landed but failed on Solana." };
  return { ok: true };
}

export async function sendRawAndConfirm(
  raw: Buffer | Uint8Array,
  opts?: { maxRetries?: number; conn?: Connection },
): Promise<SendResult> {
  const conn = opts?.conn || connection();
  try {
    const sig = await conn.sendRawTransaction(raw, {
      skipPreflight: false,
      maxRetries: opts?.maxRetries ?? 4,
    });
    const conf = await confirmSig(conn, sig);
    if (!conf.ok) return { ok: false, error: conf.error, signature: sig };
    return { ok: true, signature: sig };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

export function signSerialized(kp: Keypair, b64: string): Uint8Array {
  const raw = Buffer.from(b64, "base64");
  try {
    const tx = VersionedTransaction.deserialize(raw);
    tx.sign([kp]);
    return tx.serialize();
  } catch {
    const tx = Transaction.from(raw);
    tx.partialSign(kp);
    return tx.serialize();
  }
}

export async function signSendAndConfirm(
  kp: Keypair,
  b64: string,
  opts?: { maxRetries?: number; conn?: Connection },
): Promise<SendResult> {
  return sendRawAndConfirm(signSerialized(kp, b64), opts);
}

export async function sendSignedTx(
  tx: Transaction | VersionedTransaction,
  opts?: { maxRetries?: number; conn?: Connection },
): Promise<SendResult> {
  const raw = tx.serialize();
  return sendRawAndConfirm(raw instanceof Uint8Array ? raw : Buffer.from(raw), opts);
}
