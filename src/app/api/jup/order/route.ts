import { NextRequest, NextResponse } from "next/server";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { jupFeeAccounts, jupFeeStatus, jupOrder } from "@/lib/jup/swapV2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

export async function GET() {
  const accounts = await jupFeeAccounts().catch(() => ({ sol: false, usdc: false, collecting: false }));
  return NextResponse.json({ ...jupFeeStatus(), ...accounts });
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientIp(req) + ":jup-order", 40, 60_000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    const b = (await req.json().catch(() => null)) as {
      inputMint?: string;
      outputMint?: string;
      amount?: string | number;
      taker?: string;
    } | null;
    if (!b || !isSolanaAddress(b.inputMint || "") || !isSolanaAddress(b.outputMint || "") || !isSolanaAddress(b.taker || "")) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const amount = String(b.amount || "").replace(/\D/g, "");
    if (!amount || amount === "0") return NextResponse.json({ error: "too_small" }, { status: 400 });
    const order = await jupOrder({
      inputMint: b.inputMint!,
      outputMint: b.outputMint!,
      amount,
      taker: b.taker!,
    });
    return NextResponse.json({ ok: true, ...order, ...jupFeeStatus() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "jupiter order failed" }, { status: 400 });
  }
}
