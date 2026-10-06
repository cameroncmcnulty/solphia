"use client";

import { useEffect, useState } from "react";
import { CartoonPfp } from "@/components/CartoonPfp";
import { PhantomMark } from "@/components/PhantomMark";
import {
  activeWallet,
  hideWallet,
  listWallets,
  removeWallet,
  renameWallet,
  switchWallet,
  unlockedMnemonic,
  type VaultWallet,
  VAULT_EVENT,
  requestUnlock,
} from "@/lib/wallet/vault";
import { WalletSheet } from "./sheet";

export function WalletSwitcher({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [rows, setRows] = useState<VaultWallet[]>([]);
  const [activeId, setActiveId] = useState("");
  const [edit, setEdit] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  function refresh() {
    const all = listWallets({ hidden: true });
    setRows(all);
    setActiveId(activeWallet()?.id || "");
  }

  useEffect(() => {
    refresh();
    const onVault = () => refresh();
    window.addEventListener(VAULT_EVENT, onVault);
    return () => window.removeEventListener(VAULT_EVENT, onVault);
  }, []);

  return (
    <WalletSheet title="Wallets" subtitle="Each wallet is its own account, rank, and referral cut. Balances are never merged." onClose={onClose}>
      {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
      <div className="space-y-2">
        {rows.filter((w) => !w.hidden).map((w) => (
          <div key={w.id} className={`rounded-2xl border px-3 py-3 ${w.id === activeId ? "border-acid/40 bg-acid/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
            <button
              type="button"
              className="flex w-full items-center gap-3 text-left"
              onClick={() => {
                switchWallet(w.id);
                onClose();
              }}
            >
              <CartoonPfp seed={w.pubkey} src={`/api/circle/avatar?pk=${encodeURIComponent(w.pubkey)}`} className="h-10 w-10" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[15px] font-semibold text-white">
                  {w.nickname}
                  {w.kind === "phantom" ? <PhantomMark className="h-3.5 w-3.5 text-white/70" /> : null}
                </span>
                <span className="block font-mono text-[11px] text-white/40">
                  {w.pubkey.slice(0, 4)}…{w.pubkey.slice(-4)}
                </span>
              </span>
            </button>
            {edit === w.id ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 24))}
                  className="min-h-[40px] min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-3 text-[13px] text-white"
                />
                <button
                  type="button"
                  className="rounded-full bg-acid px-3 text-[13px] font-semibold text-void"
                  onClick={() => {
                    renameWallet(w.id, name);
                    setEdit(null);
                    refresh();
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/70" onClick={() => { setEdit(w.id); setName(w.nickname); }}>
                  Rename
                </button>
                <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/70" onClick={() => { hideWallet(w.id, true); refresh(); }}>
                  Hide
                </button>
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-blood"
                  onClick={async () => {
                    setErr("");
                    if (w.kind === "embedded" && !unlockedMnemonic(w.id)) {
                      const ok = await requestUnlock(w.id);
                      if (!ok) return;
                    }
                    setRemoveId(w.id);
                    setConfirm("");
                  }}
                >
                  Remove
                </button>
              </div>
            )}
            {removeId === w.id ? (
              <div className="mt-2">
                {w.kind === "embedded" ? (
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type any 3 words from the phrase"
                    className="min-h-[40px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 font-mono text-[12px] text-white"
                  />
                ) : (
                  <p className="text-[12px] text-white/45">Removes Phantom from this device list. On-chain funds stay in Phantom.</p>
                )}
                <button
                  type="button"
                  className="mt-2 rounded-full bg-blood/80 px-3 py-1.5 text-[12px] text-white"
                  onClick={async () => {
                    try {
                      await removeWallet(w.id, confirm);
                      setRemoveId(null);
                      refresh();
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : "Could not remove.");
                    }
                  }}
                >
                  Confirm remove
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="btn-acid mt-4 min-h-[48px] w-full rounded-full">
        Add wallet
      </button>
    </WalletSheet>
  );
}
