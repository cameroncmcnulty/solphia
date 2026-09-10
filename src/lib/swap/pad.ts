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
import { SWAP_FEE_BPS } from "../launch/curve";
import { quoteOpenSwap, type JupiterQuote } from "../pair/jupiter";
import { SOL_MINT } from "../pair/mints";
import { isSolanaAddress } from "../security";
import { treasuryAddress } from "../treasury";

const IX_URLS = ["https://lite-api.jup.ag/swap/v1/swap-instructions", "https://api.jup.ag/swap/v1/swap-instructions"];

export const PAD_SWAP_FEE_BPS = SWAP_FEE_BPS;

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

function feeSolOf(amountSol: number): number {
  return Math.floor(amountSol * PAD_SWAP_FEE_BPS) / 10_000;
}

export function splitPadSpend(amountSol: number): { feeSol: number; swapSol: number } {
  const feeSol = feeSolOf(amountSol);
  const swapSol = Math.max(0, amountSol - feeSol);
  return { feeSol, swapSol };
}

async function jupIx(quote: JupiterQuote, userPublicKey: string): Promise<Record<string, unknown> | null> {
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

export async function quotePadSwap(opts: {
  side: "buy" | "sell";
  mint: string;
  amount: number;
  slippageBps?: number;
}): Promise<
  | {
      ok: true;
      quote: JupiterQuote;
      impactPct: number;
      outAmount: number;
      feeSol: number;
      spendSol: number;
      inMint: string;
      outMint: string;
    }
  | { ok: false; reason: string }
> {
  if (!isSolanaAddress(opts.mint) || opts.mint === SOL_MINT) return { ok: false, reason: "Bad mint." };
  if (!(opts.amount > 0)) return { ok: false, reason: "Enter an amount." };
  const slip = opts.slippageBps || 100;
  if (opts.side === "buy") {
    const { feeSol, swapSol } = splitPadSpend(opts.amount);
    if (swapSol < 0.005) return { ok: false, reason: "Amount is too small after the 1% protocol fee." };
    const q = await quoteOpenSwap({
      inputMint: SOL_MINT,
      outputMint: opts.mint,
      amount: swapSol,
      slippageBps: slip,
      inDecimals: 9,
    });
    if (!q.ok) return q;
    return {
      ok: true,
      quote: q.quote,
      impactPct: q.impactPct,
      outAmount: q.outAmount,
      feeSol,
      spendSol: opts.amount,
      inMint: SOL_MINT,
      outMint: opts.mint,
    };
  }
  const q = await quoteOpenSwap({
    inputMint: opts.mint,
    outputMint: SOL_MINT,
    amount: opts.amount,
    slippageBps: slip,
    inDecimals: 6,
  });
  if (!q.ok) return q;
  const feeSol = feeSolOf(q.outAmount);
  return {
    ok: true,
    quote: q.quote,
    impactPct: q.impactPct,
    outAmount: Math.max(0, q.outAmount - feeSol),
    feeSol,
    spendSol: opts.amount,
    inMint: opts.mint,
    outMint: SOL_MINT,
  };
}

export async function buildPadSwapTx(opts: {
  owner: string;
  quote: JupiterQuote;
  feeSol: number;
}): Promise<{ ok: true; transaction: string } | { ok: false; reason: string }> {
  if (!isSolanaAddress(opts.owner)) return { ok: false, reason: "Connect Phantom first." };
  const treasury = treasuryAddress();
  const ixPayload = await jupIx(opts.quote, opts.owner);
  if (!ixPayload) return { ok: false, reason: "Could not build the swap." };
  const compute = ((ixPayload.computeBudgetInstructions as IxJson[]) || []).map(toIx).filter(Boolean) as TransactionInstruction[];
  const setup = ((ixPayload.setupInstructions as IxJson[]) || []).map(toIx).filter(Boolean) as TransactionInstruction[];
  const swap = toIx(ixPayload.swapInstruction as IxJson);
  const cleanup = toIx(ixPayload.cleanupInstruction as IxJson);
  if (!swap) return { ok: false, reason: "Could not build the swap." };
  const feeLamports = Math.round((opts.feeSol || 0) * LAMPORTS_PER_SOL);
  const ixs: TransactionInstruction[] = [...compute];
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
