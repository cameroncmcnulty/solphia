import { NextRequest, NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { isSolanaAddress, rateLimit, clientIp } from "@/lib/security";
import { rpcUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":bal", 40, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  if (!isSolanaAddress(pubkey)) return NextResponse.json({ error: "bad_pubkey" }, { status: 400 });
  try {
    const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
    const lamports = await conn.getBalance(new PublicKey(pubkey));
    return NextResponse.json({ pubkey, sol: lamports / LAMPORTS_PER_SOL, lamports });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "rpc" }, { status: 502 });
  }
}
