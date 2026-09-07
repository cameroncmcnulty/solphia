import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { buildAdminDesk } from "@/lib/admin/desk";
import { generatePromoPack, settlePendingPromo } from "@/lib/admin/promo";
import { grantFounder, revokeFounder } from "@/lib/access";
import { isSolanaAddress, clientIp } from "@/lib/security";
import { emptyBook } from "@/lib/auto";
import { runBacktest } from "@/lib/pair/backtest";
import { loadBacktestTape } from "@/lib/pair/backtestTape";
import { mutateState, audit, pushBounded, readyState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  await readyState();
  try {
    await settlePendingPromo(0);
  } catch {
    /* still serve the desk */
  }
  return NextResponse.json(buildAdminDesk());
}

const Patch = z.object({
  adminWallet: z.string().optional(),
  removeAdminWallet: z.string().optional(),
  treasuryWallet: z.string().nullable().optional(),
  liveTrading: z.boolean().optional(),
  generatePromo: z.boolean().optional(),
  contentHint: z.string().max(280).optional(),
  resetPaper: z.boolean().optional(),
  runBacktest: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;
  const ip = clientIp(req);

  if (body.adminWallet) {
    if (!isSolanaAddress(body.adminWallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    await mutateState((s) => {
      grantFounder(s, body.adminWallet!);
      pushBounded(s.audit, audit("admin", "admin_wallet", body.adminWallet!, ip), 400);
    });
  }
  if (body.removeAdminWallet) {
    if (!isSolanaAddress(body.removeAdminWallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    await mutateState((s) => {
      revokeFounder(s, body.removeAdminWallet!);
      pushBounded(s.audit, audit("admin", "admin_wallet_remove", body.removeAdminWallet!, ip), 400);
    });
  }
  if (body.treasuryWallet !== undefined) {
    const next = (body.treasuryWallet || "").trim();
    if (next && !isSolanaAddress(next)) return NextResponse.json({ error: "bad_treasury" }, { status: 400 });
    await mutateState((s) => {
      s.treasuryWallet = next;
      pushBounded(s.audit, audit("admin", "treasury", next ? next : "cleared", ip), 400);
    });
  }
  if (typeof body.liveTrading === "boolean") {
    await mutateState((s) => {
      s.liveTrading = body.liveTrading;
      pushBounded(s.audit, audit("admin", "live_flag", String(body.liveTrading), ip), 400);
    });
  }
  if (body.runBacktest) {
    try {
      const tape = await loadBacktestTape();
      if (tape.sol.length < 120 || tape.spy.length < 80) {
        return NextResponse.json({ error: "Not enough history to backtest.", desk: buildAdminDesk() }, { status: 400 });
      }
      const report = runBacktest(tape);
      await mutateState((s) => {
        s.backtest = report;
        pushBounded(s.audit, audit("admin", "backtest", `${(report.pnlPct * 100).toFixed(1)}% · ${report.trades} clips`, ip), 400);
      });
      return NextResponse.json({
        ok: true,
        note: `Backtest ${(report.pnlPct * 100).toFixed(1)}% after fees · ${report.trades} clips · ${report.horizon}`,
        desk: buildAdminDesk(),
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Backtest failed.", desk: buildAdminDesk() },
        { status: 400 },
      );
    }
  }
  if (body.resetPaper) {
    await mutateState((s) => {
      const start = s.paper?.startingUsd || 1000;
      s.paper = emptyBook(start);
      for (const t of Object.values(s.traders || {})) {
        if (t.auto?.mode === "live") continue;
        t.book = emptyBook(t.book?.startingUsd || start);
        t.auto = { ...t.auto, armedAt: Date.now(), armed: true };
      }
      pushBounded(s.audit, audit("admin", "paper_reset", "new paper session", ip), 400);
    });
    return NextResponse.json({ ok: true, note: "Paper session restarted.", desk: buildAdminDesk() });
  }
  if (body.generatePromo) {
    const result = await generatePromoPack({ force: true, hint: body.contentHint });
    if (result.error && result.made === 0) {
      return NextResponse.json({ error: result.error, note: result.note, desk: buildAdminDesk() }, { status: 400 });
    }
    return NextResponse.json({ ok: true, made: result.made, note: result.note, desk: buildAdminDesk() });
  }
  return NextResponse.json({ ok: true, desk: buildAdminDesk() });
}
