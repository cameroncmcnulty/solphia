import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { treasuryAddress } from "../treasury";
import { harvestKeypair } from "../treasury/withdraw";
import { ownerAddress } from "../ownerWallet";
import { signSendAndConfirm, sendSignedTx, type SendResult } from "../tx/send";
import { isSolanaAddress } from "../security";
import { dbcEnabled } from "./dbcIds";
import { evenShare, FEE_DUST_LAMPORTS, harvestSplit } from "../fees/payout";
import { payoutAddress } from "../fees/vault";
import { creditPartnerClaim } from "../fees/income";
import { emptyLaunchBook } from "./engine";
import { withLaunch } from "../store";
import { connection } from "../solana/connection";
import { encodeTx } from "../token/mint";
import { simulateUnsignedB64 } from "../solana/simulate";
import { DEFAULT_OWNER } from "../protocolWallets";

const TREASURY_KEEP_LAMPORTS = 2_000_000;

/**
 * Optional cron: server-sign partner claims one pool at a time when TREASURY_SECRET
 * is the displayed treasury. Packed multi-pool claims are flagged malicious.
 * Claim lands in treasury; owner 25% is transferred live. Creators stay on their own claim.
 */
export async function sweepPartnerFees(opts?: {
  mints?: string[];
  limit?: number;
}): Promise<{ claimed: number; sol: number; ownerSol: number; creatorSol: number; signatures: string[] }> {
  const empty = { claimed: 0, sol: 0, ownerSol: 0, creatorSol: 0, signatures: [] as string[] };
  if (!dbcEnabled()) return empty;
  const kp = harvestKeypair();
  if (!kp) return empty;
  const harvest = kp.publicKey.toBase58();
  const { buildDbcClaimPartnerBatch } = await import("./dbc");
  const limit = Math.max(1, Math.min(Number(opts?.limit) || 3, 8));
  let queue = (opts?.mints || []).map((m) => String(m || "").trim()).filter((m) => isSolanaAddress(m));
  const signatures: string[] = [];
  let sol = 0;
  let ownerSol = 0;
  let creatorSol = 0;
  let claimed = 0;
  const ownerPk = ownerAddress();
  const treasPk = treasuryAddress();
  for (let i = 0; i < limit; i++) {
    const built = await buildDbcClaimPartnerBatch({ owner: harvest, mints: queue });
    if (!built.ok) break;
    const split = harvestSplit(built.claimSol, built.partnerOnly, Boolean(built.creator));
    const legs = harvestLegs(harvest, {
      creator: built.creator || "",
      owner: ownerPk,
      treasury: treasPk,
      split,
    });
    const packed = await packClaimWithLegs(built.transaction, harvest, legs);
    const sent = await signSendAndConfirm(kp, packed.transaction);
    if (!sent.ok) break;
    claimed += 1;
    sol += built.claimSol;
    signatures.push(sent.signature);
    const unpaid = legs.filter((leg) => !packed.paid.has(leg.to));
    for (const leg of unpaid) {
      if (leg.lamports < FEE_DUST_LAMPORTS) continue;
      const paid = await sendHarvestSol(kp, leg.to, leg.lamports);
      if (paid.ok) {
        packed.paid.add(leg.to);
        signatures.push(paid.signature);
      }
    }
    if (packed.paid.has(ownerPk)) ownerSol += split.owner;
    if (built.creator && packed.paid.has(payoutAddress(built.creator))) creatorSol += split.dev;
    try {
      await withLaunch((st) => {
        if (!st.launch) st.launch = emptyLaunchBook();
        creditPartnerClaim(st.launch, built.claimSol, built.partnerOnly);
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
  return { claimed, sol, ownerSol, creatorSol, signatures };
}

function harvestLegs(
  from: string,
  opts: { creator: string; owner: string; treasury: string; split: ReturnType<typeof evenShare> },
): { to: string; lamports: number }[] {
  const rows: { to: string; lamports: number }[] = [];
  const add = (to: string, sol: number, vaultOk = false) => {
    const dest = vaultOk ? payoutAddress(to) : to;
    const lamports = Math.round(sol * LAMPORTS_PER_SOL);
    if (!dest || !isSolanaAddress(dest) || dest === from || lamports < FEE_DUST_LAMPORTS) return;
    const hit = rows.find((r) => r.to === dest);
    if (hit) hit.lamports += lamports;
    else rows.push({ to: dest, lamports });
  };
  add(opts.creator, opts.split.dev, true);
  add(opts.owner, opts.split.owner);
  add(opts.treasury, opts.split.treasury);
  return rows;
}

/**
 * Owner and treasury are different project wallets. Either can pull the partner half.
 * DBC feeClaimer is still the treasury; owner claims co-sign or sweep when TREASURY_SECRET
 * is set, otherwise owner signs if they are the claimer. After the pull, the other
 * wallet's 50% of that partner half is transferred live in the same tx.
 */
export async function buildProtocolPartnerClaim(opts: {
  pubkey: string;
  mints: string[];
}): Promise<
  | {
      ok: true;
      needsSign: true;
      transaction: string;
      claimSol: number;
      mints: string[];
      creator?: string;
      partnerOnly: boolean;
      remaining: number;
      remainingSol: number;
      remainingMints: string[];
    }
  | {
      ok: true;
      needsSign: false;
      claimed: number;
      sol: number;
      ownerSol: number;
      signatures: string[];
    }
  | { ok: false; error: string }
> {
  const treas = treasuryAddress();
  const ownerPk = ownerAddress() || DEFAULT_OWNER;
  const pubkey = (opts.pubkey || "").trim();
  const isTreas = pubkey === treas;
  const isOwner = pubkey === ownerPk || pubkey === DEFAULT_OWNER;
  if (!isTreas && !isOwner) return { ok: false, error: "not_owner" };

  const { buildDbcClaimPartnerBatch } = await import("./dbc");
  const mints = opts.mints;

  if (isOwner && !isTreas) {
    const hot = harvestKeypair();
    if (hot) {
      const swept = await sweepPartnerFees({ mints, limit: 4 });
      if (swept.claimed > 0) {
        return {
          ok: true,
          needsSign: false,
          claimed: swept.claimed,
          sol: swept.ownerSol,
          ownerSol: swept.ownerSol,
          signatures: swept.signatures,
        };
      }
    }
  }

  const claimers = isTreas ? [treas] : [...new Set([pubkey, treas].filter(Boolean))];
  const hot = harvestKeypair();
  for (const claimer of claimers) {
    if (claimer !== pubkey && !hot) continue;
    const built = await buildDbcClaimPartnerBatch({
      mints,
      owner: claimer,
      payer: pubkey,
      receiver: pubkey,
    });
    if (!built.ok) continue;
    let b64 = built.transaction;
    if (claimer !== pubkey && hot) {
      try {
        const tx = Transaction.from(Buffer.from(b64, "base64"));
        tx.partialSign(hot);
        b64 = encodeTx(tx);
      } catch {
        continue;
      }
    }
    const transaction = await decoratePartnerClaimTx(b64, pubkey, {
      claimSol: built.claimSol,
      partnerOnly: built.partnerOnly,
      creator: built.creator,
    });
    return {
      ok: true,
      needsSign: true,
      transaction,
      claimSol: built.claimSol,
      mints: built.mints,
      creator: built.creator,
      partnerOnly: built.partnerOnly,
      remaining: built.remaining,
      remainingSol: built.remainingSol,
      remainingMints: built.remainingMints,
    };
  }
  return { ok: false, error: "empty" };
}

/** Pack owner (and creator, if any) live transfers onto a Phantom-signed partner claim. */
export async function decoratePartnerClaimTx(
  b64: string,
  from: string,
  opts: { claimSol: number; partnerOnly: boolean; creator?: string },
): Promise<string> {
  const split = harvestSplit(opts.claimSol, opts.partnerOnly, Boolean(opts.creator));
  const legs = harvestLegs(from, {
    creator: opts.creator || "",
    owner: ownerAddress(),
    treasury: treasuryAddress(),
    split,
  });
  const packed = await packClaimWithLegs(b64, from, legs);
  return packed.transaction;
}

function packClaimWithLegs(
  b64: string,
  from: string,
  legs: { to: string; lamports: number }[],
): Promise<{ transaction: string; paid: Set<string> }> {
  return (async () => {
    if (!legs.length) return { transaction: b64, paid: new Set<string>() };
    try {
      const tx = Transaction.from(Buffer.from(b64, "base64"));
      for (const leg of legs) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(from),
            toPubkey: new PublicKey(leg.to),
            lamports: leg.lamports,
          }),
        );
      }
      const next = encodeTx(tx);
      const sim = await simulateUnsignedB64(next);
      if (sim.ok) return { transaction: next, paid: new Set(legs.map((l) => l.to)) };
    } catch {
      /* fall through to claim-only */
    }
    return { transaction: b64, paid: new Set<string>() };
  })();
}

async function sendHarvestSol(kp: Keypair, to: string, lamports: number): Promise<SendResult> {
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
