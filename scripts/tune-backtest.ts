import { existsSync, readFileSync } from "fs";
import path from "path";
import { runBacktest, type BacktestTape } from "../src/lib/pair/backtest";
import { loadBacktestTape } from "../src/lib/pair/backtestTape";

function loadTape(): BacktestTape {
  const file = path.join(process.cwd(), "data", "backtest-tape.json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as BacktestTape;
  throw new Error("no cached tape");
}

function score(r: { pnlPct: number; winRate: number; trades: number; maxDdPct: number }) {
  const wr = r.winRate || 0;
  const dd = r.maxDdPct || 0;
  const clips = r.trades || 0;
  let s = r.pnlPct * 100;
  if (r.pnlPct <= 0) s -= 20;
  if (wr < 0.5) s -= 8;
  if (dd > 0.18) s -= (dd - 0.18) * 80;
  if (clips < 6) s -= 6;
  if (clips > 80) s -= 4;
  return s;
}

async function main() {
  let tape: BacktestTape;
  try {
    tape = loadTape();
  } catch {
    tape = await loadBacktestTape();
  }
  console.log(`tape sol=${tape.sol.length} spy=${tape.spy.length}`);
  const cooldowns = [15, 30, 45, 60, 90, 120, 240];
  const rows = [];
  for (const cd of cooldowns) {
    const r = runBacktest(tape, 1000, 1, { cooldownMin: cd });
    const row = {
      cooldownMin: cd,
      pnlPct: +((r.pnlPct || 0) * 100).toFixed(2),
      trades: r.trades,
      wr: +(((r.winRate || 0) * 100).toFixed(1)),
      dd: +(((r.maxDdPct || 0) * 100).toFixed(2)),
      fees: r.feesUsd,
      ending: r.endingUsd,
      score: +score(r).toFixed(2),
    };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  rows.sort((a, b) => b.score - a.score);
  console.log("best", JSON.stringify(rows[0]));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
