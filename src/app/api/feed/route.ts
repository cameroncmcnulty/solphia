import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { loadState, readyState } from "@/lib/store";
import { runMarketTick, publicBook, lastPairDesk, lastPairPrices } from "@/lib/tick";
import { publicMind } from "@/lib/mind/engine";
import { liveTradingEnabled } from "@/lib/liveFlag";
import { treasuryAddress } from "@/lib/treasury";
import { gldxMint, qqqxMint, spyxMint } from "@/lib/pair/mints";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":feed", 90, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const state = await readyState();
  const stale = Date.now() - (state.lastTickAt || 0) > 8_000;
  if (stale) {
    try {
      const tick = await Promise.race([
        runMarketTick(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 14_000)),
      ]);
      if (tick) {
        return NextResponse.json({
          paper: tick.paper,
          health: tick.health,
          solUsd: tick.solUsd,
          spyxUsd: tick.spyxUsd,
          qqqxUsd: tick.qqqxUsd,
          gldxUsd: tick.gldxUsd,
          spyxMint: spyxMint(),
          qqqxMint: qqqxMint(),
          gldxMint: gldxMint(),
          mind: publicMind(loadState().mind),
          lastTickAt: Date.now(),
          pair: tick.pair,
          liveTrading: tick.liveTrading,
          treasury: treasuryAddress(),
        });
      }
    } catch {
      /* fall through to last saved book */
    }
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
    qqqxUsd: px.qqqxUsd || (cached as { qqqxUsd?: number } | null)?.qqqxUsd || 0,
    gldxUsd: px.gldxUsd || (cached as { gldxUsd?: number } | null)?.gldxUsd || 0,
    spyxMint: spyxMint(),
    qqqxMint: qqqxMint(),
    gldxMint: gldxMint(),
    liveTrading: liveTradingEnabled(),
    treasury: treasuryAddress(),
  });
}
