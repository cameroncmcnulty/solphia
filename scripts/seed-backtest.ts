import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { runBacktest, slimBacktest, type BacktestTape } from "../src/lib/pair/backtest";
import { loadBacktestTape, loadBacktestTapeLong, sliceTapeDays } from "../src/lib/pair/backtestTape";
import { mutateState } from "../src/lib/store";
import type { BacktestReport, BacktestWindow } from "../src/lib/types";

function compact(report: BacktestReport): BacktestReport {
  const slim = slimBacktest(report);
  if (!slim) throw new Error("empty report");
  return { ...slim, fills: (slim.fills || []).slice(-40) };
}

function logReport(name: string, report: BacktestReport) {
  console.log(
    `${name} lev=${report.leverage} win=${report.window || "-"} pnl=${(report.pnlPct * 100).toFixed(2)}% clips=${report.trades} wr=${((report.winRate || 0) * 100).toFixed(0)}% liq=${report.liquidations || 0} dd=${(report.maxDdPct * 100).toFixed(1)}%`,
  );
}

async function loadShort(): Promise<BacktestTape> {
  const cached = path.join(process.cwd(), "data", "backtest-tape.json");
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, "utf8")) as BacktestTape;
  return loadBacktestTape();
}

async function main() {
  const short = await loadShort();
  console.log(`short sol=${short.sol.length} spy=${short.spy.length} qqq=${short.qqq.length} gld=${short.gld.length}`);
  if (short.sol.length < 120 || short.spy.length < 80) {
    throw new Error("Not enough history to seed backtests.");
  }
  const dir = path.join(process.cwd(), "src/lib/pair");
  const reports: Record<1 | 2 | 3, BacktestReport> = {
    1: compact(runBacktest(short, 1000, 1, { window: "1m", horizonLabel: "1 month · 15m clips · fees in" })),
    2: compact(runBacktest(short, 1000, 2)),
    3: compact(runBacktest(short, 1000, 3)),
  };
  for (const lev of [1, 2, 3] as const) {
    const report = reports[lev];
    const name = lev === 1 ? "backtestSeed.json" : `backtestSeedLev${lev}.json`;
    writeFileSync(path.join(dir, name), JSON.stringify(report));
    logReport(name, report);
  }

  let long: BacktestTape | null = null;
  try {
    long = await loadBacktestTapeLong(190);
    console.log(`long sol=${long.sol.length} spy=${long.spy.length} qqq=${long.qqq.length} gld=${long.gld.length}`);
  } catch (e) {
    console.warn("long tape failed", e instanceof Error ? e.message : e);
  }

  const windows: { key: BacktestWindow; days: number; label: string; tape: BacktestTape }[] = [
    { key: "1m", days: 32, label: "1 month · 15m clips · fees in", tape: short },
  ];
  if (long && long.sol.length > 200 && long.spy.length > 80) {
    windows.push(
      { key: "3m", days: 95, label: "3 months · 1h clips · fees in", tape: sliceTapeDays(long, 95) },
      { key: "6m", days: 190, label: "6 months · 1h clips · fees in", tape: long },
    );
  } else {
    windows.push(
      { key: "3m", days: 32, label: "3 months · 15m clips · fees in", tape: short },
      { key: "6m", days: 32, label: "6 months · 15m clips · fees in", tape: short },
    );
  }

  const windowReports: Partial<Record<BacktestWindow, BacktestReport>> = { "1m": reports[1] };
  for (const w of windows) {
    if (w.key === "1m") continue;
    if (w.tape.sol.length < 120 || w.tape.spy.length < 80) continue;
    const report = compact(
      runBacktest(w.tape, 1000, 1, { window: w.key, horizonLabel: w.label }),
    );
    windowReports[w.key] = report;
    const name = w.key === "3m" ? "backtestSeed3m.json" : "backtestSeed6m.json";
    writeFileSync(path.join(dir, name), JSON.stringify(report));
    logReport(name, report);
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
