import { NextResponse } from "next/server";
import { latestBacktest, publicBacktest } from "@/lib/pair/backtest";
import { readyState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readyState();
  const reports = {
    1: publicBacktest(latestBacktest(s.backtest, 1)),
    2: publicBacktest(latestBacktest(s.backtestLev2, 2)),
    3: publicBacktest(latestBacktest(s.backtestLev3, 3)),
  };
  return NextResponse.json({
    reports,
    ...reports[1],
  });
}
