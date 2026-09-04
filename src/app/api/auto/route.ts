import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { loadState, mutateState } from "@/lib/store";
import { DEFAULT_AUTO, emptyTrader, bankrollUsd, maybeResizeBook } from "@/lib/auto";
import { publicBook } from "@/lib/tick";
import { LIVE_TRADING } from "@/lib/config";
import { publicMind } from "@/lib/mind/engine";
import { killBook, unkilled, flattenToUsdc, applyPairDecision } from "@/lib/pair/paper";
import { loadPairPrices } from "@/lib/pair/prices";
import type { PairDecision } from "@/lib/pair/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || "";
  if (!isSolanaAddress(owner)) return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  const state = loadState();
  const trader = state.traders[owner] || emptyTrader(owner);
  return NextResponse.json({
    auto: { ...DEFAULT_AUTO, ...trader.auto, leverage: 1 },
    tradingPubkey: trader.tradingPubkey || null,
    depositedSol: trader.depositedSol,
    paper: publicBook(trader.book),
    mind: publicMind(state.mind),
    liveTrading: LIVE_TRADING,
  });
}

const Body = z.object({
  owner: z.string(),
  tradingPubkey: z.string().optional(),
  depositedSol: z.number().nonnegative().optional(),
  kill: z.boolean().optional(),
  flatten: z.boolean().optional(),
  liveFill: z
    .object({
      signature: z.string().min(32).max(128),
    })
    .optional(),
  auto: z
    .object({
      armed: z.boolean().optional(),
      mode: z.enum(["paper", "live"]).optional(),
      allocationPct: z.number().min(0.2).max(0.8).optional(),
      style: z.enum(["mean_revert", "hold_mix"]).optional(),
      band: z.enum(["tight", "normal", "wide"]).optional(),
      clipPct: z.number().min(0.05).max(0.35).optional(),
      cooldownMin: z.number().min(0).max(240).optional(),
      stopPct: z.number().min(0.03).max(0.25).optional(),
      takeProfitPct: z.number().min(0.04).max(0.5).optional(),
      targetSolPct: z.number().min(0.2).max(0.8).optional(),
      slippageBps: z.number().min(10).max(150).optional(),
      maxImpactPct: z.number().min(0.001).max(0.02).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":auto", 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.owner)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (parsed.data.tradingPubkey && !isSolanaAddress(parsed.data.tradingPubkey)) {
    return NextResponse.json({ error: "bad_trading_wallet" }, { status: 400 });
  }
  let prices = null;
  try {
    prices = await loadPairPrices();
  } catch {
    prices = null;
  }
  const solUsd = prices?.sol.usd || 0;
  const trader = await mutateState((s) => {
    const t = s.traders[parsed.data.owner] || emptyTrader(parsed.data.owner);
    const wasArmed = Boolean(t.auto?.armed);
    t.auto = { ...DEFAULT_AUTO, ...t.auto, ...(parsed.data.auto || {}), leverage: 1 };
    if (t.auto.armed && !wasArmed) {
      t.auto.armedAt = Date.now();
      if (t.book.killed) unkilled(t.book);
    }
    if (!t.auto.armed) t.auto.armedAt = undefined;
    if (t.auto.mode === "live" && !LIVE_TRADING) t.auto.mode = "paper";
    if (parsed.data.tradingPubkey) t.tradingPubkey = parsed.data.tradingPubkey;
    if (parsed.data.depositedSol != null) t.depositedSol = parsed.data.depositedSol;
    t.book = maybeResizeBook(t.book, bankrollUsd(t.depositedSol, solUsd || 100));
    if (!t.book.pair) t.book.pair = { solQty: 0, spyxQty: 0, usdcQty: t.book.cashUsd };
    if (prices && parsed.data.liveFill && t.book.pendingIntent) {
      const intent = t.book.pendingIntent;
      const stub = {
        ratio: 0,
        logR: 0,
        mean24: 0,
        mean7: 0,
        std24: 0,
        std7: 0,
        z24: 0,
        z7: 0,
        n24: 0,
        n7: 0,
      };
      const decision: PairDecision = {
        action: intent.action,
        reason: `${intent.reason} · ${parsed.data.liveFill.signature.slice(0, 8)}`,
        clipUsd: intent.clipUsd,
        from: intent.from as PairDecision["from"],
        to: intent.to as PairDecision["to"],
        z7: 0,
        z24: 0,
        ratio: 0,
        bandK: 0,
        session: "cash",
        read: stub,
        solPct: intent.solPct,
      };
      applyPairDecision(t.book, decision, prices, Date.now(), s.mind);
    }
    if (prices && (parsed.data.kill || parsed.data.flatten)) {
      if (parsed.data.kill) {
        killBook(t.book, prices, Date.now(), s.mind);
        t.auto.armed = false;
        t.auto.armedAt = undefined;
      } else {
        flattenToUsdc(t.book, prices, Date.now(), "Operator flatten to USDC.", s.mind);
      }
    }
    t.updatedAt = Date.now();
    s.traders[parsed.data.owner] = t;
    return t;
  });
  return NextResponse.json({
    ok: true,
    auto: { ...DEFAULT_AUTO, ...trader.auto, leverage: 1 },
    tradingPubkey: trader.tradingPubkey || null,
    depositedSol: trader.depositedSol,
    paper: publicBook(trader.book),
    mind: publicMind(loadState().mind),
    liveTrading: LIVE_TRADING,
  });
}
