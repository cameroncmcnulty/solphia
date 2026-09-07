import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { loadTickerCharts } from "@/lib/pair/charts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":charts", 40, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const tickers = await loadTickerCharts();
  return NextResponse.json({ tickers, at: Date.now() });
}
