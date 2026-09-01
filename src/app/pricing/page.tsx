"use client";

import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { WalletConnect } from "@/components/WalletConnect";

export default function PricingPage() {
  const [plan, setPlan] = useState<PlanId>("full");
  const [email, setEmail] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [msg, setMsg] = useState("");
  const selected = PLANS.find((p) => p.id === plan)!;

  async function subscribe() {
    const r = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pubkey: pubkey || "11111111111111111111111111111111",
        email,
        paper: true,
        plan,
      }),
    });
    const j = await r.json();
    setMsg(j.error || `${selected.name} seated until ${new Date(j.subscribedUntil).toLocaleDateString()}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-8 md:px-8 md:pb-24">
      <p className="font-mono text-[11px] tracking-[0.4em] text-violet">ACCESS</p>
      <h1 className="mt-2 font-display text-3xl text-ghost sm:text-5xl">Pick a desk, or take the whole floor.</h1>
      <p className="mt-4 max-w-2xl text-mute">
        Pulse is the 0.15 SOL alert wire. Copy and snipers are separate. Full terminal is cheaper than stacking them.
        Testing seats are paper until a treasury is set.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlan(p.id)}
            className={`panel rounded-2xl p-5 text-left ${plan === p.id ? "border-acid/70 shadow-[0_0_40px_rgba(20,241,149,0.12)]" : ""} ${p.featured ? "md:scale-[1.02]" : ""}`}
          >
            <div className="font-mono text-[10px] tracking-[0.28em] text-violet">{p.featured ? "BEST VALUE" : "DESK"}</div>
            <div className="mt-2 font-display text-2xl text-ghost">{p.name}</div>
            <div className="mt-1 font-mono text-acid">{p.sol} SOL / 30d</div>
            <p className="mt-3 text-sm text-mute">{p.tagline}</p>
            <ul className="mt-4 space-y-2 font-mono text-[11px] text-mute">
              {p.points.map((x) => (
                <li key={x}>· {x}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="panel mt-10 max-w-lg space-y-4 rounded-2xl p-6">
        <div className="font-mono text-[10px] tracking-[0.28em] text-mute">SEAT · {selected.name.toUpperCase()}</div>
        <WalletConnect />
        <input
          value={pubkey}
          onChange={(e) => setPubkey(e.target.value)}
          placeholder="Wallet"
          className="w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-xs outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email if you want Pulse"
          className="w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-xs outline-none"
        />
        <button onClick={subscribe} className="btn-acid w-full rounded-full py-3 font-mono text-xs">
          Seat {selected.name} · {selected.sol} SOL
        </button>
        {msg && <p className="font-mono text-sm text-acid">{msg}</p>}
      </div>
    </main>
  );
}
