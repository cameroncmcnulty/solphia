import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { SOL_MINT } from "@/lib/pair/mints";
import { quoteAnySwap } from "@/lib/swap/open";

export const dynamic = "force-dynamic";

const Body = z.object({
  mint: z.string().optional(),
  side: z.enum(["buy", "sell"]).optional(),
  inputMint: z.string().optional(),
  outputMint: z.string().optional(),
  amount: z.number().positive(),
  slippageBps: z.number().min(10).max(1000).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":padquote", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;
  const inputMint = b.inputMint || (b.side === "sell" ? b.mint : SOL_MINT) || "";
  const outputMint = b.outputMint || (b.side === "buy" ? b.mint : SOL_MINT) || "";
  if (!isSolanaAddress(inputMint) || !isSolanaAddress(outputMint)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (inputMint === outputMint) {
    return NextResponse.json({ error: "same_mint", message: "Pick two different tokens." }, { status: 400 });
  }
  const q = await quoteAnySwap({
    inputMint,
    outputMint,
    amount: b.amount,
    slippageBps: b.slippageBps,
  });
  if (!q.ok) return NextResponse.json({ error: q.reason }, { status: 400 });
  return NextResponse.json({
    ok: true,
    via: q.via,
    outAmount: q.outAmount,
    feeSol: q.feeSol,
    spendSol: q.spendSol,
    impactPct: q.impactPct,
    inMint: q.inMint,
    outMint: q.outMint,
  });
}
