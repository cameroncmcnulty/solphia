import { existsSync, readFileSync } from "fs";
import path from "path";
import { runBacktest, type BacktestTape } from "../src/lib/pair/backtest";
import { loadBacktestTapeLong, sliceTapeDays } from "../src/lib/pair/backtestTape";

async function tape(): Promise<{ mid: BacktestTape; far: BacktestTape }> {
  const cached = path.join(process.cwd(), "data", "backtest-tape-long.json");
  let long: BacktestTape;
  if (existsSync(cached)) long = JSON.parse(readFileSync(cached, "utf8"));
  else long = await loadBacktestTapeLong(190);
  return { mid: sliceTapeDays(long, 95), far: long };
}

async function main() {
  const { mid, far } = await tape();
  for (const [name, t] of [["3m", mid], ["6m", far]] as const) {
    for (const lev of [2, 3] as const) {
      for (const cd of [60, 120, 180, 240]) {
        const r = runBacktest(t, 1000, lev, { cooldownMin: cd, window: name });
        console.log(
          JSON.stringify({
            name,
            lev,
            cd,
            pnl: +((r.pnlPct || 0) * 100).toFixed(2),
            clips: r.trades,
            wr: +(((r.winRate || 0) * 100).toFixed(0)),
            dd: +(((r.maxDdPct || 0) * 100).toFixed(1)),
            liq: r.liquidations || 0,
          }),
        );
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
