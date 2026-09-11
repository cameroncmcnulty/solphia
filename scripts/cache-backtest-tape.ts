import { writeFileSync } from "fs";
import path from "path";
import { loadBacktestTape } from "../src/lib/pair/backtestTape";

async function main() {
  const tape = await loadBacktestTape();
  const file = path.join(process.cwd(), "data", "backtest-tape.json");
  writeFileSync(file, JSON.stringify(tape));
  console.log(`wrote ${file} sol=${tape.sol.length} spy=${tape.spy.length} qqq=${tape.qqq.length} gld=${tape.gld.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
