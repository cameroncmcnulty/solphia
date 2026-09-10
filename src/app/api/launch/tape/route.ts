import { NextResponse } from "next/server";
import { loadMarketTape, MARKET_MIN_SCORE } from "@/lib/launch/market";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const pack = await loadMarketTape();
    return NextResponse.json({
      coins: pack.rows.map((r) => ({ ...r.coin, score: r.score, grade: r.grade })),
      solUsd: pack.solUsd,
      scanned: pack.scanned,
      kept: pack.rows.length,
      minScore: MARKET_MIN_SCORE,
    });
  } catch (e) {
    return NextResponse.json({
      coins: [],
      solUsd: 0,
      scanned: 0,
      kept: 0,
      minScore: MARKET_MIN_SCORE,
      error: e instanceof Error ? e.message : "tape failed",
    });
  }
}
