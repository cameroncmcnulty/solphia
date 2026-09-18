import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { buildPadSwapTx, quotePadSwap } from "@/lib/swap/pad";
import { withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { creditRank } from "@/lib/rank/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  owner: z.string(),
  mint: z.string(),
  side: z.enum(["buy", "sell"]),
  amount: z.number().positive(),
  slippageBps: z.number().min(50).max(300).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":padswap", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.owner) || !isSolanaAddress(parsed.data.mint)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const q = await quotePadSwap(parsed.data);
  if (!q.ok) return NextResponse.json({ error: q.reason }, { status: 400 });
  const tx = await buildPadSwapTx({
    owner: parsed.data.owner,
    mint: parsed.data.mint,
    side: parsed.data.side,
    amount: parsed.data.amount,
    creator: q.creator,
  });
  if (!tx.ok) return NextResponse.json({ error: tx.reason }, { status: 400 });
  try {
    await withLaunch((s) => {
      if (!s.launch) s.launch = emptyLaunchBook();
      creditRank(s.launch, parsed.data.owner, "swap", { sol: parsed.data.side === "buy" ? parsed.data.amount : 0 });
    }, true);
  } catch {
    /* swap still goes out */
  }
  return NextResponse.json({
    transaction: tx.transaction,
    via: q.via,
    outAmount: q.outAmount,
    feeSol: q.feeSol,
    impactPct: q.impactPct,
  });
}
