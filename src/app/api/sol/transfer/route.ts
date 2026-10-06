import { NextRequest, NextResponse } from "next/server";
import {
  ComputeBudgetProgram,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { rpcUrl } from "@/lib/config";
import { SOL_MINT } from "@/lib/pair/mints";
import { bytesToB64 } from "@/lib/solana/wire";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const Body = z.object({
  owner: z.string(),
  to: z.string(),
  amount: z.number().positive(),
  mint: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const MICRO: Record<"low" | "medium" | "high", number> = {
  low: 1_000,
  medium: 50_000,
  high: 400_000,
};

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":xfer", 12, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;
  if (!isSolanaAddress(b.owner) || !isSolanaAddress(b.to)) {
    return NextResponse.json({ error: "bad_address" }, { status: 400 });
  }
  if (b.owner === b.to) return NextResponse.json({ error: "same_wallet" }, { status: 400 });
  const mint = (b.mint || SOL_MINT).trim();
  if (!isSolanaAddress(mint)) return NextResponse.json({ error: "bad_mint" }, { status: 400 });
  try {
    const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
    const from = new PublicKey(b.owner);
    const to = new PublicKey(b.to);
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction();
    tx.feePayer = from;
    tx.recentBlockhash = blockhash;
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: MICRO[b.priority || "medium"] }));
    if (mint === SOL_MINT) {
      const lamports = Math.round(b.amount * LAMPORTS_PER_SOL);
      if (!(lamports > 0)) return NextResponse.json({ error: "bad_amount" }, { status: 400 });
      tx.add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }));
    } else {
      const mintPk = new PublicKey(mint);
      const info = await conn.getAccountInfo(mintPk, "confirmed");
      if (!info) return NextResponse.json({ error: "unknown_mint" }, { status: 400 });
      const program =
        info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      const mintData = info.data;
      const decimals = mintData.length >= 45 ? mintData[44]! : 9;
      const raw = BigInt(Math.round(b.amount * 10 ** decimals));
      if (raw <= 0n) return NextResponse.json({ error: "bad_amount" }, { status: 400 });
      const src = getAssociatedTokenAddressSync(mintPk, from, false, program);
      const dst = getAssociatedTokenAddressSync(mintPk, to, false, program);
      tx.add(createAssociatedTokenAccountIdempotentInstruction(from, dst, to, mintPk, program));
      tx.add(createTransferCheckedInstruction(src, mintPk, dst, from, raw, decimals, [], program));
    }
    const packed = bytesToB64(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
    return NextResponse.json({ transaction: packed, mint, amount: b.amount });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "build failed" }, { status: 500 });
  }
}
