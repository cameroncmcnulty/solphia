import { SWAP_FEE_BPS } from "../launch/curve";
import { quoteOpenSwap, type JupiterQuote } from "../pair/jupiter";
import { SOL_MINT } from "../pair/mints";
import { isSolanaAddress } from "../security";
import { assembleSwapTx } from "./build";
import { buildPadTradeTx, padCurveReady, quoteBuyRaw, quoteSellRaw } from "../launch/program";

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
  skipFee?: boolean;
}): Promise<
  | {
      ok: true;
      via: "curve" | "jupiter";
      quote?: JupiterQuote;
      impactPct: number;
      outAmount: number;
      feeSol: number;
      spendSol: number;
      inMint: string;
      outMint: string;
      creator?: string;
    }
  | { ok: false; reason: string }
> {
  if (!isSolanaAddress(opts.mint) || opts.mint === SOL_MINT) return { ok: false, reason: "Bad mint." };
  if (!(opts.amount > 0)) return { ok: false, reason: "Enter an amount." };
  const live = await padCurveReady(opts.mint);
  if (live.ok && live.curve.phase === "curve") {
    const vs = BigInt(Math.round(live.curve.virtualSol * 1e9));
    const vt = BigInt(Math.round(live.curve.virtualTokens * 1e6));
    if (opts.side === "buy") {
      if (opts.amount < 0.01) return { ok: false, reason: "Amount is too small." };
      const q = quoteBuyRaw(vs, vt, BigInt(Math.round(opts.amount * 1e9)));
      if (q.tokensOut <= 0n) return { ok: false, reason: "That size would print zero tokens." };
      return {
        ok: true,
        via: "curve",
        impactPct: 0,
        outAmount: Number(q.tokensOut) / 1e6,
        feeSol: Number(q.fee) / 1e9,
        spendSol: opts.amount,
        inMint: SOL_MINT,
        outMint: opts.mint,
        creator: live.creator,
      };
    }
    const q = quoteSellRaw(vs, vt, BigInt(Math.round(opts.amount * 1e6)));
    if (q.solOut <= 0n) return { ok: false, reason: "That size would print zero SOL." };
    return {
      ok: true,
      via: "curve",
      impactPct: 0,
      outAmount: Number(q.solOut) / 1e9,
      feeSol: Number(q.fee) / 1e9,
      spendSol: opts.amount,
      inMint: opts.mint,
      outMint: SOL_MINT,
      creator: live.creator,
    };
  }
  const slip = opts.slippageBps || 100;
  if (opts.side === "buy") {
    const { feeSol, swapSol } = opts.skipFee ? { feeSol: 0, swapSol: opts.amount } : splitPadSpend(opts.amount);
    if (swapSol < 0.005) return { ok: false, reason: "Amount is too small after the protocol fee." };
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
      via: "jupiter",
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
  const feeSol = opts.skipFee ? 0 : feeSolOf(q.outAmount);
  return {
    ok: true,
    via: "jupiter",
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
  mint?: string;
  side?: "buy" | "sell";
  amount?: number;
  quote?: JupiterQuote;
  feeSol: number;
  feeAfter?: boolean;
  via?: "curve" | "jupiter";
  creator?: string;
}): Promise<{ ok: true; transaction: string } | { ok: false; reason: string }> {
  if (!isSolanaAddress(opts.owner)) return { ok: false, reason: "Connect Phantom first." };
  if (opts.via === "curve" && opts.mint && opts.side) {
    const live = await padCurveReady(opts.mint);
    const creator = opts.creator || (live.ok ? live.creator : opts.owner);
    const built = await buildPadTradeTx({
      mint: opts.mint,
      owner: opts.owner,
      creator,
      side: opts.side,
      sol: opts.side === "buy" ? opts.amount : undefined,
      tokens: opts.side === "sell" ? opts.amount : undefined,
    });
    if (!built.ok) return { ok: false, reason: "Could not build the curve swap." };
    return { ok: true, transaction: built.transaction };
  }
  if (!opts.quote) return { ok: false, reason: "Could not build the swap." };
  return assembleSwapTx({ owner: opts.owner, quote: opts.quote, feeSol: opts.feeSol, feeAfter: opts.feeAfter });
}
