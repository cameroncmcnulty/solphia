import { peekAccount } from "@/lib/auth/client";
import { forgetOwner, loadOwner, persistOwner } from "./owner";
import { activeWallet, walletByPubkey } from "./vault";

/** True when this pubkey is a Solphia embedded wallet on this device. Phantom cookies do not count. */
export function ownerIsEmbedded(pubkey?: string | null): boolean {
  if (!pubkey) return false;
  return walletByPubkey(pubkey)?.kind === "embedded";
}

/**
 * Wallet follows the signed-in account. No account session → no remembered wallet,
 * even if this device still has a local vault or leftover owner cookie.
 */
export function syncOwnerToSignedInAccount(): string | null {
  const account = peekAccount();
  if (!account?.id) {
    if (loadOwner()) forgetOwner();
    return null;
  }
  const linked = Array.isArray(account.wallets) ? account.wallets.filter((pk) => ownerIsEmbedded(pk)) : [];
  const active = activeWallet();
  if (active?.kind === "embedded" && (!linked.length || linked.includes(active.pubkey))) {
    persistOwner(active.pubkey);
    return active.pubkey;
  }
  if (linked[0]) {
    persistOwner(linked[0]);
    return linked[0];
  }
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

/** @deprecated Use syncOwnerToSignedInAccount. Wallet is not an identity by itself. */
export function syncOwnerToDeviceVault(): string | null {
  return syncOwnerToSignedInAccount();
}
