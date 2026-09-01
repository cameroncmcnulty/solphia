import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { rpcUrl } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":send", 12, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const b64 = typeof body?.transaction === "string" ? body.transaction : "";
  if (!b64 || b64.length > 24_000) return NextResponse.json({ error: "bad_tx" }, { status: 400 });
  try {
    const raw = Buffer.from(b64, "base64");
    const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
    const sig = await conn.sendRawTransaction(raw, { skipPreflight: false });
    return NextResponse.json({ signature: sig });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "send failed" }, { status: 400 });
  }
}
