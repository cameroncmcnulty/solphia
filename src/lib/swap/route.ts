import { BOT_SLIPPAGE_BPS, PROTOCOL_FEE_BPS } from "../config";
import { assembleSwapTx } from "./build";
import { quoteBestRoute, type QuoteResult } from "../pair/jupiter";
import { SOL_MINT } from "../pair/mints";

export { BOT_SLIPPAGE_BPS };

export function protocolFeeSol(clipUsd: number, solUsd: number): number {
  if (!(clipUsd > 0) || !(solUsd > 0)) return 0;
  return (clipUsd * PROTOCOL_FEE_BPS) / 10_000 / solUsd;
}

export async function buildBotSwap(opts: {
  owner: string;
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  feeSol?: number;
}): Promise<
  | {
      ok: true;
      transaction: string;
      outAmount: number;
      impactPct: number;
      viaUsdc?: boolean;
      midAmount?: number;
      feeSol: number;
      quote: QuoteResult;
    }
  | { ok: false; reason: string }
> {
  let spend = opts.amount;
  const feeSol = opts.feeSol || 0;
  if (opts.inputMint === SOL_MINT && feeSol > 0) {
    spend = Math.max(0, opts.amount - feeSol);
    if (spend < 0.002) return { ok: false, reason: "Amount is too small after the protocol fee." };
  }
  const q = await quoteBestRoute({
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    amount: spend,
    slippageBps: opts.slippageBps ?? BOT_SLIPPAGE_BPS,
  });
  if (!q.ok) return q;
  if (q.viaUsdc) {
    return {
      ok: true,
      transaction: "",
      outAmount: q.outAmount,
      impactPct: q.impactPct,
      viaUsdc: true,
      midAmount: q.midAmount,
      feeSol,
      quote: q,
    };
  }
  const built = await assembleSwapTx({ owner: opts.owner, quote: q.quote, feeSol });
  if (!built.ok) return built;
  return {
    ok: true,
    transaction: built.transaction,
    outAmount: q.outAmount,
    impactPct: q.impactPct,
    feeSol,
    quote: q,
  };
}
