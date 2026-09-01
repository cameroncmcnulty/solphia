import { NextRequest, NextResponse } from "next/server";
import { PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import BN from "bn.js";
import { OnlinePumpSdk, PUMP_SDK } from "@nirholas/pump-sdk";
import { connection } from "@/lib/solana/connection";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { packIx } from "@/lib/dev/ix";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":pump", 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const mint = String(body?.mint || "");
  const creator = String(body?.creator || "");
  const name = sanitizeText(String(body?.name || ""), 32);
  const symbol = sanitizeText(String(body?.symbol || ""), 10);
  const uri = String(body?.uri || "");
  const buyLamports = Math.max(0, Math.floor(Number(body?.buyLamports) || 0));
  if (!isSolanaAddress(mint) || !isSolanaAddress(creator) || name.length < 2 || symbol.length < 2 || !uri.startsWith("http")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const mintPk = new PublicKey(mint);
    const user = new PublicKey(creator);
    const priority = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250_000 });
    const limit = ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 });
    if (buyLamports > 0) {
      const sdk = new OnlinePumpSdk(connection());
      const ixs = await sdk.createV2AndBuyInstructions({
        mint: mintPk,
        name,
        symbol,
        uri,
        creator: user,
        user,
        solAmount: new BN(buyLamports),
        mayhemMode: false,
        cashback: false,
      });
      return NextResponse.json({ ixs: [limit, priority, ...ixs].map(packIx) });
    }
    const ix = await PUMP_SDK.createV2Instruction({
      mint: mintPk,
      name,
      symbol,
      uri,
      creator: user,
      user,
      mayhemMode: false,
      cashback: false,
    });
    return NextResponse.json({ ixs: [limit, priority, ix].map(packIx) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "pump_tx_failed" }, { status: 400 });
  }
}
