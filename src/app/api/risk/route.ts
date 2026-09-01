import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { loadState } from "@/lib/store";
import { scoreToken } from "@/lib/risk/engine";
import { ingestMarket } from "@/lib/feeds";

export const dynamic = "force-dynamic";

const Body = z.object({ mint: z.string() });

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":risk", 40, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.mint)) {
    return NextResponse.json({ error: "bad_mint" }, { status: 400 });
  }
  const state = loadState();
  let token = state.lastSnapshots.find((t) => t.mint === parsed.data.mint);
  if (!token) {
    const live = await ingestMarket(state.creators);
    token = live.tokens.find((t) => t.mint === parsed.data.mint);
  }
  if (!token) return NextResponse.json({ error: "unknown_mint" }, { status: 404 });
  return NextResponse.json({ token, report: scoreToken(token, Date.now(), state.settings) });
}
