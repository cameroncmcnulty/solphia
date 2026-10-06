"use client";

import { useEffect, useState } from "react";
import { activeWallet, listWallets, VAULT_EVENT, type VaultWallet } from "./vault";

export function useActiveWallet(): VaultWallet | null {
  const [wallet, setWallet] = useState<VaultWallet | null>(() => (typeof window === "undefined" ? null : activeWallet()));
  useEffect(() => {
    const sync = () => setWallet(activeWallet());
    sync();
    window.addEventListener(VAULT_EVENT, sync);
    return () => window.removeEventListener(VAULT_EVENT, sync);
  }, []);
  return wallet;
}

export function useVaultWallets(hidden = false): VaultWallet[] {
  const [rows, setRows] = useState<VaultWallet[]>(() => (typeof window === "undefined" ? [] : listWallets({ hidden })));
  useEffect(() => {
    const sync = () => setRows(listWallets({ hidden }));
    sync();
    window.addEventListener(VAULT_EVENT, sync);
    return () => window.removeEventListener(VAULT_EVENT, sync);
  }, [hidden]);
  return rows;
}
