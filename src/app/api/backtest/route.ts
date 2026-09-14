import { NextResponse } from "next/server";
import { latestBacktest, publicBacktest } from "@/lib/pair/backtest";
import { loadAllTraders, readyState } from "@/lib/store";
import { publicBook } from "@/lib/tick";
import { isFounder } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readyState();
  await loadAllTraders(s);
  const reports = {
    1: publicBacktest(latestBacktest(s.backtest, 1)),
    2: publicBacktest(latestBacktest(s.backtestLev2, 2)),
    3: publicBacktest(latestBacktest(s.backtestLev3, 3)),
  };
  const liveTrader = Object.values(s.traders || {}).find((t) => isFounder(s, t.owner) && t.auto?.mode === "live");
  const liveBook = liveTrader ? publicBook(liveTrader.book) : null;
  return NextResponse.json({
    reports,
    ...reports[1],
    live:
      s.publishLiveWallet && liveBook
        ? {
            on: true,
            equityUsd: liveBook.equityUsd,
            pnlPct: liveBook.pnlPct,
            trades: liveBook.trades,
            leverage: liveTrader?.auto?.leverage || 1,
            lastAction: liveBook.lastAction,
            curve: liveBook.curve,
          }
        : { on: false },
  });
}
