import { NextResponse } from "next/server";
import { latestBacktest, latestHorizon, publicBacktest } from "@/lib/pair/backtest";
import { loadAllTraders, readyState } from "@/lib/store";
import { publicBook } from "@/lib/tick";
import { isFounder } from "@/lib/access";

export const dynamic = "force-dynamic";

function windowPack(
  window: "1m" | "3m" | "6m",
  stored1?: Parameters<typeof latestHorizon>[2],
  stored2?: Parameters<typeof latestHorizon>[2],
  stored3?: Parameters<typeof latestHorizon>[2],
) {
  return {
    1: publicBacktest(latestHorizon(window, 1, window === "1m" ? stored1 : undefined)),
    2: publicBacktest(latestHorizon(window, 2, window === "1m" ? stored2 : undefined)),
    3: publicBacktest(latestHorizon(window, 3, window === "1m" ? stored3 : undefined)),
  };
}

export async function GET() {
  const s = await readyState();
  await loadAllTraders(s);
  const reports = {
    1: publicBacktest(latestBacktest(s.backtest, 1)),
    2: publicBacktest(latestBacktest(s.backtestLev2, 2)),
    3: publicBacktest(latestBacktest(s.backtestLev3, 3)),
  };
  const windows = {
    "1m": windowPack("1m", s.backtest, s.backtestLev2, s.backtestLev3),
    "3m": windowPack("3m"),
    "6m": windowPack("6m"),
  };
  const liveTrader = Object.values(s.traders || {}).find((t) => isFounder(s, t.owner) && t.auto?.mode === "live");
  const liveBook = liveTrader ? publicBook(liveTrader.book) : null;
  return NextResponse.json({
    reports,
    windows,
    ...windows["1m"][1],
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
