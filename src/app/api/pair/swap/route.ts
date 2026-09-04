import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { LIVE_TRADING } from "@/lib/config";
import { buildSwapTx, quoteSwap } from "@/lib/pair/jupiter";
import { isAllowedMint } from "@/lib/pair/mints";

export const dynamic = "force-dynamic";

const Body = z.object({
  owner: z.string(),
  tradingPubkey: z.string(),
  inputMint: z.string(),
  outputMint: z.string(),
  amount: z.number().positive(),
  slippageBps: z.number().min(10).max(150).optional(),
});

export async function POST(req: NextRequest) {
  if (!LIVE_TRADING) return NextResponse.json({ error: "live_off" }, { status: 403 });
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
  const q = await quoteSwap({
    inputMint: parsed.data.inputMint,
    outputMint: parsed.data.outputMint,
    amount: parsed.data.amount,
    slippageBps: parsed.data.slippageBps || 50,
  });
  if (!q.ok) return NextResponse.json({ error: q.reason }, { status: 400 });
  const tx = await buildSwapTx(q.quote, parsed.data.tradingPubkey);
  if (!tx.ok) return NextResponse.json({ error: tx.reason }, { status: 400 });
  return NextResponse.json({
    transaction: tx.transaction,
    impactPct: q.impactPct,
    outAmount: q.outAmount,
    quote: q.quote,
  });
}
