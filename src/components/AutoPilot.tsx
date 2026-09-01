"use client";

import { useEffect, useState } from "react";
import { loadOwner, saveOwner, tradingPubkey, buildTransfer, withdrawToOwner } from "@/lib/wallet/trading";

function pickProvider() {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.phantom?.solana || w.solflare || w.solana || null;
}

export function AutoPilot({ owner }: { owner: string | null }) {
  const [auto, setAuto] = useState<any>(null);
  const [paper, setPaper] = useState<any>(null);
  const [tradePk, setTradePk] = useState("");
  const [bal, setBal] = useState(0);
  const [solAmt, setSolAmt] = useState(0.5);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh(pk = owner) {
    if (!pk) return;
    const a = await fetch(`/api/auto?owner=${pk}`).then((r) => r.json());
    setAuto(a.auto);
    setPaper(a.paper);
    const tpk = a.tradingPubkey || tradingPubkey();
    setTradePk(tpk);
    const b = await fetch(`/api/sol/balance?pubkey=${tpk}`).then((r) => r.json());
    setBal(b.sol || 0);
    if (typeof b.sol === "number") {
      await fetch("/api/auto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: pk, tradingPubkey: tpk, depositedSol: b.sol }),
      });
    }
  }

  useEffect(() => {
    if (owner) {
      saveOwner(owner);
      try {
        const tpk = tradingPubkey();
        fetch("/api/auto", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner, tradingPubkey: tpk }),
        }).then(() => refresh(owner));
      } catch {
        refresh(owner);
      }
    } else {
      refresh(loadOwner());
    }
  }, [owner]);

  async function patch(partial: Record<string, unknown>) {
    if (!owner) return setMsg("Connect Phantom first.");
    const r = await fetch("/api/auto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, auto: partial }),
    });
    const j = await r.json();
    setAuto(j.auto);
    setPaper(j.paper);
  }

  async function deposit() {
    const provider = pickProvider();
    if (!provider || !owner) return setMsg("Open this page inside Phantom.");
    setBusy(true);
    try {
      const tpk = tradingPubkey();
      const tx = await buildTransfer(owner, tpk, solAmt);
      const sent = await provider.signAndSendTransaction(tx);
      setMsg(`Deposited ${solAmt} SOL · ${String(sent.signature || sent).slice(0, 16)}…`);
      setTimeout(() => refresh(owner), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "deposit rejected");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!owner || bal <= 0.001) return;
    setBusy(true);
    try {
      const sig = await withdrawToOwner(owner, Math.max(0, bal - 0.003));
      setMsg(`Withdraw sent · ${sig.slice(0, 16)}…`);
      setTimeout(() => refresh(owner), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.28em] text-violet">COPY BOT</div>
        <h2 className="mt-1 font-display text-2xl text-ghost">Turn her on. Close the phone.</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          SOL goes into a trading wallet on this device — not to us. While testing, she paper-trades that amount so you
          can see if the bot would have made you money. Real swaps stay off until we flip live.
        </p>
        <button
          onClick={() => patch({ armed: !auto?.armed })}
          className={`mt-5 min-h-[52px] w-full rounded-full py-4 font-mono text-sm tracking-[0.16em] ${
            auto?.armed ? "bg-acid text-void" : "btn-ghost"
          }`}
        >
          {auto?.armed ? "SHE'S ON" : "TURN SOLPHIA ON"}
        </button>
      </div>

      <div className="panel rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-mute">YOUR TRADING WALLET</div>
            <div className="break-all font-mono text-xs text-acid">{tradePk || "—"}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-mute">BALANCE</div>
            <div className="font-display text-2xl text-ghost">{bal.toFixed(3)} SOL</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[0.1, 0.5, 1, 2].map((n) => (
            <button
              key={n}
              onClick={() => setSolAmt(n)}
              className={`rounded-full py-2 font-mono text-[11px] ${solAmt === n ? "bg-violet text-white" : "btn-ghost"}`}
            >
              {n} SOL
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy || !owner} onClick={deposit} className="btn-acid rounded-full py-3 font-mono text-[11px] disabled:opacity-40">
            Deposit
          </button>
          <button disabled={busy || bal < 0.01} onClick={withdraw} className="btn-ghost rounded-full py-3 font-mono text-[11px] disabled:opacity-40">
            Withdraw
          </button>
        </div>
      </div>

      {paper && (
        <div className="grid grid-cols-3 gap-2">
          <Mini k="Your book" v={`$${paper.equityUsd.toFixed(0)}`} />
          <Mini k="PnL" v={`${(paper.pnlPct * 100).toFixed(1)}%`} />
          <Mini k="Open" v={String(paper.open)} />
        </div>
      )}
      {paper?.haltReason && (paper.haltedUntil || 0) > Date.now() && (
        <p className="font-mono text-xs text-blood">{paper.haltReason}</p>
      )}

      <div className="panel rounded-2xl p-5 space-y-3">
        <div className="font-mono text-[10px] tracking-[0.22em] text-mute">WHAT SHE'S ALLOWED TO DO</div>
        <Toggle label="Copy winning wallets" on={auto?.copy} onChange={(v) => patch({ copy: v })} />
        <Toggle label="Buy new launches" on={auto?.launch} onChange={(v) => patch({ launch: v })} />
        <Toggle label="Buy graduations" on={auto?.migrate} onChange={(v) => patch({ migrate: v })} />
        <label className="flex items-center justify-between gap-3 font-mono text-xs text-mute">
          Max SOL / trade
          <input
            type="number"
            step="0.05"
            min="0.05"
            className="w-24 rounded-full border border-violet/30 bg-void px-3 py-2 text-right text-ghost outline-none"
            defaultValue={auto?.maxSolPerTrade ?? 0.25}
            onBlur={(e) => patch({ maxSolPerTrade: Number(e.target.value) || 0.25 })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 font-mono text-xs text-mute">
          Min safety
          <input
            type="number"
            min="50"
            max="95"
            className="w-24 rounded-full border border-violet/30 bg-void px-3 py-2 text-right text-ghost outline-none"
            defaultValue={auto?.minScore ?? 70}
            onBlur={(e) => patch({ minScore: Number(e.target.value) || 70 })}
          />
        </label>
      </div>
      {msg && <p className="font-mono text-xs text-acid">{msg}</p>}
      {!owner && <p className="text-xs text-mute">On iPhone, open solphia.io inside the Phantom app, then tap Connect.</p>}
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="panel rounded-2xl p-3">
      <div className="font-mono text-[9px] tracking-[0.18em] text-mute">{k}</div>
      <div className="font-display text-xl text-acid">{v}</div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between font-mono text-xs">
      <span className="text-mute">{label}</span>
      <span className={on ? "text-acid" : "text-mute"}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}
