import { treasuryAddress } from "../treasury";
import { treasuryKeypair } from "../treasury/withdraw";
import { signSendAndConfirm } from "../tx/send";
import { isSolanaAddress } from "../security";
import { dbcEnabled } from "./dbcIds";

/**
 * Server-sign partner (protocol) claims one pool at a time.
 * Lands the partner cut in treasury. Owner 50% of that is credited unclaimed for the admin claim button.
 * Never packs mints — Blowfish is not in play here, but one-ix-per-tx stays the rule.
 */
export async function sweepPartnerFees(opts?: {
  mints?: string[];
  limit?: number;
}): Promise<{ claimed: number; sol: number; signatures: string[] }> {
  const empty = { claimed: 0, sol: 0, signatures: [] as string[] };
  if (!dbcEnabled()) return empty;
  const kp = treasuryKeypair();
  if (!kp) return empty;
  const owner = kp.publicKey.toBase58();
  if (owner !== treasuryAddress()) return empty;
  const { buildDbcClaimPartnerBatch } = await import("./dbc");
  const limit = Math.max(1, Math.min(Number(opts?.limit) || 3, 6));
  let queue = (opts?.mints || []).map((m) => String(m || "").trim()).filter((m) => isSolanaAddress(m));
  const signatures: string[] = [];
  let sol = 0;
  let claimed = 0;
  for (let i = 0; i < limit; i++) {
    const built = await buildDbcClaimPartnerBatch({ owner, mints: queue });
    if (!built.ok) break;
    const sent = await signSendAndConfirm(kp, built.transaction);
    if (!sent.ok) break;
    claimed += 1;
    sol += built.claimSol;
    signatures.push(sent.signature);
    queue = built.remainingMints;
    if (!queue.length && i === 0 && !(opts?.mints || []).length) {
      queue = built.remainingMints;
    }
    if (!built.remaining) break;
  }
  return { claimed, sol, signatures };
}
