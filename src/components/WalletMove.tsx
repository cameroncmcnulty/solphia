"use client";

import { useState } from "react";
import { buildTransfer, phantomProvider, signLegacyTx, withdrawToOwner } from "@/lib/wallet/trading";
import { FieldError, useConfirmErrors } from "./form/confirm";

const PRESETS = [0.1, 0.5, 1, 2];

export function WalletMove({
  owner,
  tradePk,
  tradeBal,
  onDone,
}: {
  owner: string;
  tradePk: string;
  tradeBal: number;
  onDone?: () => void;
}) {
  const [amt, setAmt] = useState(0.5);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const err = useConfirmErrors<"amount" | "wallet">();
  const sol = custom.trim() ? Number(custom) : amt;

  async function toTrading() {
    const provider = phantomProvider();
    if (!provider) {
      err.fail({ wallet: "Open this page in Phantom (browser or in-app)." });
      return;
    }
    if (!(sol > 0)) {
      err.fail({ amount: "Pick how much SOL to move." });
      return;
    }
    err.ok();
    setBusy(true);
    setMsg("");
    try {
      const tx = await buildTransfer(owner, tradePk, sol);
      const sig = await signLegacyTx(tx);
      setMsg(`Sent ${sol} SOL to the trading wallet · ${sig.slice(0, 16)}…`);
      setTimeout(() => onDone?.(), 2500);
    } catch (e) {
      err.fail({}, e instanceof Error ? e.message : "transfer rejected");
    } finally {
      setBusy(false);
    }
  }

  async function toWallet() {
    if (!(sol > 0)) {
      err.fail({ amount: "Pick how much SOL to move." });
      return;
    }
    const send = Math.min(sol, Math.max(0, tradeBal - 0.003));
    if (!(send > 0.001)) {
      err.fail({ amount: "Trading wallet needs a little SOL left for fees." });
      return;
    }
    err.ok();
    setBusy(true);
    setMsg("");
    try {
      const sig = await withdrawToOwner(owner, send);
      setMsg(`Sent ${send.toFixed(4)} SOL to your wallet · ${sig.slice(0, 16)}…`);
      setTimeout(() => onDone?.(), 2500);
    } catch (e) {
      err.fail({}, e instanceof Error ? e.message : "transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">
        MOVE SOL · {tradePk ? `${tradePk.slice(0, 4)}…${tradePk.slice(-4)}` : "connect first"}
      </div>
      <div data-field="amount" className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 ${err.errors.amount ? "rounded-2xl p-1 ring-1 ring-blood/60" : ""}`}>
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setAmt(n);
              setCustom("");
              err.clear("amount");
            }}
            className={`min-h-[40px] rounded-full py-2 font-mono text-[12px] ${!custom && amt === n ? "btn-on" : "btn-ghost"}`}
          >
            {n} SOL
          </button>
        ))}
      </div>
      <input
        value={custom}
        onChange={(e) => {
          setCustom(e.target.value);
          err.clear("amount");
        }}
        inputMode="decimal"
        placeholder="or type an amount"
        className="mt-2 min-h-[40px] w-full rounded-full border border-violet/30 bg-void px-4 font-mono text-[12px] text-ghost"
      />
      <FieldError error={err.errors.amount} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy || !owner || !tradePk}
          onClick={toTrading}
          className="btn-acid min-h-[48px] rounded-full py-3 font-mono text-[12px] disabled:opacity-40"
        >
          To trading
        </button>
        <button
          type="button"
          disabled={busy || tradeBal < 0.01 || !owner}
          onClick={toWallet}
          className="btn-ghost min-h-[48px] rounded-full py-3 font-mono text-[12px] disabled:opacity-40"
        >
          To wallet
        </button>
      </div>
      <p className="mt-2 font-mono text-[11px] text-mute">
        Connected wallet ↔ trading wallet. Trading keeps ~0.003 SOL for fees.
      </p>
      <FieldError error={err.errors.wallet} />
      {err.banner && <p className="mt-2 font-mono text-sm text-blood">{err.banner}</p>}
      {msg && !err.banner && <p className="mt-2 font-mono text-sm text-acid">{msg}</p>}
    </div>
  );
}
