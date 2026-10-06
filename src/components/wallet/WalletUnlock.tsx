"use client";

import { useState } from "react";
import { finishUnlockRequest, unlockVault, vaultUnlocked } from "@/lib/wallet/vault";
import { pinOk } from "@/lib/wallet/vaultCrypto";
import { WalletSheet } from "./sheet";

export function WalletUnlock({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!pinOk(pin)) {
      setErr("PIN is 4–8 digits.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await unlockVault(pin);
      finishUnlockRequest(true);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unlock failed.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (!vaultUnlocked()) finishUnlockRequest(false);
    onClose();
  }

  return (
    <WalletSheet title="Unlock wallet" subtitle="PIN stays on this device. Solphia never receives it." onClose={close}>
      {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
      <input
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
        onKeyDown={(e) => {
          if (e.key === "Enter") void go();
        }}
        className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[22px] tracking-[0.45em] text-white outline-none"
      />
      <button type="button" disabled={busy} onClick={() => void go()} className="btn-acid mt-4 min-h-[48px] w-full rounded-full disabled:opacity-40">
        {busy ? "Unlocking…" : "Unlock"}
      </button>
    </WalletSheet>
  );
}
