import { NextRequest, NextResponse } from "next/server";
import { fetchTokenChart, type ChartTf } from "@/lib/launch/chart";

export const dynamic = "force-dynamic";

const TFS = new Set<ChartTf>(["5m", "15m", "1h", "6h"]);

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint") || "";
  const pair = req.nextUrl.searchParams.get("pair") || "";
  const venue = req.nextUrl.searchParams.get("venue") || "";
  const tfRaw = (req.nextUrl.searchParams.get("tf") || "15m") as ChartTf;
  const tf = TFS.has(tfRaw) ? tfRaw : "15m";
  if (!mint && !pair) return NextResponse.json({ candles: [], unit: "sol" });
  try {
    const pack = await fetchTokenChart({ mint: mint || undefined, pair: pair || undefined, venue: venue || undefined, tf });
    return NextResponse.json({ candles: pack.candles, unit: pack.unit, tf });
  } catch {
    return NextResponse.json({ candles: [], unit: "sol", tf });
  }
}
