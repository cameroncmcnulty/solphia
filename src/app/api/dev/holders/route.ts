import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { connection } from "@/lib/solana/connection";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":holders", 6, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const mint = req.nextUrl.searchParams.get("mint") || "";
  if (!isSolanaAddress(mint)) return NextResponse.json({ error: "bad_mint" }, { status: 400 });
  const mintPk = new PublicKey(mint);
  const conn = connection();
  const info = await conn.getAccountInfo(mintPk);
  const program = info?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const accounts = await conn.getParsedProgramAccounts(program, {
    filters: [{ dataSize: 165 }, { memcmp: { offset: 0, bytes: mint } }],
  });
  const rows = accounts
    .map((a) => {
      const parsed = (a.account.data as { parsed?: { info?: { owner?: string; tokenAmount?: { amount?: string; uiAmount?: number } } } })
        .parsed?.info;
      const amount = parsed?.tokenAmount?.amount || "0";
      if (amount === "0") return null;
      return {
        address: parsed?.owner || "",
        amount,
        uiAmount: parsed?.tokenAmount?.uiAmount || 0,
      };
    })
    .filter((r): r is { address: string; amount: string; uiAmount: number } => Boolean(r?.address))
    .sort((a, b) => b.uiAmount - a.uiAmount)
    .slice(0, 500);
  return NextResponse.json({ mint, count: rows.length, holders: rows });
}
