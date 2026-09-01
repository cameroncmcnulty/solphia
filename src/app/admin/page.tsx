"use client";

import { useState } from "react";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

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
    const dash = await fetch("/api/admin");
    setData(await dash.json());
    setErr("");
  }

  async function saveSetting(key: string, value: number) {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: { [key]: value } }),
    });
    const dash = await fetch("/api/admin");
    setData(await dash.json());
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-5 py-20">
        <h1 className="font-display text-4xl text-ghost">Admin</h1>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="ADMIN_SECRET"
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
    <main className="px-5 pb-24 md:px-8">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-5xl text-ghost">Command</h1>
        <div className="font-mono text-[11px] text-cyan">
          {data.liveTrading ? "LIVE" : "PAPER"} · HELIUS {data.helius ? "ON" : "OFF"}
        </div>
      </div>
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
              {u.pubkey.slice(0, 4)}…{u.pubkey.slice(-4)} · {u.email || "no mail"} ·{" "}
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
