import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { rpcUrl } from "../config";
import { buildSwapTx, type JupiterQuote } from "../pair/jupiter";
import { boundReferrer, houseFeeIxs } from "../fees/payout";
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

/** @deprecated use houseFeeIxs — kept so one-ix tests still compile. */
export function treasuryFeeIx(owner: string, feeSol?: number, person?: string): TransactionInstruction | null {
  return houseFeeIxs({ from: owner, feeSol: feeSol || 0, referrer: person ? boundReferrer(person) : boundReferrer(owner) })[0] || null;
}

const LEGACY_MAX = 1232;

/** Add the 1% SOL skim to a Jupiter *legacy* tx. Never decompile a v0/ALT message — Blowfish flags that. */
export function appendLegacyFees(b64: string, feeIxs: TransactionInstruction[], feeAfter: boolean): string | null {
  if (!feeIxs.length) return b64;
  try {
    const tx = Transaction.from(Buffer.from(b64, "base64"));
    if (feeAfter) {
      for (const ix of feeIxs) tx.add(ix);
    } else {
      const idx = tx.instructions.findIndex((ix) => !ix.programId.equals(ComputeBudgetProgram.programId));
      tx.instructions.splice(idx < 0 ? tx.instructions.length : idx, 0, ...feeIxs);
    }
    const raw = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    if (raw.length > LEGACY_MAX) return null;
    return Buffer.from(raw).toString("base64");
  } catch {
    return null;
  }
}

export function appendLegacyFee(b64: string, feeIx: TransactionInstruction, feeAfter: boolean): string | null {
  return appendLegacyFees(b64, [feeIx], feeAfter);
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
  /** Human generating the fee (Phantom owner). Defaults to `owner`. */
  person?: string;
}): Promise<{ ok: true; transaction: string } | { ok: false; reason: string }> {
  const person = opts.person || opts.owner;
  const feeIxs = houseFeeIxs({
    from: opts.owner,
    feeSol: opts.feeSol || 0,
    referrer: boundReferrer(person),
    mode: "hold",
  });
  let last = "Could not build the swap.";
  for (const asLegacy of [true, false]) {
    const built = await buildSwapTx(opts.quote, opts.owner, { asLegacy });
    if (!built.ok) {
      last = built.reason;
      continue;
    }
    let packed = built.transaction;
    if (feeIxs.length && asLegacy) {
      packed = appendLegacyFees(packed, feeIxs, Boolean(opts.feeAfter)) || packed;
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
  /** Human generating the fee. Trading-wallet swaps pass the Phantom owner here. */
  person?: string;
}): Promise<{ ok: true; transaction: string } | { ok: false; reason: string }> {
  const ixPayload = await fetchSwapInstructions(opts.quote, opts.owner);
  if (!ixPayload) return { ok: false, reason: "Could not build the swap." };
  const compute = ((ixPayload.computeBudgetInstructions as IxJson[]) || []).map(toIx).filter(Boolean) as TransactionInstruction[];
  const setup = ((ixPayload.setupInstructions as IxJson[]) || []).map(toIx).filter(Boolean) as TransactionInstruction[];
  const swap = toIx(ixPayload.swapInstruction as IxJson);
  const cleanup = toIx(ixPayload.cleanupInstruction as IxJson);
  if (!swap) return { ok: false, reason: "Could not build the swap." };

  const ixs: TransactionInstruction[] = [...compute];
  const feeIxs = houseFeeIxs({
    from: opts.owner,
    feeSol: opts.feeSol || 0,
    referrer: boundReferrer(opts.person || opts.owner),
    mode: "hold",
  });
  if (feeIxs.length && !opts.feeAfter) ixs.push(...feeIxs);
  ixs.push(...setup, swap);
  if (cleanup) ixs.push(cleanup);
  if (feeIxs.length && opts.feeAfter) ixs.push(...feeIxs);

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
