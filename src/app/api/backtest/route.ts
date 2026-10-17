import { NextResponse } from "next/server";
import { loadPublicBacktestPack } from "@/lib/pair/backtest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Seeded brochure, overlaid by an admin "Push live" pack when present. */
export async function GET() {
  const pack = await loadPublicBacktestPack();
  const spot = pack.windows["1m"][1];
  return NextResponse.json(
    {
      reports: pack.reports,
      windows: pack.windows,
      publishedAt: pack.publishedAt || null,
      ...spot,
      live: { on: false },
    },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
