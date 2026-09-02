import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit, sanitizeText } from "@/lib/security";
import { emptyState, loadState, mutateState } from "@/lib/store";
import { publicBook } from "@/lib/tick";
import { closePosition, openPaperBuy } from "@/lib/paper/engine";
import { positionSizeUsd, scoreToken } from "@/lib/risk/engine";
import { ingestMarket } from "@/lib/feeds";
import { decide } from "@/lib/desk/consensus";
import { applyShadow, emptyLab, noteDenial } from "@/lib/desk/shadow";
import { LIVE_TRADING } from "@/lib/config";

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
      const fresh = emptyState();
      s.paper = fresh.paper;
      s.lab = fresh.lab;
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
    const now = Date.now();
    const report = scoreToken(token, now, state.settings);
    if (report.vetoed) return NextResponse.json({ error: "vetoed", report }, { status: 400 });
    const strategy = parsed.data.strategy || report.allowedStrategies[0];
    if (!strategy || !report.allowedStrategies.includes(strategy)) {
      return NextResponse.json({ error: "refused", report }, { status: 400 });
    }
    const fill = await mutateState((s) => {
      if (!s.lab) s.lab = emptyLab();
      const size = Math.min(positionSizeUsd(s.paper.equityUsd, report.score, s.settings), s.paper.cashUsd * 0.95);
      const d = decide({
        token,
        report,
        desks: {
          copy: strategy === "copy_trade",
          launch: strategy === "launch_snipe",
          migrate: strategy === "migration_snipe",
          scalp: false,
        },
        now,
        settings: s.settings,
        book: s.paper,
        sizeUsd: Math.max(size, 8),
        lab: s.lab,
        live: LIVE_TRADING,
      });
      if (!d.ok) {
        if (d.kind) noteDenial(s.lab, d.kind);
        return null;
      }
      const opened = openPaperBuy({
        state: s,
        token,
        strategy: d.hit.strategy,
        score: report.score,
        reason: d.intent.reason,
        now,
        sizeUsd: d.intent.sizeUsd,
      });
      if (opened) applyShadow(s.lab, opened, s.paper.startingUsd, now);
      return opened;
    });
    if (!fill) return NextResponse.json({ error: "refused", report }, { status: 400 });
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
