"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/plans";
import { WalletConnect } from "@/components/WalletConnect";
import { PlanCompare } from "@/components/PlanCompare";
import { FaqList } from "@/components/FaqList";
import { LiveStats } from "@/components/LiveStats";

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
    <main className="pb-8 md:pb-24">
      <LiveStats compact />
      <div className="mx-auto max-w-6xl px-4 pt-8 md:px-8">
        <p className="font-mono text-[11px] tracking-[0.28em] text-violet">PRICING</p>
        <h1 className="mt-2 font-display text-3xl text-ghost sm:text-5xl">Pay for the desk you actually use.</h1>
        <p className="mt-4 max-w-2xl text-mute">
          Paper is free. Paid plans are 30 days in SOL. Everything is 0.50 — Alerts + Copy + Launch bought separate is
          0.70. 0.35% on fills, not the ~1% the other terminals take.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              className={`panel rounded-2xl p-5 text-left ${plan === p.id ? "border-acid/70 shadow-[0_0_40px_rgba(20,241,149,0.12)]" : ""}`}
            >
              <div className="font-mono text-[10px] tracking-[0.28em] text-violet">
                {p.featured ? "MOST PEOPLE WANT THIS" : "30 DAYS"}
              </div>
              <div className="mt-2 font-display text-2xl text-ghost">{p.name}</div>
              <div className="mt-1 font-mono text-2xl text-acid">{p.sol} SOL</div>
              <p className="mt-3 text-sm text-mute">{p.tagline}</p>
              <ul className="mt-4 space-y-2 font-mono text-[11px] text-mute">
                {p.points.map((x) => (
                  <li key={x}>✓ {x}</li>
                ))}
              </ul>
              <div className={`mt-5 min-h-[40px] rounded-full px-4 py-2 text-center font-mono text-[11px] ${plan === p.id ? "btn-acid" : "btn-ghost"}`}>
                {plan === p.id ? "Selected" : "Select"}
              </div>
            </button>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl text-ghost">Side-by-side</h2>
        <p className="mt-2 text-sm text-mute">Scroll sideways on a phone. Everything includes Picks.</p>
        <div className="mt-4">
          <PlanCompare />
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="panel rounded-2xl p-6">
            <div className="font-mono text-[10px] tracking-[0.22em] text-mute">VS 1% TERMINALS</div>
            <h3 className="mt-2 font-display text-2xl text-ghost">Fees that don’t eat the 3–8% move.</h3>
            <p className="mt-3 text-sm leading-relaxed text-mute">
              Axiom / Photon / BullX style desks take about 1% a side. On a 0.5 SOL fill that’s already the edge on a
              lot of meme wicks. Solphia is 0.35% on fills, plus a flat 30-day SOL plan if you want the wire.
            </p>
            <Link href="/auto" className="btn-ghost mt-5 inline-flex min-h-[44px] items-center rounded-full px-5 font-mono text-[11px]">
              Try the paper book
            </Link>
          </div>
          <div className="panel space-y-4 rounded-2xl p-6">
            <div className="font-mono text-[10px] tracking-[0.28em] text-mute">CHECKOUT · {selected.name.toUpperCase()}</div>
            <p className="text-sm leading-relaxed text-mute">{selected.story}</p>
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
              placeholder="Email if you want Pulse alerts"
              className="w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-xs outline-none"
            />
            <button onClick={subscribe} className="btn-acid min-h-[48px] w-full rounded-full py-3 font-mono text-xs">
              Start {selected.name} · {selected.sol} SOL
            </button>
            {msg && <p className="font-mono text-sm text-acid">{msg}</p>}
          </div>
        </div>

        <h2 className="mt-12 font-display text-2xl text-ghost">Pricing questions</h2>
        <div className="mt-4 max-w-3xl">
          <FaqList />
        </div>
      </div>
    </main>
  );
}
