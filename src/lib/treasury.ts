import { TREASURY } from "./config";
import { loadState } from "./store";

/** Dashboard override first, then SOLPHIA_TREASURY. Seat pay and clip fees land here. */
export function treasuryAddress(): string {
  try {
    const w = (loadState().treasuryWallet || "").trim();
    if (w) return w;
  } catch {
    /* empty */
  }
  return TREASURY;
}
