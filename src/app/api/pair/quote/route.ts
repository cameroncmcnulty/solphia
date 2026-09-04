import { NextRequest, NextResponse } from "next/server";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { quoteFromUsdc, quoteSolSpyx, quoteSpyxSol, quoteToUsdc } from "@/lib/pair/jupiter";
import { SOL_MINT, spyxMint, USDC_MINT } from "@/lib/pair/mints";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":pairq", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const from = req.nextUrl.searchParams.get("from") || "SOL";
  const to = req.nextUrl.searchParams.get("to") || "SPYx";
  const amount = Number(req.nextUrl.searchParams.get("amount") || "0.1");
  const slip = Number(req.nextUrl.searchParams.get("slippageBps") || "50");
  if (!(amount > 0) || amount > 1000) return NextResponse.json({ error: "bad_amount" }, { status: 400 });
  const map: Record<string, string> = { SOL: SOL_MINT, SPYx: spyxMint(), USDC: USDC_MINT };
  const input = map[from];
  const output = map[to];
  if (!input || !output) return NextResponse.json({ error: "bad_pair" }, { status: 400 });
  let q;
  if (from === "SOL" && to === "SPYx") q = await quoteSolSpyx(amount, slip);
  else if (from === "SPYx" && to === "SOL") q = await quoteSpyxSol(amount, slip);
  else if (to === "USDC") q = await quoteToUsdc(input, amount, slip);
  else q = await quoteFromUsdc(output, amount, slip);
  return NextResponse.json({ ...q, spyxMint: spyxMint() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.owner && !isSolanaAddress(body.owner)) {
    return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  }
  return GET(req);
}
