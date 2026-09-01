import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { rpcUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  return NextResponse.json({ blockhash, lastValidBlockHeight });
}
