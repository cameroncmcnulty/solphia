import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { quotePadSwap } from "@/lib/swap/pad";

export const dynamic = "force-dynamic";

const Body = z.object({
  mint: z.string(),
  side: z.enum(["buy", "sell"]),
  amount: z.number().positive(),
  slippageBps: z.number().min(50).max(300).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":padquote", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.mint)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const q = await quotePadSwap(parsed.data);
  if (!q.ok) return NextResponse.json({ error: q.reason }, { status: 400 });
  return NextResponse.json({
    ok: true,
    outAmount: q.outAmount,
    feeSol: q.feeSol,
    spendSol: q.spendSol,
    impactPct: q.impactPct,
    quote: q.quote,
    inMint: q.inMint,
    outMint: q.outMint,
  });
}
