"use client";

import { WalletOnboard } from "@/components/wallet/WalletOnboard";

/** Email and Google sign-in are retired. Identity is the Solphia seed. */
export function AccountGate({
  onClose,
}: {
  onClose: () => void;
  onReady?: (account: unknown) => void;
  hint?: string;
}) {
  return <WalletOnboard onClose={onClose} />;
}
