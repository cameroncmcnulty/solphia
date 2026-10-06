import { isSolanaAddress } from "./security";
import { loadState } from "./store";
import { treasuryAddress } from "./treasury";
import { ownerAddress } from "./ownerWallet";

/** Treasury, owner, and foundation pubkeys currently saved on the desk. */
export function projectProtocolWallets(): string[] {
  const keys = [treasuryAddress(), ownerAddress()];
  try {
    const f = (loadState().foundationWallet || "").trim();
    if (f) keys.push(f);
  } catch {
    /* store not ready */
  }
  return [...new Set(keys.filter((k) => isSolanaAddress(k)))];
}

/** True when this pubkey is a Solphia project wallet — do not skim 1% off itself. */
export function isProjectProtocolWallet(pk: string): boolean {
  const clean = (pk || "").trim();
  if (!isSolanaAddress(clean)) return false;
  return projectProtocolWallets().includes(clean);
}
