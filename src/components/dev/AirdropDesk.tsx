"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { allocate, batches, parseRecipients, toRawAmount } from "@/lib/dev/airdrop";
import { transferIxs } from "@/lib/dev/spl";
import { connectedPubkey, signAndSend, solscan } from "@/lib/dev/wallet";
import { Field, Status, inputClass } from "./fields";

export function AirdropDesk() {
  const [mint, setMint] = useState("");
  const [total, setTotal] = useState("1000000");
  const [decimals, setDecimals] = useState(6);
  const [list, setList] = useState("");
  const [token2022, setToken2022] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const rec = parseRecipients(list);

  async function snapshot() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/dev/holders?mint=${mint}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "snapshot failed");
      const lines = (j.holders as { address: string; uiAmount: number }[])
        .filter((h) => h.uiAmount > 0)
        .map((h) => `${h.address},${h.uiAmount}`)
        .join("\n");
      setList(lines);
      setOk(true);
      setMsg(`${j.count} holders loaded as weights.`);
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : "snapshot failed");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setOk(false);
    setMsg("");
    try {
      const payer = await connectedPubkey();
      const planned = allocate(rec, toRawAmount(Number(total), decimals));
      if (!planned.length) throw new Error("No valid recipients.");
      const mintPk = new PublicKey(mint);
      const program = token2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      const groups = batches(planned, 4);
      const sigs: string[] = [];
      for (const group of groups) {
        const ixs = transferIxs({
          payer: new PublicKey(payer),
          mint: mintPk,
          program,
          destinations: group.map((g) => ({ owner: new PublicKey(g.address), amount: g.amount })),
        });
        sigs.push(await signAndSend({ ixs }));
      }
      setOk(true);
      setMsg(`Sent ${planned.length} transfers in ${sigs.length} tx.`);
      window.open(solscan(sigs[0]), "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "airdrop failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel space-y-4 rounded-2xl p-4 sm:p-6">
      <p className="font-serif text-sm text-mute">
        Paste wallets, optional weights. Snapshot fills weights from current holders. Each batch is a real token
        transfer you sign.
      </p>
      <Field label="Token mint">
        <input className={inputClass} value={mint} onChange={(e) => setMint(e.target.value.trim())} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Total tokens">
          <input className={inputClass} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
        <Field label="Decimals">
          <input
            type="number"
            className={inputClass}
            value={decimals}
            onChange={(e) => setDecimals(Number(e.target.value) || 0)}
          />
        </Field>
        <button type="button" onClick={() => setToken2022((v) => !v)} className={`mt-5 min-h-[44px] rounded-full font-mono text-[11px] ${token2022 ? "bg-violet text-white" : "btn-ghost"}`}>
          {token2022 ? "Token-2022" : "Classic SPL"}
        </button>
      </div>
      <Field label="Recipients · address,weight">
        <textarea
          className={`${inputClass} min-h-[180px] py-3`}
          placeholder={"Wallet,weight\nWallet2,1"}
          value={list}
          onChange={(e) => setList(e.target.value)}
        />
      </Field>
      <p className="font-mono text-[11px] text-mute">{rec.length} wallets ready</p>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy || !mint} onClick={snapshot} className="btn-ghost min-h-[48px] rounded-full font-mono text-[11px] disabled:opacity-40">
          Snapshot holders
        </button>
        <button disabled={busy || !mint || rec.length === 0} onClick={send} className="btn-acid min-h-[48px] rounded-full font-mono text-[11px] disabled:opacity-40">
          {busy ? "SIGNING…" : "SEND AIRDROP"}
        </button>
      </div>
      <Status msg={msg} ok={ok} />
    </div>
  );
}
