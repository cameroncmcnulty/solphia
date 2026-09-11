import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { runBacktest, slimBacktest, type BacktestTape } from "../src/lib/pair/backtest";
import { loadBacktestTape } from "../src/lib/pair/backtestTape";
import { mutateState } from "../src/lib/store";
import type { BacktestReport } from "../src/lib/types";

function compact(report: BacktestReport): BacktestReport {
  const slim = slimBacktest(report);
  if (!slim) throw new Error("empty report");
  return { ...slim, fills: (slim.fills || []).slice(-40) };
}

async function loadTape(): Promise<BacktestTape> {
  const cached = path.join(process.cwd(), "data", "backtest-tape.json");
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, "utf8")) as BacktestTape;
  return loadBacktestTape();
}

async function main() {
  const tape: BacktestTape = await loadTape();
  console.log(`tape sol=${tape.sol.length} spy=${tape.spy.length} qqq=${tape.qqq.length} gld=${tape.gld.length}`);
  if (tape.sol.length < 120 || tape.spy.length < 80) {
    throw new Error("Not enough history to seed backtests.");
  }
  const dir = path.join(process.cwd(), "src/lib/pair");
  const reports: Record<1 | 2 | 3, BacktestReport> = {
    1: compact(runBacktest(tape, 1000, 1)),
    2: compact(runBacktest(tape, 1000, 2)),
    3: compact(runBacktest(tape, 1000, 3)),
  };
  for (const lev of [1, 2, 3] as const) {
    const report = reports[lev];
    const name = lev === 1 ? "backtestSeed.json" : `backtestSeedLev${lev}.json`;
    writeFileSync(path.join(dir, name), JSON.stringify(report));
    console.log(
      `${name} lev=${report.leverage} pnl=${(report.pnlPct * 100).toFixed(2)}% clips=${report.trades} liq=${report.liquidations || 0} dd=${(report.maxDdPct * 100).toFixed(1)}%`,
    );
  }
  await mutateState((s) => {
    s.backtest = reports[1];
    s.backtestLev2 = reports[2];
    s.backtestLev3 = reports[3];
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
