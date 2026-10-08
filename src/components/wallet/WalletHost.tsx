"use client";

import { useCallback, useEffect, useState } from "react";
import { VAULT_EVENT, VAULT_UNLOCK_EVENT, needsBackup } from "@/lib/wallet/vault";
import { loadOwner } from "@/lib/wallet/owner";
import { peekAccount, refreshAccount } from "@/lib/auth/client";
import { AccountGate } from "@/components/auth/AccountGate";
import { WalletOnboard } from "./WalletOnboard";
import { WalletUnlock } from "./WalletUnlock";
import { WalletSwitcher } from "./WalletSwitcher";
import { BackupBar } from "./BackupBar";

export const WALLET_ONBOARD = "solphia:wallet-onboard";
export const WALLET_SWITCH = "solphia:wallet-switcher";
export const ACCOUNT_GATE = "solphia:account-gate";
export const CONNECT_FLOW = "solphia:connect";

export function openWalletOnboard() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WALLET_ONBOARD));
}

export function openWalletSwitcher() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WALLET_SWITCH));
}

export function openAccountGate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ACCOUNT_GATE));
}

export function openConnect() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONNECT_FLOW));
}

export function WalletHost() {
  const [account, setAccount] = useState(false);
  const [onboard, setOnboard] = useState(false);
  const [unlock, setUnlock] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [backup, setBackup] = useState(false);

  const syncBackup = useCallback(() => setBackup(needsBackup()), []);

  const afterAccount = useCallback(() => {
    setAccount(false);
    if (!loadOwner()) setOnboard(true);
  }, []);

  useEffect(() => {
    syncBackup();
    const startConnect = () => {
      const signed = peekAccount();
      if (!signed) {
        setAccount(true);
        return;
      }
      setOnboard(true);
    };
    const onOnboard = () => setOnboard(true);
    const onSwitch = () => setSwitcher(true);
    const onUnlock = () => setUnlock(true);
    const onAccount = () => setAccount(true);
    window.addEventListener(CONNECT_FLOW, startConnect);
    window.addEventListener(WALLET_ONBOARD, onOnboard);
    window.addEventListener(WALLET_SWITCH, onSwitch);
    window.addEventListener(VAULT_UNLOCK_EVENT, onUnlock);
    window.addEventListener(ACCOUNT_GATE, onAccount);
    window.addEventListener(VAULT_EVENT, syncBackup);
    return () => {
      window.removeEventListener(CONNECT_FLOW, startConnect);
      window.removeEventListener(WALLET_ONBOARD, onOnboard);
      window.removeEventListener(WALLET_SWITCH, onSwitch);
      window.removeEventListener(VAULT_UNLOCK_EVENT, onUnlock);
      window.removeEventListener(ACCOUNT_GATE, onAccount);
      window.removeEventListener(VAULT_EVENT, syncBackup);
    };
  }, [syncBackup]);

  useEffect(() => {
    void refreshAccount().then((acct) => {
      if (typeof window === "undefined") return;
      const q = new URLSearchParams(window.location.search);
      const signed = q.get("signedin") === "1";
      const authErr = q.get("auth_error");
      const twoFa = q.get("auth_2fa") === "1";
      if (signed || authErr || twoFa) {
        const path = window.location.pathname || "/";
        window.history.replaceState({}, "", path);
      }
      if (signed && acct && !loadOwner()) setOnboard(true);
      if (authErr || twoFa) setAccount(true);
    });
  }, []);

  return (
    <>
      {backup ? <BackupBar onOpen={() => setUnlock(true)} /> : null}
      {account ? (
        <AccountGate
          onClose={() => setAccount(false)}
          onReady={() => afterAccount()}
        />
      ) : null}
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
