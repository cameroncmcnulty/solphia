import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { rpcUrl, HELIUS_API_KEY, SUBSCRIPTION_SOL } from "../config";

let conn: Connection | null = null;

export function connection(): Connection {
  if (!conn) conn = new Connection(rpcUrl(), { commitment: "confirmed" });
  return conn;
}

export function heliusEnabled(): boolean {
  return Boolean(HELIUS_API_KEY);
}

export function subscriptionLamports(): number {
  return Math.round(SUBSCRIPTION_SOL * LAMPORTS_PER_SOL);
}

export async function confirmedSolTransfer(opts: {
  signature: string;
  from: string;
  to: string;
  lamports: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const tx = await connection().getParsedTransaction(opts.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!tx) return { ok: false, error: "Transaction not found yet." };
    if (tx.meta?.err) return { ok: false, error: "Transaction failed on-chain." };
    const keys = tx.transaction.message.accountKeys.map((k) =>
      typeof k === "string" ? k : k.pubkey.toBase58(),
    );
    if (!keys.includes(opts.from) || !keys.includes(opts.to)) {
      return { ok: false, error: "Accounts do not match the subscription transfer." };
    }
    const instructions = tx.transaction.message.instructions;
    const ok = instructions.some((ix) => {
      if (!("parsed" in ix)) return false;
      const parsed = ix.parsed as { type?: string; info?: { source?: string; destination?: string; lamports?: number } };
      return (
        parsed.type === "transfer" &&
        parsed.info?.source === opts.from &&
        parsed.info?.destination === opts.to &&
        Number(parsed.info?.lamports) >= opts.lamports
      );
    });
    return ok ? { ok: true } : { ok: false, error: "No matching SOL transfer instruction." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "rpc error" };
  }
}

export function isPubkey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
