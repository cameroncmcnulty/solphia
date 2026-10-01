import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { connection } from "./connection";

export function swapSimReason(err: unknown, logs?: string[] | null): string {
  const blob = `${typeof err === "string" ? err : JSON.stringify(err)} ${(logs || []).join(" ")}`;
  if (/0x1788|InsufficientFunds|insufficient funds/i.test(blob)) {
    return "Not enough of that token in this wallet. Try a smaller amount.";
  }
  if (/0x1771|SlippageToleranceExceeded|0x1773|ExactOutAmountNotMatched/i.test(blob)) {
    return "Price moved. Try again.";
  }
  if (/custom program error: 0x1\b|insufficient lamports/i.test(blob)) {
    return "Not enough SOL left for fees. Keep a little SOL in Phantom.";
  }
  return "This swap would fail on-chain. It was not sent to Phantom.";
}

/** Blowfish flags a failing sim as malicious. Never hand Phantom a tx that already fails. */
export async function simulateUnsignedB64(b64: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const raw = Buffer.from(b64, "base64");
    let vtx: VersionedTransaction;
    try {
      vtx = VersionedTransaction.deserialize(raw);
    } catch {
      vtx = new VersionedTransaction(Transaction.from(raw).compileMessage());
    }
    const sim = await connection().simulateTransaction(vtx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
      innerInstructions: true,
      commitment: "confirmed",
    });
    if (sim.value.err) return { ok: false, reason: swapSimReason(sim.value.err, sim.value.logs) };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Could not simulate the swap." };
  }
}
