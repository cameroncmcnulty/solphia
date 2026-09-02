import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { loadState } from "@/lib/store";
import { runMarketTick, publicBook } from "@/lib/tick";
import { scoreToken } from "@/lib/risk/engine";
import { publicMind } from "@/lib/mind/engine";

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
      lab: loadState().lab,
      mind: publicMind(loadState().mind),
      lastTickAt: Date.now(),
      sol: tick.sol,
    });
  }
  const tokens = state.lastSnapshots.map((token) => ({
    token,
    report: scoreToken(token, Date.now(), state.settings),
  }));
  const { readSolDesk } = await import("@/lib/sol/paper");
  let sol = null;
  try {
    sol = await readSolDesk(state.paper);
  } catch {
    sol = null;
  }
  return NextResponse.json({
    paper: publicBook(state.paper),
    tokens,
    health: state.feedHealth,
    lab: state.lab,
    mind: publicMind(state.mind),
    lastTickAt: state.lastTickAt,
    sol,
  });
}
