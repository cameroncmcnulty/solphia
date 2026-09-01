import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { emptyState, loadState, mutateState } from "@/lib/store";
import { publicBook } from "@/lib/tick";
import { closePosition, openPaperBuy } from "@/lib/paper/engine";
import { scoreToken } from "@/lib/risk/engine";
import { ingestMarket } from "@/lib/feeds";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["buy", "sell", "reset"]),
  mint: z.string().optional(),
  strategy: z.enum(["launch_snipe", "migration_snipe", "copy_trade", "scalp"]).optional(),
});

export async function GET() {
  const state = loadState();
  return NextResponse.json(publicBook(state.paper));
}

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":paper", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (parsed.data.action === "reset") {
    await mutateState((s) => {
      s.paper = emptyState().paper;
    });
    return NextResponse.json({ ok: true, paper: publicBook(loadState().paper) });
  }

  const mint = sanitizeText(parsed.data.mint || "", 64);
  if (!isSolanaAddress(mint)) return NextResponse.json({ error: "bad_mint" }, { status: 400 });

  const state = loadState();
  let token = state.lastSnapshots.find((t) => t.mint === mint);
  if (!token) {
    const live = await ingestMarket(state.creators);
    token = live.tokens.find((t) => t.mint === mint);
  }
  if (!token) return NextResponse.json({ error: "unknown_mint" }, { status: 404 });

  if (parsed.data.action === "buy") {
    const report = scoreToken(token, Date.now(), state.settings);
    if (report.vetoed) return NextResponse.json({ error: "vetoed", report }, { status: 400 });
    const strategy = parsed.data.strategy || report.allowedStrategies[0] || "scalp";
    const fill = await mutateState((s) =>
      openPaperBuy({ state: s, token, strategy, score: report.score, reason: "manual" }),
    );
    if (!fill) return NextResponse.json({ error: "cannot_open" }, { status: 400 });
    return NextResponse.json({ ok: true, fill, paper: publicBook(loadState().paper), report });
  }

  const pos = state.paper.positions.find((p) => p.mint === mint);
  if (!pos) return NextResponse.json({ error: "no_position" }, { status: 404 });
  await mutateState((s) => {
    const live = s.paper.positions.find((p) => p.mint === mint);
    if (live) closePosition({ state: s, pos: live, price: live.markUsd, reason: "manual" });
  });
  return NextResponse.json({ ok: true, paper: publicBook(loadState().paper) });
}
