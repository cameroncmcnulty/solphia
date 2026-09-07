import { NextRequest, NextResponse } from "next/server";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { quoteFromUsdc, quoteSwap, quoteToUsdc } from "@/lib/pair/jupiter";
import { SOL_MINT, USDC_MINT, XSTOCKS, xstockMint } from "@/lib/pair/mints";

export const dynamic = "force-dynamic";

function mintMap(): Record<string, string> {
  const map: Record<string, string> = { SOL: SOL_MINT, USDC: USDC_MINT };
  for (const x of XSTOCKS) map[x.symbol] = xstockMint(x.id);
  return map;
}

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":pairq", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const from = req.nextUrl.searchParams.get("from") || "SOL";
  const to = req.nextUrl.searchParams.get("to") || "SPYx";
  const amount = Number(req.nextUrl.searchParams.get("amount") || "0.1");
  const slip = Number(req.nextUrl.searchParams.get("slippageBps") || "50");
  if (!(amount > 0) || amount > 1000) return NextResponse.json({ error: "bad_amount" }, { status: 400 });
  const map = mintMap();
  const input = map[from];
  const output = map[to];
  if (!input || !output) return NextResponse.json({ error: "bad_pair" }, { status: 400 });
  let q;
  if (to === "USDC") q = await quoteToUsdc(input, amount, slip);
  else if (from === "USDC") q = await quoteFromUsdc(output, amount, slip);
  else q = await quoteSwap({ inputMint: input, outputMint: output, amount, slippageBps: slip });
  return NextResponse.json({
    ...q,
    spyxMint: xstockMint("spyx"),
    qqqxMint: xstockMint("qqqx"),
    gldxMint: xstockMint("gldx"),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.owner && !isSolanaAddress(body.owner)) {
    return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  }
  return GET(req);
}
