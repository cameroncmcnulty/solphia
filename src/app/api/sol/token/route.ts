import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { rpcUrl } from "@/lib/config";

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
    const rows = await conn.getParsedTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(mint) });
    let amount = 0;
    let decimals = 6;
    for (const row of rows.value) {
      const info = row.account.data.parsed?.info?.tokenAmount;
      if (!info) continue;
      decimals = Number(info.decimals) || decimals;
      amount += Number(info.uiAmount) || 0;
    }
    return NextResponse.json({ owner, mint, amount, decimals });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "rpc" }, { status: 502 });
  }
}
