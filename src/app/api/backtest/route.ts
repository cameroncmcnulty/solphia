import { NextResponse } from "next/server";
import { latestBacktest, publicBacktest } from "@/lib/pair/backtest";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = latestBacktest(loadState().backtest);
  return NextResponse.json(publicBacktest(report));
}
