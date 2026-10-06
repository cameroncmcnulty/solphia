import { NextRequest, NextResponse } from "next/server";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { fetchAddressTxs } from "@/lib/helius/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":txhist", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const pubkey = (req.nextUrl.searchParams.get("pubkey") || "").trim();
  if (!isSolanaAddress(pubkey)) return NextResponse.json({ error: "bad_pubkey" }, { status: 400 });
  const rows = await fetchAddressTxs(pubkey, 24);
  return NextResponse.json({
    pubkey,
    transfers: rows.map((tx) => ({
      sig: tx.signature || "",
      at: tx.timestamp ? tx.timestamp * 1000 : 0,
      sol: (tx.nativeTransfers || []).reduce((n, t) => n + (Number(t.amount) || 0), 0) / 1e9,
      from: tx.feePayer || "",
    })),
  });
}
