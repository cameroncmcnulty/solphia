import { readFileSync, existsSync } from "fs";
import path from "path";
import { runBacktest, type BacktestTape } from "../src/lib/pair/backtest";

function loadTape(): BacktestTape {
  const file = path.join(process.cwd(), "data", "backtest-tape.json");
  if (!existsSync(file)) throw new Error("Run cache-backtest-tape.ts first");
  return JSON.parse(readFileSync(file, "utf8")) as BacktestTape;
}

function summarize(lev: 1 | 2 | 3) {
  const tape = loadTape();
  const r = runBacktest(tape, 1000, lev);
  const months = (r.monthly || []).map((m) => `${m.ym} ${m.pnlUsd >= 0 ? "+" : ""}${m.pnlUsd.toFixed(0)} (${((m.pnlUsd / 1000) * 100).toFixed(1)}%)`);
  const bestMonth = [...(r.monthly || [])].sort((a, b) => b.pnlUsd - a.pnlUsd)[0];
  return {
    lev,
    pnlPct: +(r.pnlPct * 100).toFixed(2),
    trades: r.trades,
    wins: r.wins,
    losses: r.losses,
    winRate: +((r.winRate || 0) * 100).toFixed(1),
    fees: r.feesUsd,
    dd: +((r.maxDdPct || 0) * 100).toFixed(2),
    ending: r.endingUsd,
    days: r.horizon,
    sleeves: r.sleeves,
    months,
    bestMonthPct: bestMonth ? +((bestMonth.pnlUsd / 1000) * 100).toFixed(2) : 0,
    bestMonth: bestMonth?.ym,
  };
}

const lev = (Number(process.argv[2]) || 1) as 1 | 2 | 3;
console.log(JSON.stringify(summarize(lev === 2 || lev === 3 ? lev : 1), null, 2));
