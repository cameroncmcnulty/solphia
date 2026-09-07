import { NextRequest, NextResponse } from "next/server";
import { latestBacktest, publicBacktest } from "@/lib/pair/backtest";
import { loadState } from "@/lib/store";
import { clampLev } from "@/lib/leverage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lev = clampLev(Number(req.nextUrl.searchParams.get("lev") || 1));
  const s = loadState();
  const stored = lev === 3 ? s.backtestLev3 : lev === 2 ? s.backtestLev2 : s.backtest;
  return NextResponse.json(publicBacktest(latestBacktest(stored, lev)));
}
