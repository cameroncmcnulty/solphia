import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { treasuryAddress } from "../treasury";
import { treasuryKeypair } from "../treasury/withdraw";
import { ownerAddress } from "../ownerWallet";
import { signSendAndConfirm, sendSignedTx, type SendResult } from "../tx/send";
import { isSolanaAddress } from "../security";
import { dbcEnabled } from "./dbcIds";
import { evenShare, FEE_DUST_LAMPORTS } from "../fees/payout";
import { creditPartnerClaim } from "../fees/income";
import { emptyLaunchBook } from "./engine";
import { withLaunch } from "../store";
import { connection } from "../solana/connection";
import { encodeTx } from "../token/mint";
import { simulateUnsignedB64 } from "../solana/simulate";

const TREASURY_KEEP_LAMPORTS = 2_000_000;

/**
 * Server-sign partner (protocol) claims one pool at a time.
 * Lands the partner cut in treasury, then sends 50% (owner's 25% of the 1% fee)
 * straight to the owner wallet. No admin Phantom claim.
 */
export async function sweepPartnerFees(opts?: {
  mints?: string[];
  limit?: number;
}): Promise<{ claimed: number; sol: number; ownerSol: number; signatures: string[] }> {
  const empty = { claimed: 0, sol: 0, ownerSol: 0, signatures: [] as string[] };
  if (!dbcEnabled()) return empty;
  const kp = treasuryKeypair();
  if (!kp) return empty;
  const treas = kp.publicKey.toBase58();
  if (treas !== treasuryAddress()) return empty;
  const { buildDbcClaimPartnerBatch } = await import("./dbc");
  const limit = Math.max(1, Math.min(Number(opts?.limit) || 3, 6));
  let queue = (opts?.mints || []).map((m) => String(m || "").trim()).filter((m) => isSolanaAddress(m));
  const signatures: string[] = [];
  let sol = 0;
  let ownerSol = 0;
  let claimed = 0;
  const ownerPk = ownerAddress();
  for (let i = 0; i < limit; i++) {
    const built = await buildDbcClaimPartnerBatch({ owner: treas, mints: queue });
    if (!built.ok) break;
    const cut = evenShare(built.claimSol);
    const ownerLamports = Math.round(cut.owner * LAMPORTS_PER_SOL);
    const packed = await packClaimWithOwnerCut(built.transaction, treas, ownerPk, ownerLamports);
    const sent = await signSendAndConfirm(kp, packed.transaction);
    if (!sent.ok) break;
    claimed += 1;
    sol += built.claimSol;
    signatures.push(sent.signature);
    if (packed.includedOwner) {
      ownerSol += cut.owner;
    } else if (ownerLamports >= FEE_DUST_LAMPORTS && ownerPk && ownerPk !== treas) {
      const paid = await sendTreasurySol(kp, ownerPk, ownerLamports);
      if (paid.ok) {
        ownerSol += cut.owner;
        signatures.push(paid.signature);
      }
    }
    try {
      await withLaunch((st) => {
        if (!st.launch) st.launch = emptyLaunchBook();
        creditPartnerClaim(st.launch, built.claimSol);
      }, true);
    } catch {
      /* on-chain send still landed */
    }
    queue = built.remainingMints;
    if (!queue.length && i === 0 && !(opts?.mints || []).length) {
      queue = built.remainingMints;
    }
    if (!built.remaining) break;
  }
  return { claimed, sol, ownerSol, signatures };
}

function packClaimWithOwnerCut(
  b64: string,
  from: string,
  to: string,
  lamports: number,
): Promise<{ transaction: string; includedOwner: boolean }> {
  return (async () => {
    if (!(lamports >= FEE_DUST_LAMPORTS) || !isSolanaAddress(to) || to === from) {
      return { transaction: b64, includedOwner: false };
    }
    try {
      const tx = Transaction.from(Buffer.from(b64, "base64"));
      tx.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(from),
          toPubkey: new PublicKey(to),
          lamports,
        }),
      );
      const next = encodeTx(tx);
      const sim = await simulateUnsignedB64(next);
      if (sim.ok) return { transaction: next, includedOwner: true };
    } catch {
      /* fall through to claim-only */
    }
    return { transaction: b64, includedOwner: false };
  })();
}

async function sendTreasurySol(kp: Keypair, to: string, lamports: number): Promise<SendResult> {
  const conn = connection();
  const from = kp.publicKey;
  const bal = await conn.getBalance(from, "confirmed");
  if (bal < lamports + TREASURY_KEEP_LAMPORTS) return { ok: false, error: "short" };
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: new PublicKey(to),
      lamports,
    }),
  );
  tx.feePayer = from;
  tx.recentBlockhash = blockhash;
  tx.sign(kp);
  return sendSignedTx(tx);
}
