import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { SOL_MINT } from "@/lib/pair/mints";
import { buildAnySwapTx } from "@/lib/swap/open";
import { withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { creditRank } from "@/lib/rank/engine";
import { creditSwapHold } from "@/lib/fees/income";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  owner: z.string(),
  mint: z.string().optional(),
  side: z.enum(["buy", "sell"]).optional(),
  inputMint: z.string().optional(),
  outputMint: z.string().optional(),
  amount: z.number().positive(),
  slippageBps: z.number().min(50).max(300).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":padswap", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.owner)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b = parsed.data;
  const inputMint = b.inputMint || (b.side === "sell" ? b.mint : SOL_MINT) || "";
  const outputMint = b.outputMint || (b.side === "buy" ? b.mint : SOL_MINT) || "";
  if (!isSolanaAddress(inputMint) || !isSolanaAddress(outputMint)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const tx = await buildAnySwapTx({
    owner: b.owner,
    inputMint,
    outputMint,
    amount: b.amount,
    slippageBps: b.slippageBps,
  });
  if (!tx.ok) return NextResponse.json({ error: tx.reason }, { status: 400 });
  try {
    await withLaunch((s) => {
      if (!s.launch) s.launch = emptyLaunchBook();
      creditRank(s.launch, b.owner, "swap", { sol: inputMint === SOL_MINT ? b.amount : 0 });
      if (tx.via === "jupiter" && tx.feeSol > 0) creditSwapHold(s.launch, tx.feeSol, false);
    }, true);
  } catch {
    /* swap still goes out */
  }
  return NextResponse.json({
    transaction: tx.transaction,
    via: tx.via,
    outAmount: tx.outAmount,
    feeSol: tx.feeSol,
  });
}
