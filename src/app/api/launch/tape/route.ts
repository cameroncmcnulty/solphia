import { NextResponse } from "next/server";
import { loadMarketTape, MARKET_MIN_SCORE } from "@/lib/launch/market";
import { withLaunch } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { fillHouseBoosts, rankedBoosts, tickBoosts } from "@/lib/launch/boost";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const pack = await loadMarketTape();
    const coins = pack.rows.map((r) => ({ ...r.coin, score: r.score, grade: r.grade }));
    await withLaunch((st) => {
      if (!st.launch) st.launch = emptyLaunchBook();
      tickBoosts(st.launch);
      fillHouseBoosts(
        st.launch,
        coins.slice(0, 10).map((c) => ({ id: c.id || c.mint, mint: c.mint, symbol: c.symbol, name: c.name, image: c.image })),
      );
    }, true);
    const ranked = await withLaunch((st) => rankedBoosts(st.launch || emptyLaunchBook()), false);
    return NextResponse.json({
      coins,
      ranked,
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
