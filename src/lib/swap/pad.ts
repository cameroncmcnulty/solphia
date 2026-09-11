import { SWAP_FEE_BPS } from "../launch/curve";
import { quoteOpenSwap, type JupiterQuote } from "../pair/jupiter";
import { SOL_MINT } from "../pair/mints";
import { isSolanaAddress } from "../security";
import { assembleSwapTx } from "./build";

export const PAD_SWAP_FEE_BPS = SWAP_FEE_BPS;

function feeSolOf(amountSol: number): number {
  return Math.floor(amountSol * PAD_SWAP_FEE_BPS) / 10_000;
}

export function splitPadSpend(amountSol: number): { feeSol: number; swapSol: number } {
  const feeSol = feeSolOf(amountSol);
  const swapSol = Math.max(0, amountSol - feeSol);
  return { feeSol, swapSol };
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
  return assembleSwapTx({ owner: opts.owner, quote: opts.quote, feeSol: opts.feeSol });
}
