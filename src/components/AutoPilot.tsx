"use client";

import { useEffect, useRef, useState } from "react";
import { loadOwner, saveOwner, tradingPubkey, buildTransfer, withdrawToOwner } from "@/lib/wallet/trading";
import { ConfigDesk, type ConfigShape } from "./ConfigDesk";

function pickProvider() {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.phantom?.solana || w.solflare || w.solana || null;
}

export function AutoPilot({ owner }: { owner: string | null }) {
  const [auto, setAuto] = useState<any>(null);
  const [paper, setPaper] = useState<any>(null);
  const [lab, setLab] = useState<any>(null);
  const [mind, setMind] = useState<any>(null);
  const [tradePk, setTradePk] = useState("");
  const [bal, setBal] = useState(0);
  const [solAmt, setSolAmt] = useState(0.5);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cfgFrom(a: any): ConfigShape {
    return {
      maxSolPerTrade: a?.maxSolPerTrade ?? 0.25,
      minScore: a?.minScore ?? 70,
      takeProfitPct: a?.takeProfitPct ?? 0.32,
      stopLossPct: a?.stopLossPct ?? 0.16,
      maxDevHoldPct: a?.maxDevHoldPct ?? 15,
      autoSell: a?.autoSell !== false,
      copy: a?.copy !== false,
      picks: Boolean(a?.picks),
      launch: Boolean(a?.launch),
      migrate: a?.migrate !== false,
    };
  }

  async function refresh(pk = owner) {
    if (!pk) return;
    const a = await fetch(`/api/auto?owner=${pk}`).then((r) => r.json());
    setAuto(a.auto);
    setPaper(a.paper);
    setLab(a.lab);
    setMind(a.mind);
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
    if (j.lab) setLab(j.lab);
    if (j.mind) setMind(j.mind);
  }

  function patchSoon(partial: Record<string, unknown>) {
    setAuto((prev: any) => ({ ...(prev || {}), ...partial }));
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => patch(partial), 350);
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
        <div className="font-mono text-[10px] tracking-[0.28em] text-violet">KILL SWITCH ON</div>
        <h2 className="mt-1 font-display text-2xl text-ghost">Turn her on. Close the phone.</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Scout finds a setup. Risk has to agree. Policy caps size and daily loss. Keys stay on this device — never in
          the model. She paper-trades first. Live stays off until a desk stays green.
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

      {mind && (
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">SOLPHIA MIND</div>
          <p className="mt-2 text-sm text-mute">
            She studies the tape every tick. Bars only move up after losses. Picks need Telegram, P(grad) ≥ 62%, and
            learned P(pay) ≥ {(mind.pickThreshold * 100).toFixed(0)}%.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Mini k="Studied" v={String(mind.studied || 0)} />
            <Mini k="Closed" v={String(mind.closed || 0)} />
            <Mini k="Pick bar" v={`${Math.round((mind.pickThreshold || 0) * 100)}%`} />
          </div>
        </div>
      )}

      {lab && (
        <div className="grid grid-cols-3 gap-2">
          <Mini k="Refused" v={String((lab.copy?.denied || 0) + (lab.launch?.denied || 0) + (lab.migrate?.denied || 0) + (lab.pick?.denied || 0))} />
          <Mini k="Copy lab" v={`${lab.copy?.shadowPnlUsd >= 0 ? "+" : ""}$${Number(lab.copy?.shadowPnlUsd || 0).toFixed(0)}`} />
          <Mini k="Desks live" v={[lab.copy?.enabled && "copy", lab.pick?.enabled && "picks", lab.launch?.enabled && "launch", lab.migrate?.enabled && "grad"].filter(Boolean).join(" · ") || "none"} />
        </div>
      )}

      <div className="panel rounded-2xl p-5 space-y-3">
        <div className="font-mono text-[10px] tracking-[0.22em] text-mute">DESKS</div>
        <Toggle label="Copy the decision, not the bag" on={auto?.copy} onChange={(v) => patch({ copy: v })} />
        <Toggle label="Solphia Picks — extremely picky, self-learning" on={auto?.picks} onChange={(v) => patch({ picks: v })} />
        <Toggle label="Launch only if P(grad) clears" on={auto?.launch} onChange={(v) => patch({ launch: v })} />
        <Toggle label="Graduation fills only" on={auto?.migrate} onChange={(v) => patch({ migrate: v })} />
      </div>

      <ConfigDesk value={cfgFrom(auto)} onChange={patchSoon} />
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
