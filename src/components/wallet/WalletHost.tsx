"use client";

import { useCallback, useEffect, useState } from "react";
import { VAULT_EVENT, VAULT_UNLOCK_EVENT, needsBackup } from "@/lib/wallet/vault";
import { WalletOnboard } from "./WalletOnboard";
import { WalletUnlock } from "./WalletUnlock";
import { WalletSwitcher } from "./WalletSwitcher";
import { BackupBar } from "./BackupBar";

export const WALLET_ONBOARD = "solphia:wallet-onboard";
export const WALLET_SWITCH = "solphia:wallet-switcher";

export function openWalletOnboard() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WALLET_ONBOARD));
}

export function openWalletSwitcher() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WALLET_SWITCH));
}

export function WalletHost() {
  const [onboard, setOnboard] = useState(false);
  const [unlock, setUnlock] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [backup, setBackup] = useState(false);

  const syncBackup = useCallback(() => setBackup(needsBackup()), []);

  useEffect(() => {
    syncBackup();
    const onOnboard = () => setOnboard(true);
    const onSwitch = () => setSwitcher(true);
    const onUnlock = () => setUnlock(true);
    window.addEventListener(WALLET_ONBOARD, onOnboard);
    window.addEventListener(WALLET_SWITCH, onSwitch);
    window.addEventListener(VAULT_UNLOCK_EVENT, onUnlock);
    window.addEventListener(VAULT_EVENT, syncBackup);
    return () => {
      window.removeEventListener(WALLET_ONBOARD, onOnboard);
      window.removeEventListener(WALLET_SWITCH, onSwitch);
      window.removeEventListener(VAULT_UNLOCK_EVENT, onUnlock);
      window.removeEventListener(VAULT_EVENT, syncBackup);
    };
  }, [syncBackup]);

  return (
    <>
      {backup ? <BackupBar onOpen={() => setUnlock(true)} /> : null}
      {onboard ? (
        <WalletOnboard
          onClose={() => {
            setOnboard(false);
            syncBackup();
          }}
        />
      ) : null}
      {unlock ? (
        <WalletUnlock
          onClose={() => {
            setUnlock(false);
            syncBackup();
          }}
        />
      ) : null}
      {switcher ? (
        <WalletSwitcher
          onClose={() => setSwitcher(false)}
          onAdd={() => {
            setSwitcher(false);
            setOnboard(true);
          }}
        />
      ) : null}
    </>
  );
}
