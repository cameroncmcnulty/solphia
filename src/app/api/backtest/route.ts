import { NextResponse } from "next/server";
import { publicBacktest } from "@/lib/pair/backtest";
import { loadState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = loadState().backtest;
  return NextResponse.json(publicBacktest(report));
}
