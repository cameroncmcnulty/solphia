import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { loadState } from "@/lib/store";
import { runMarketTick, publicBook } from "@/lib/tick";
import { scoreToken } from "@/lib/risk/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":feed", 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const state = loadState();
  const stale = Date.now() - (state.lastTickAt || 0) > 20_000;
  if (stale) {
    const tick = await runMarketTick();
    return NextResponse.json({
      paper: tick.paper,
      tokens: tick.tokens,
      health: tick.health,
      solUsd: tick.solUsd,
      lastTickAt: Date.now(),
    });
  }
  const tokens = state.lastSnapshots.map((token) => ({
    token,
    report: scoreToken(token, Date.now(), state.settings),
  }));
  return NextResponse.json({
    paper: publicBook(state.paper),
    tokens,
    health: state.feedHealth,
    lastTickAt: state.lastTickAt,
  });
}
