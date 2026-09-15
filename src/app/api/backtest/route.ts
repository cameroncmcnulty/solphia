import { NextResponse } from "next/server";
import { publicBacktestPack } from "@/lib/pair/backtest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public brochure is the JSON seeded in this deploy. Redis cannot roll it back. */
export async function GET() {
  const pack = publicBacktestPack();
  const spot = pack.windows["1m"][1];
  return NextResponse.json(
    {
      reports: pack.reports,
      windows: pack.windows,
      ...spot,
      live: { on: false },
    },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
