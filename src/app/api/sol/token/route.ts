import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { rpcUrl } from "@/lib/config";
import { tokenUiAmount } from "@/lib/solana/tokenBalance";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":tokbal", 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const owner = req.nextUrl.searchParams.get("owner") || "";
  const mint = req.nextUrl.searchParams.get("mint") || "";
  if (!isSolanaAddress(owner) || !isSolanaAddress(mint)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
    const { amount, decimals } = await tokenUiAmount(conn, owner, mint);
    return NextResponse.json({ owner, mint, amount, decimals });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "rpc" }, { status: 502 });
  }
}
