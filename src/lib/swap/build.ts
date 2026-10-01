import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { rpcUrl } from "../config";
import { buildSwapTx, type JupiterQuote } from "../pair/jupiter";
import { treasuryAddress } from "../treasury";
import { simulateUnsignedB64 } from "../solana/simulate";

const IX_URLS = ["https://lite-api.jup.ag/swap/v1/swap-instructions", "https://api.jup.ag/swap/v1/swap-instructions"];

type IxJson = {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
};

function toIx(raw: IxJson | null | undefined): TransactionInstruction | null {
  if (!raw?.programId || !raw.data || !Array.isArray(raw.accounts)) return null;
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: raw.accounts.map((a) => ({
      pubkey: new PublicKey(a.pubkey),
      isSigner: Boolean(a.isSigner),
      isWritable: Boolean(a.isWritable),
    })),
    data: Buffer.from(raw.data, "base64"),
  });
}

export async function fetchSwapInstructions(quote: JupiterQuote, userPublicKey: string): Promise<Record<string, unknown> | null> {
  for (const url of IX_URLS) {
    try {
      const r = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: "auto",
        }),
        signal: AbortSignal.timeout(12_000),
      });
      const data = (await r.json().catch(() => null)) as Record<string, unknown> | null;
      if (r.ok && data && (data.swapInstruction || data.setupInstructions)) return data;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function treasuryFeeIx(owner: string, feeSol?: number): TransactionInstruction | null {
  const treasury = treasuryAddress();
  const feeLamports = Math.round((feeSol || 0) * LAMPORTS_PER_SOL);
  if (!treasury || feeLamports < 5_000 || owner === treasury) return null;
  return SystemProgram.transfer({
    fromPubkey: new PublicKey(owner),
    toPubkey: new PublicKey(treasury),
    lamports: feeLamports,
  });
}

const LEGACY_MAX = 1232;

/** Add the 1% SOL skim to a Jupiter *legacy* tx. Never decompile a v0/ALT message — Blowfish flags that. */
export function appendLegacyFee(b64: string, feeIx: TransactionInstruction, feeAfter: boolean): string | null {
  try {
    const tx = Transaction.from(Buffer.from(b64, "base64"));
    if (feeAfter) tx.add(feeIx);
    else {
      const idx = tx.instructions.findIndex((ix) => !ix.programId.equals(ComputeBudgetProgram.programId));
      tx.instructions.splice(idx < 0 ? tx.instructions.length : idx, 0, feeIx);
    }
    const raw = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    if (raw.length > LEGACY_MAX) return null;
    return Buffer.from(raw).toString("base64");
  } catch {
    return null;
  }
}

/**
 * Phantom / Blowfish path. Jupiter's own swapTransaction, unchanged v0.
 * 1% SOL skim is only attached when Jupiter can still return a legacy tx that fits.
 * Live bot still uses assembleSwapTx (no Blowfish).
 */
export async function assemblePhantomSwapTx(opts: {
  owner: string;
  quote: JupiterQuote;
  feeSol?: number;
  feeAfter?: boolean;
}): Promise<{ ok: true; transaction: string } | { ok: false; reason: string }> {
  const feeIx = treasuryFeeIx(opts.owner, opts.feeSol);
  let last = "Could not build the swap.";
  for (const asLegacy of [true, false]) {
    const built = await buildSwapTx(opts.quote, opts.owner, { asLegacy });
    if (!built.ok) {
      last = built.reason;
      continue;
    }
    let packed = built.transaction;
    if (feeIx && asLegacy) {
      packed = appendLegacyFee(packed, feeIx, Boolean(opts.feeAfter)) || packed;
    }
    const sim = await simulateUnsignedB64(packed);
    if (sim.ok) return { ok: true, transaction: packed };
    last = sim.reason;
    if (packed !== built.transaction) {
      const bare = await simulateUnsignedB64(built.transaction);
      if (bare.ok) return { ok: true, transaction: built.transaction };
    }
  }
  return { ok: false, reason: last };
}

/** Desk / market only. Pad launches never call this — they go through the Solphia program. */
export async function assembleSwapTx(opts: {
  owner: string;
  quote: JupiterQuote;
  feeSol?: number;
  /** Sell routes take the 1% skim after SOL lands. Buys skim first. */
  feeAfter?: boolean;
}): Promise<{ ok: true; transaction: string } | { ok: false; reason: string }> {
  const ixPayload = await fetchSwapInstructions(opts.quote, opts.owner);
  if (!ixPayload) return { ok: false, reason: "Could not build the swap." };
  const compute = ((ixPayload.computeBudgetInstructions as IxJson[]) || []).map(toIx).filter(Boolean) as TransactionInstruction[];
  const setup = ((ixPayload.setupInstructions as IxJson[]) || []).map(toIx).filter(Boolean) as TransactionInstruction[];
  const swap = toIx(ixPayload.swapInstruction as IxJson);
  const cleanup = toIx(ixPayload.cleanupInstruction as IxJson);
  if (!swap) return { ok: false, reason: "Could not build the swap." };

  const ixs: TransactionInstruction[] = [...compute];
  const feeIx = treasuryFeeIx(opts.owner, opts.feeSol);
  if (feeIx && !opts.feeAfter) ixs.push(feeIx);
  ixs.push(...setup, swap);
  if (cleanup) ixs.push(cleanup);
  if (feeIx && opts.feeAfter) ixs.push(feeIx);

  const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
  const altAddrs = (ixPayload.addressLookupTableAddresses as string[]) || [];
  const alts: AddressLookupTableAccount[] = [];
  for (const addr of altAddrs) {
    try {
      const acc = await conn.getAddressLookupTable(new PublicKey(addr));
      if (acc.value) alts.push(acc.value);
    } catch {
      /* skip missing ALT */
    }
  }
  const { blockhash } = await conn.getLatestBlockhash();
  const msg = new TransactionMessage({
    payerKey: new PublicKey(opts.owner),
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message(alts);
  const tx = new VersionedTransaction(msg);
  return { ok: true, transaction: Buffer.from(tx.serialize()).toString("base64") };
}
