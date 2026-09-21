import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { rpcUrl } from "@/lib/config";

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
    const r = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [b64, { encoding: "base64", skipPreflight: true, preflightCommitment: "confirmed", maxRetries: 3 }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const j = (await r.json()) as { result?: string; error?: { message?: string; code?: number } };
    if (!r.ok || j.error || typeof j.result !== "string") {
      return NextResponse.json(
        { error: j.error?.message || "send failed" },
        { status: r.status === 403 || r.status === 429 ? r.status : 400 },
      );
    }
    return NextResponse.json({ signature: j.result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
