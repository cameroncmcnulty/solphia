import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { broadcastB64 } from "@/lib/solana/broadcast";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 12;

/** Submit a fully signed tx through Helius. No confirm wait — that is what 504'd launches. */
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientIp(req) + ":send", 20, 60_000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const b64 = typeof body?.transaction === "string" ? body.transaction : "";
    if (!b64 || b64.length > 24_000) return NextResponse.json({ error: "bad_tx" }, { status: 400 });
    const signature = await broadcastB64(b64);
    return NextResponse.json({ signature });
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed";
    const status = /Access forbidden|403/.test(message) ? 403 : /429|rate/.test(message) ? 429 : 400;
    return NextResponse.json({ error: message }, { status: status === 403 || status === 429 ? status : 500 });
  }
}
