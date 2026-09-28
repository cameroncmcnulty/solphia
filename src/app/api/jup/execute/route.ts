import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { jupExecute } from "@/lib/jup/swapV2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientIp(req) + ":jup-exe", 30, 60_000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    const b = (await req.json().catch(() => null)) as { signedTransaction?: string; requestId?: string } | null;
    if (!b?.signedTransaction || !b.requestId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const result = await jupExecute({ signedTransaction: b.signedTransaction, requestId: b.requestId });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "jupiter execute failed" }, { status: 400 });
  }
}
