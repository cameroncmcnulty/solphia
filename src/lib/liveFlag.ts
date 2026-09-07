import { LIVE_TRADING } from "./config";
import { loadState } from "./store";

/** Admin toggle overrides env. Unset means use LIVE_TRADING / NEXT_PUBLIC_LIVE_TRADING. */
export function liveTradingEnabled(): boolean {
  try {
    const flag = loadState().liveTrading;
    if (typeof flag === "boolean") return flag;
  } catch {
    /* empty */
  }
  return LIVE_TRADING;
}
