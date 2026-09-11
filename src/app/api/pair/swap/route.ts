import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { liveTradingEnabled } from "@/lib/liveFlag";
import { quoteBestRoute } from "@/lib/pair/jupiter";
import { isAllowedMint, SOL_MINT } from "@/lib/pair/mints";
import { assembleSwapTx } from "@/lib/swap/build";
import { BOT_SLIPPAGE_BPS } from "@/lib/config";
import { protocolFeeSol } from "@/lib/swap/route";

export const dynamic = "force-dynamic";

const Body = z.object({
  owner: z.string(),
  tradingPubkey: z.string(),
  inputMint: z.string(),
  outputMint: z.string(),
  amount: z.number().positive(),
  slippageBps: z.number().min(10).max(150).optional(),
  feeSol: z.number().nonnegative().optional(),
  clipUsd: z.number().nonnegative().optional(),
  solUsd: z.number().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  if (!liveTradingEnabled()) return NextResponse.json({ error: "live_off" }, { status: 403 });
  if (!rateLimit(clientIp(req) + ":pairswap", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.owner) || !isSolanaAddress(parsed.data.tradingPubkey)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!isAllowedMint(parsed.data.inputMint) || !isAllowedMint(parsed.data.outputMint)) {
    return NextResponse.json({ error: "mint_not_allowed" }, { status: 400 });
  }
  const slip = parsed.data.slippageBps || BOT_SLIPPAGE_BPS;
  const feeSol =
    parsed.data.feeSol ??
    (parsed.data.clipUsd && parsed.data.solUsd ? protocolFeeSol(parsed.data.clipUsd, parsed.data.solUsd) : 0);
  let spend = parsed.data.amount;
  if (parsed.data.inputMint === SOL_MINT && feeSol > 0) {
    spend = Math.max(0, parsed.data.amount - feeSol);
  }
  const q = await quoteBestRoute({
    inputMint: parsed.data.inputMint,
    outputMint: parsed.data.outputMint,
    amount: spend,
    slippageBps: slip,
  });
  if (!q.ok) return NextResponse.json({ error: q.reason }, { status: 400 });
  if (q.viaUsdc && q.midAmount) {
    return NextResponse.json({
      viaUsdc: true,
      midAmount: q.midAmount,
      impactPct: q.impactPct,
      outAmount: q.outAmount,
      feeSol,
    });
  }
  const tx = await assembleSwapTx({ owner: parsed.data.tradingPubkey, quote: q.quote, feeSol });
  if (!tx.ok) return NextResponse.json({ error: tx.reason }, { status: 400 });
  return NextResponse.json({
    transaction: tx.transaction,
    impactPct: q.impactPct,
    outAmount: q.outAmount,
    quote: q.quote,
    feeSol,
    viaUsdc: false,
  });
}
