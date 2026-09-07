import { runBacktest } from "../src/lib/pair/backtest";
import { loadBacktestTape } from "../src/lib/pair/backtestTape";
import { mutateState } from "../src/lib/store";

async function main() {
  const tape = await loadBacktestTape();
  console.log("bars", tape.sol.length, tape.spy.length, tape.qqq.length, tape.gld.length);
  if (tape.sol.length < 120 || tape.spy.length < 80) {
    console.error("not enough history");
    process.exit(1);
  }
  const r = runBacktest(tape);
  await mutateState((s) => {
    s.backtest = r;
  });
  console.log(
    JSON.stringify(
      {
        pnlPct: r.pnlPct,
        trades: r.trades,
        winRate: r.winRate,
        maxDd: r.maxDdPct,
        fees: r.feesUsd,
        ending: r.endingUsd,
        horizon: r.horizon,
        sleeves: r.sleeves,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
