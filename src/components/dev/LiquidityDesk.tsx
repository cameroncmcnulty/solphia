"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { toRawAmount } from "@/lib/dev/airdrop";
import { burnIx, transferIxs } from "@/lib/dev/spl";
import { connectedPubkey, signAndSend, solscan } from "@/lib/dev/wallet";
import { Field, Status, inputClass } from "./fields";

export function LiquidityDesk() {
  const [mint, setMint] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState(6);
  const [token2022, setToken2022] = useState(false);
  const [lockTo, setLockTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const program = token2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

  async function burn() {
    setBusy(true);
    setOk(false);
    setMsg("");
    try {
      const owner = await connectedPubkey();
      const raw = toRawAmount(Number(amount), decimals);
      if (raw <= 0n) throw new Error("Enter an amount to burn.");
      const sig = await signAndSend({
        ixs: [burnIx({ owner: new PublicKey(owner), mint: new PublicKey(mint), amount: raw, program })],
      });
      setOk(true);
      setMsg(`Burned. LP that is gone cannot be yanked.`);
      window.open(solscan(sig), "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "burn failed");
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    setBusy(true);
    setOk(false);
    setMsg("");
    try {
      const owner = await connectedPubkey();
      const raw = toRawAmount(Number(amount), decimals);
      if (raw <= 0n) throw new Error("Enter an amount to lock.");
      if (!lockTo) throw new Error("Paste the locker or vault address.");
      const sig = await signAndSend({
        ixs: transferIxs({
          payer: new PublicKey(owner),
          mint: new PublicKey(mint),
          program,
          destinations: [{ owner: new PublicKey(lockTo), amount: raw }],
        }),
      });
      setOk(true);
      setMsg(`LP moved to lock vault.`);
      window.open(solscan(sig), "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "lock failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel space-y-4 rounded-2xl p-4 sm:p-6">
      <p className="font-serif text-sm text-mute">
        After a Pump.fun graduation you hold LP tokens. Burn them and nobody can pull the pool. Or send them to a locker
        / vesting vault. Seed buy on launch is the curve itself — use the Launch tab for that.
      </p>
      <Field label="LP token mint">
        <input className={inputClass} value={mint} onChange={(e) => setMint(e.target.value.trim())} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount">
          <input className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Decimals">
          <input
            type="number"
            className={inputClass}
            value={decimals}
            onChange={(e) => setDecimals(Number(e.target.value) || 0)}
          />
        </Field>
      </div>
      <Field label="Lock destination (vault / streamflow / squads)">
        <input className={inputClass} value={lockTo} onChange={(e) => setLockTo(e.target.value.trim())} placeholder="Optional for burn" />
      </Field>
      <button type="button" onClick={() => setToken2022((v) => !v)} className={`min-h-[44px] rounded-full px-4 font-mono text-[11px] ${token2022 ? "bg-violet text-white" : "btn-ghost"}`}>
        {token2022 ? "Token-2022 LP" : "Classic SPL LP"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy || !mint} onClick={burn} className="btn-acid min-h-[48px] rounded-full font-mono text-[11px] disabled:opacity-40">
          BURN LP
        </button>
        <button disabled={busy || !mint || !lockTo} onClick={lock} className="btn-ghost min-h-[48px] rounded-full font-mono text-[11px] disabled:opacity-40">
          SEND TO LOCKER
        </button>
      </div>
      <Status msg={msg} ok={ok} />
    </div>
  );
}
