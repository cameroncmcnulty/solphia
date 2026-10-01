import { loadState } from "./store";
import { DEFAULT_OWNER } from "./protocolWallets";

/** Dashboard override first, then the hard-coded owner wallet. */
export function ownerAddress(): string {
  try {
    const s = loadState();
    const w = (s.ownerWallet || s.launch?.ownerWallet || "").trim();
    if (w) return w;
  } catch {
    /* empty */
  }
  return DEFAULT_OWNER;
}
