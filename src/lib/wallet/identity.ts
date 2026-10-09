import { forgetOwner, loadOwner, persistOwner } from "./owner";
import { activeWallet, walletByPubkey } from "./vault";

/** True when this pubkey is a Solphia embedded wallet on this device. Phantom cookies do not count. */
export function ownerIsEmbedded(pubkey?: string | null): boolean {
  if (!pubkey) return false;
  return walletByPubkey(pubkey)?.kind === "embedded";
}

/**
 * Header identity is the local Solphia wallet, not a leftover cookie or injected Phantom.
 * Drops Phantom / remember-cookie pubkeys so a fresh browser cannot look signed in.
 */
export function syncOwnerToDeviceVault(): string | null {
  const active = activeWallet();
  if (active?.kind === "embedded") {
    persistOwner(active.pubkey);
    return active.pubkey;
  }
  const owner = loadOwner();
  if (ownerIsEmbedded(owner)) {
    persistOwner(owner!);
    return owner;
  }
  if (owner) forgetOwner();
  return null;
}
