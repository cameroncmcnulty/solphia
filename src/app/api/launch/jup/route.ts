import { NextRequest, NextResponse } from "next/server";
import { isSolanaAddress, rateLimit, clientIp } from "@/lib/security";
import { quoteOpenSwap } from "@/lib/pair/jupiter";
import { SOL_MINT } from "@/lib/pair/mints";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Jupiter Instant Routing check — no DBC SDK. Phantom Swap uses this same quote. */
export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":jup-route", 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const mint = (req.nextUrl.searchParams.get("mint") || "").trim();
  if (!isSolanaAddress(mint)) return NextResponse.json({ ok: false, error: "bad_mint" }, { status: 400 });
  const q = await quoteOpenSwap({
    inputMint: SOL_MINT,
    outputMint: mint,
    amount: 0.01,
    slippageBps: 100,
    inDecimals: 9,
  });
  if (!q.ok) return NextResponse.json({ ok: false, reason: q.reason });
  const via = q.quote.routePlan?.[0]?.swapInfo?.label || "jupiter";
  return NextResponse.json({ ok: true, outAmount: q.outAmount, via });
}
