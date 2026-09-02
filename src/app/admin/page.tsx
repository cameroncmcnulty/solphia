"use client";

import { useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { AutoPilot } from "@/components/AutoPilot";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState("");

  async function login() {
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    if (!r.ok) {
      setErr("denied");
      return;
    }
    await reload();
    setErr("");
  }

  async function reload() {
    const dash = await fetch("/api/admin");
    setData(await dash.json());
    const stored = localStorage.getItem("solphia_owner") || "";
    if (stored) setWallet(stored);
  }

  async function saveSetting(key: string, value: number) {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: { [key]: value } }),
    });
    await reload();
  }

  async function grant() {
    const pk = wallet || localStorage.getItem("solphia_owner") || "";
    if (!pk) {
      setNote("Connect a wallet first.");
      return;
    }
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ compWallet: pk }),
    });
    const j = await r.json();
    if (!r.ok) {
      setNote(j.error || "failed");
      return;
    }
    localStorage.setItem("solphia_owner", pk);
    setNote(`Founder access granted to ${pk.slice(0, 4)}…${pk.slice(-4)}. Full terminal, auto, copy, launch desk — no SOL.`);
    await reload();
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-5 py-20">
        <h1 className="font-display text-4xl text-ghost">Admin</h1>
        <p className="mt-2 font-mono text-xs text-mute">Command login. Then connect your wallet for free founder access.</p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin secret"
          className="mt-6 w-full rounded-full border border-line bg-void px-4 py-3 font-mono text-xs outline-none"
        />
        <button onClick={login} className="btn-acid mt-4 w-full rounded-full py-3 font-mono text-xs">
          ENTER
        </button>
        {err && <p className="mt-3 font-mono text-blood">{err}</p>}
      </main>
    );
  }

  const p = data.paper;
  return (
    <main className="px-4 pb-24 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl text-ghost md:text-5xl">Command</h1>
        <div className="font-mono text-[11px] text-cyan">
          {data.liveTrading ? "LIVE" : "PAPER"} · HELIUS {data.helius ? "ON" : "OFF"}
        </div>
      </div>

      <section className="panel mt-6 space-y-4 rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-violet">FOUNDER WALLET</div>
        <p className="text-sm text-mute">
          Connect the wallet you trade with. Grant it founder access and every desk is free — Pulse, copy, launch,
          auto, no 0.15 / 0.50 SOL.
        </p>
        <WalletConnect />
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Or paste a Solana address"
          className="w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-xs outline-none"
        />
        <button onClick={grant} className="btn-acid w-full rounded-full py-3 font-mono text-xs sm:w-auto sm:px-6">
          Grant this wallet full access (free)
        </button>
        {note && <p className="font-mono text-xs text-acid">{note}</p>}
        {(data.adminWallets || []).length > 0 && (
          <div className="font-mono text-[11px] text-mute">
            Comped: {(data.adminWallets as string[]).map((a) => `${a.slice(0, 4)}…${a.slice(-4)}`).join(" · ")}
          </div>
        )}
      </section>

      {wallet && (
        <section className="mt-6">
          <div className="mb-3 font-mono text-[10px] tracking-[0.3em] text-mute">YOUR AUTO (FOUNDER)</div>
          <AutoPilot owner={wallet} />
        </section>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["EQUITY", `$${p.equityUsd.toFixed(2)}`],
          ["PNL", `${(p.pnlPct * 100).toFixed(2)}%`],
          ["USERS", String(data.users.length)],
          ["EMAILS", String(data.emails.length)],
        ].map(([k, v]) => (
          <div key={k} className="panel rounded-2xl p-4">
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">{k}</div>
            <div className="mt-1 font-display text-3xl text-ghost">{v}</div>
          </div>
        ))}
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ENGINE SETTINGS</div>
          {Object.entries(data.settings).map(([k, v]) => (
            <label key={k} className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px]">
              <span className="text-mute">{k}</span>
              <input
                defaultValue={String(v)}
                className="w-28 rounded-full border border-line bg-void px-3 py-1 text-right outline-none"
                onBlur={(e) => saveSetting(k, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">FEEDS</div>
          {(data.feedHealth || []).map((f: any) => (
            <div key={f.source} className="mt-2 flex justify-between font-mono text-[11px]">
              <span>{f.source}</span>
              <span className={f.ok ? "text-acid" : "text-blood"}>
                {f.ok ? `${f.count} in ${f.ms}ms` : f.error}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">USERS</div>
          {data.users.map((u: any) => (
            <div key={u.pubkey} className="mt-2 font-mono text-[11px] text-ghost">
              {u.pubkey.slice(0, 4)}…{u.pubkey.slice(-4)} · {u.comped ? "FOUNDER" : u.email || "no mail"} ·{" "}
              {u.subscribedUntil && u.subscribedUntil > Date.now() ? "SUB" : "FREE"}
            </div>
          ))}
        </div>
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">AUDIT</div>
          {data.audit.slice(0, 12).map((a: any) => (
            <div key={a.id} className="mt-2 font-mono text-[11px] text-mute">
              {a.action} · {a.detail}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
