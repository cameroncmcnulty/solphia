import { NextResponse } from "next/server";
import { publicBacktestPack } from "@/lib/pair/backtest";

export const dynamic = "force-dynamic";

export async function GET() {
  const pack = publicBacktestPack();
  return NextResponse.json({
    ...pack,
    ...pack.reports[1],
  });
}
