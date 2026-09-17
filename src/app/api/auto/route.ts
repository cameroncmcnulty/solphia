import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { loadState, readyState, mutateTrader, loadTrader, touchHot, setLiveOwner, saveOps } from "@/lib/store";
import { emptyTrader, bankrollUsd, maybeResizeBook, lockedAuto, ARM_V } from "@/lib/auto";
import { publicBook } from "@/lib/tick";
import { liveTradingEnabled } from "@/lib/liveFlag";
import { liveSeatOk, levSeatOk } from "@/lib/access";
import { leverageUnlocked } from "@/lib/leverage";
import { publicMind } from "@/lib/mind/engine";
import { killBook, unkilled, flattenToUsdc, applyPairDecision } from "@/lib/pair/paper";
import { loadPairPrices } from "@/lib/pair/prices";
import { decisionFromIntent } from "@/lib/live/fill";
import { fillLiveIntent } from "@/lib/live/execute";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || "";
  if (!isSolanaAddress(owner)) return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  const state = await readyState();
  const trader = state.traders[owner] || (await loadTrader(owner));
  if (!trader) {
    return NextResponse.json({
      auto: lockedAuto({ armed: false }),
      tradingPubkey: null,
      depositedSol: 0,
      paper: publicBook(emptyTrader(owner).book),
      mind: publicMind(state.mind),
      liveTrading: liveTradingEnabled(),
      liveDelegate: false,
    });
  }
  const prevHot = state.hotAt?.[owner] || 0;
  touchHot(state, owner);
  if (Date.now() - prevHot > 20_000) await saveOps(state);
  const auto = lockedAuto({
    ...trader.auto,
    mode: "live",
    armed: trader.book.killed ? false : Boolean(trader.auto.armed),
    armV: trader.auto.armV,
    tradingPubkey: trader.auto.tradingPubkey,
    armedAt: trader.auto.armedAt,
    liveDelegate: trader.auto.liveDelegate,
  });
  if (trader.book.killed) auto.armed = false;
  return NextResponse.json({
    auto,
    tradingPubkey: trader.tradingPubkey || null,
    depositedSol: trader.depositedSol,
    paper: publicBook(trader.book),
    mind: publicMind(state.mind),
    liveTrading: liveTradingEnabled(),
    liveDelegate: Boolean(auto.liveDelegate),
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
      leverage: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
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
  let armBlock: string | null = null;
  const trader = await mutateTrader(parsed.data.owner, async (t, s) => {
    const wasArmed = Boolean(t.auto?.armed) && Number(t.auto?.armV || 0) >= ARM_V;
    if (parsed.data.depositedSol != null) t.depositedSol = parsed.data.depositedSol;
    const keepArmed = Boolean(t.auto.armed) && Number(t.auto.armV || 0) >= ARM_V;
    const wantArmed =
      parsed.data.auto?.armed === true ? true : parsed.data.auto?.armed === false ? false : keepArmed;
    const funded = (t.depositedSol || 0) > 0.001;
    const seat = liveSeatOk(s, parsed.data.owner);
    const canArm = liveTradingEnabled() && seat && funded && !t.book.killed;
    if (parsed.data.auto?.armed === true && !canArm) {
      armBlock = !liveTradingEnabled() ? "live_paused" : !seat ? "need_seat" : !funded ? "need_sol" : "killed";
    }
    const wantLev = parsed.data.auto?.leverage;
    const levAllowed = leverageUnlocked({
      mode: "live",
      levSeat: levSeatOk(s, parsed.data.owner),
      founder: false,
    });
    t.auto = lockedAuto({
      ...t.auto,
      mode: "live",
      armed: Boolean(canArm && wantArmed),
      armV: canArm && wantArmed ? ARM_V : 0,
      tradingPubkey: t.auto.tradingPubkey,
      liveDelegate: t.auto.liveDelegate,
      armedAt: t.auto.armedAt,
      leverage: wantLev === 2 || wantLev === 3 ? (levAllowed ? wantLev : 1) : t.auto.leverage,
    });
    if (!levSeatOk(s, parsed.data.owner) && t.auto.leverage !== 1) {
      t.auto.leverage = 1;
    }
    if (t.auto.armed && !wasArmed) {
      t.auto.armedAt = Date.now();
      if (t.book.killed) unkilled(t.book);
    }
    if (!t.auto.armed) t.auto.armedAt = undefined;
    setLiveOwner(s, parsed.data.owner, t.auto.armed && !t.book.killed);
    touchHot(s, parsed.data.owner);
    if (parsed.data.tradingPubkey) t.tradingPubkey = parsed.data.tradingPubkey;
    t.book = maybeResizeBook(t.book, bankrollUsd(t.depositedSol, solUsd || 100));
    if (!t.book.pair) t.book.pair = { solQty: 0, spyxQty: 0, qqqxQty: 0, gldxQty: 0, usdcQty: t.book.cashUsd };
    else {
      t.book.pair.qqqxQty = t.book.pair.qqqxQty || 0;
      t.book.pair.gldxQty = t.book.pair.gldxQty || 0;
    }
    if (prices && parsed.data.liveFill && t.book.pendingIntent) {
      applyPairDecision(t.book, decisionFromIntent(t.book.pendingIntent, parsed.data.liveFill.signature), prices, Date.now(), s.mind);
    }
    if (prices && (parsed.data.kill || parsed.data.flatten)) {
      if (t.auto.liveDelegate && t.auto.mode === "live" && !parsed.data.liveFill) {
        t.book.pendingIntent = {
          action: "flatten",
          from: "both",
          to: "USDC",
          clipUsd: t.book.equityUsd || 0,
          reason: parsed.data.kill ? "Kill switch." : "Operator flatten to USDC.",
          at: Date.now(),
        };
        await fillLiveIntent(t, prices, Date.now(), s.mind);
      }
      if (parsed.data.kill) {
        killBook(t.book, prices, Date.now(), s.mind);
        t.auto.armed = false;
        t.auto.armedAt = undefined;
      } else {
        flattenToUsdc(t.book, prices, Date.now(), "Operator flatten to USDC.", s.mind);
      }
    }
    t.updatedAt = Date.now();
    return t;
  });
  const autoOut = lockedAuto({
    ...trader.auto,
    mode: trader.auto.mode,
    armed: trader.auto.armed,
    armV: trader.auto.armV,
    tradingPubkey: trader.auto.tradingPubkey,
    liveDelegate: trader.auto.liveDelegate,
    armedAt: trader.auto.armedAt,
  });
  if (trader.book.killed) autoOut.armed = false;
  if (armBlock) {
    return NextResponse.json(
      {
        ok: false,
        error: armBlock,
        auto: autoOut,
        tradingPubkey: trader.tradingPubkey || null,
        depositedSol: trader.depositedSol,
        paper: publicBook(trader.book),
        mind: publicMind(loadState().mind),
        liveTrading: liveTradingEnabled(),
        liveDelegate: Boolean(autoOut.liveDelegate),
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    auto: autoOut,
    tradingPubkey: trader.tradingPubkey || null,
    depositedSol: trader.depositedSol,
    paper: publicBook(trader.book),
    mind: publicMind(loadState().mind),
    liveTrading: liveTradingEnabled(),
    liveDelegate: Boolean(autoOut.liveDelegate),
  });
}
