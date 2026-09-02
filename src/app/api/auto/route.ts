import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { loadState, mutateState } from "@/lib/store";
import { DEFAULT_AUTO, emptyTrader, bankrollUsd, maybeResizeBook } from "@/lib/auto";
import { publicBook } from "@/lib/tick";
import { solPriceUsd } from "@/lib/feeds";
import { LIVE_TRADING } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || "";
  if (!isSolanaAddress(owner)) return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  const state = loadState();
  const trader = state.traders[owner] || emptyTrader(owner);
  return NextResponse.json({
    auto: trader.auto,
    tradingPubkey: trader.tradingPubkey || null,
    depositedSol: trader.depositedSol,
    paper: publicBook(trader.book),
    lab: loadState().lab,
    liveTrading: LIVE_TRADING,
  });
}

const Body = z.object({
  owner: z.string(),
  tradingPubkey: z.string().optional(),
  depositedSol: z.number().nonnegative().optional(),
  auto: z
    .object({
      armed: z.boolean().optional(),
      mode: z.enum(["paper", "live"]).optional(),
      copy: z.boolean().optional(),
      launch: z.boolean().optional(),
      migrate: z.boolean().optional(),
      scalp: z.boolean().optional(),
      maxSolPerTrade: z.number().positive().max(50).optional(),
      minScore: z.number().min(50).max(95).optional(),
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
  const solUsd = await solPriceUsd();
  const trader = await mutateState((s) => {
    const t = s.traders[parsed.data.owner] || emptyTrader(parsed.data.owner);
    t.auto = { ...DEFAULT_AUTO, ...t.auto, ...(parsed.data.auto || {}) };
    if (t.auto.mode === "live" && !LIVE_TRADING) t.auto.mode = "paper";
    if (parsed.data.tradingPubkey) t.tradingPubkey = parsed.data.tradingPubkey;
    if (parsed.data.depositedSol != null) t.depositedSol = parsed.data.depositedSol;
    t.book = maybeResizeBook(t.book, bankrollUsd(t.depositedSol, solUsd));
    t.updatedAt = Date.now();
    s.traders[parsed.data.owner] = t;
    return t;
  });
  return NextResponse.json({
    ok: true,
    auto: trader.auto,
    tradingPubkey: trader.tradingPubkey || null,
    depositedSol: trader.depositedSol,
    paper: publicBook(trader.book),
    lab: loadState().lab,
    liveTrading: LIVE_TRADING,
  });
}
