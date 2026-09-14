import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { runBacktest, slimBacktest, type BacktestTape } from "../src/lib/pair/backtest";
import { loadBacktestTape, loadBacktestTapeLong, sliceTapeDays } from "../src/lib/pair/backtestTape";
import { mutateState } from "../src/lib/store";
import type { BacktestReport, BacktestWindow } from "../src/lib/types";
import type { Lev } from "../src/lib/leverage";

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

function fileFor(window: BacktestWindow, lev: Lev): string {
  if (window === "1m") return lev === 1 ? "backtestSeed.json" : `backtestSeedLev${lev}.json`;
  if (lev === 1) return window === "3m" ? "backtestSeed3m.json" : "backtestSeed6m.json";
  return window === "3m" ? `backtestSeed3mLev${lev}.json` : `backtestSeed6mLev${lev}.json`;
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

  let long: BacktestTape | null = null;
  try {
    long = await loadBacktestTapeLong(190);
    console.log(`long sol=${long.sol.length} spy=${long.spy.length} qqq=${long.qqq.length} gld=${long.gld.length}`);
  } catch (e) {
    console.warn("long tape failed", e instanceof Error ? e.message : e);
  }

  const jobs: { window: BacktestWindow; lev: Lev; tape: BacktestTape; label: string }[] = [];
  for (const lev of [1, 2, 3] as const) {
    jobs.push({ window: "1m", lev, tape: short, label: "1 month · 15m clips · fees in" });
  }
  const mid = long && long.sol.length > 200 && long.spy.length > 80 ? sliceTapeDays(long, 95) : short;
  const far = long && long.sol.length > 200 && long.spy.length > 80 ? long : short;
  const midLabel = far === short ? "3 months · 15m clips · fees in" : "3 months · 1h clips · fees in";
  const farLabel = far === short ? "6 months · 15m clips · fees in" : "6 months · 1h clips · fees in";
  for (const lev of [1, 2, 3] as const) {
    jobs.push({ window: "3m", lev, tape: mid, label: midLabel });
    jobs.push({ window: "6m", lev, tape: far, label: farLabel });
  }

  const written: Partial<Record<BacktestWindow, Record<1 | 2 | 3, BacktestReport>>> = {};
  for (const job of jobs) {
    if (job.tape.sol.length < 120 || job.tape.spy.length < 80) continue;
    const report = compact(
      runBacktest(job.tape, 1000, job.lev, { window: job.window, horizonLabel: job.label }),
    );
    const name = fileFor(job.window, job.lev);
    writeFileSync(path.join(dir, name), JSON.stringify(report));
    logReport(name, report);
    if (!written[job.window]) written[job.window] = {} as Record<1 | 2 | 3, BacktestReport>;
    written[job.window]![job.lev] = report;
  }

  await mutateState((s) => {
    if (written["1m"]?.[1]) s.backtest = written["1m"][1];
    if (written["1m"]?.[2]) s.backtestLev2 = written["1m"][2];
    if (written["1m"]?.[3]) s.backtestLev3 = written["1m"][3];
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
