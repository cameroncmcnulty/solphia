import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { sendRawAndConfirm } from "@/lib/tx/send";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientIp(req) + ":send", 12, 60_000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const b64 = typeof body?.transaction === "string" ? body.transaction : "";
    if (!b64 || b64.length > 24_000) return NextResponse.json({ error: "bad_tx" }, { status: 400 });
    const sent = await sendRawAndConfirm(Buffer.from(b64, "base64"), { waitMs: 6_000, skipPreflight: true });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error, signature: sent.signature }, { status: 400 });
    }
    return NextResponse.json({ signature: sent.signature });
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
