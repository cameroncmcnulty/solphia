import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { rpcUrl } from "../config";
import type { JupiterQuote } from "../pair/jupiter";
import { treasuryAddress } from "../treasury";

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

/** One transaction: optional protocol SOL skim + Jupiter swap. Beats a follow-up fee tx. */
export async function assembleSwapTx(opts: {
  owner: string;
  quote: JupiterQuote;
  feeSol?: number;
}): Promise<{ ok: true; transaction: string } | { ok: false; reason: string }> {
  const ixPayload = await fetchSwapInstructions(opts.quote, opts.owner);
  if (!ixPayload) return { ok: false, reason: "Could not build the swap." };
  const compute = ((ixPayload.computeBudgetInstructions as IxJson[]) || []).map(toIx).filter(Boolean) as TransactionInstruction[];
  const setup = ((ixPayload.setupInstructions as IxJson[]) || []).map(toIx).filter(Boolean) as TransactionInstruction[];
  const swap = toIx(ixPayload.swapInstruction as IxJson);
  const cleanup = toIx(ixPayload.cleanupInstruction as IxJson);
  if (!swap) return { ok: false, reason: "Could not build the swap." };

  const ixs: TransactionInstruction[] = [...compute];
  const treasury = treasuryAddress();
  const feeLamports = Math.round((opts.feeSol || 0) * LAMPORTS_PER_SOL);
  if (treasury && feeLamports >= 5_000) {
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(opts.owner),
        toPubkey: new PublicKey(treasury),
        lamports: feeLamports,
      }),
    );
  }
  ixs.push(...setup, swap);
  if (cleanup) ixs.push(cleanup);

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
