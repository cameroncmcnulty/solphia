import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { loadState } from "@/lib/store";
import { runMarketTick, publicBook, lastPairDesk, lastPairPrices } from "@/lib/tick";
import { publicMind } from "@/lib/mind/engine";
import { LIVE_TRADING } from "@/lib/config";
import { spyxMint } from "@/lib/pair/mints";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":feed", 90, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const state = loadState();
  const stale = Date.now() - (state.lastTickAt || 0) > 8_000;
  if (stale) {
    const tick = await runMarketTick();
    return NextResponse.json({
      paper: tick.paper,
      health: tick.health,
      solUsd: tick.solUsd,
      spyxUsd: tick.spyxUsd,
      spyxMint: spyxMint(),
      mind: publicMind(loadState().mind),
      lastTickAt: Date.now(),
      pair: tick.pair,
      liveTrading: tick.liveTrading,
    });
  }
  const cached = lastPairDesk() || state.lastPair || null;
  const px = lastPairPrices();
  return NextResponse.json({
    paper: publicBook(state.paper),
    health: state.feedHealth,
    mind: publicMind(state.mind),
    lastTickAt: state.lastTickAt,
    pair: cached,
    solUsd: px.solUsd || (cached as { solUsd?: number } | null)?.solUsd || 0,
    spyxUsd: px.spyxUsd || (cached as { spyxUsd?: number } | null)?.spyxUsd || 0,
    spyxMint: spyxMint(),
    liveTrading: LIVE_TRADING,
  });
}
