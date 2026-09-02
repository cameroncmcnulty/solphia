"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/plans";
import { WalletConnect } from "@/components/WalletConnect";
import { PlanCompare } from "@/components/PlanCompare";
import { FaqList } from "@/components/FaqList";

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
    setMsg(j.error || `${selected.name} on until ${new Date(j.subscribedUntil).toLocaleDateString()}`);
  }

  return (
    <main className="pb-24">
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
        <p className="text-base text-acid">Pricing</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ghost sm:text-6xl">Four desks. Paper is free.</h1>
        <p className="mt-4 max-w-xl text-lg text-mute">30 days in SOL. Everything is 0.50 — cheaper than buying them separate.</p>

        <Link
          href="/trading"
          className="panel mt-8 flex items-center gap-4 rounded-3xl p-4 sm:p-5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/plan-paper.jpg" alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl text-ghost">Paper</div>
            <p className="text-sm text-mute">Live tape. Fake fills. No SOL at risk.</p>
          </div>
          <span className="btn-acid min-h-[44px] shrink-0 rounded-full px-5 text-sm">Try free</span>
        </Link>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => {
            const on = plan === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                className={`panel rounded-3xl p-5 text-left transition ${
                  on ? "ring-2 ring-acid shadow-[0_0_40px_rgba(20,241,149,0.18)]" : ""
                }`}
              >
                {p.featured && (
                  <div className="mb-3 font-mono text-[10px] tracking-[0.2em] text-acid">BEST VALUE</div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.icon} alt="" className="h-16 w-16 rounded-2xl" />
                <div className="mt-4 font-display text-2xl text-ghost">{p.name}</div>
                <div className="mt-1 font-display text-3xl text-acid">
                  {p.sol} <span className="text-lg text-mute">SOL</span>
                </div>
                <p className="mt-2 text-sm text-mute">{p.tagline}</p>
                <ul className="mt-4 space-y-2 text-sm text-ghost">
                  {p.points.map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-acid text-void">
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3.2 8.4l3.1 3.1 6.5-7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
                <div className={`mt-6 min-h-[48px] w-full rounded-full text-sm ${on ? "btn-acid" : "btn-ghost"}`}>
                  {on ? "Selected" : "Choose"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="panel mt-8 grid gap-6 rounded-3xl p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div>
            <p className="text-sm text-acid">Checkout</p>
            <h2 className="mt-1 font-display text-3xl text-ghost">{selected.name}</h2>
            <p className="mt-2 text-mute">{selected.story}</p>
            <p className="mt-4 font-display text-4xl text-acid">
              {selected.sol} SOL <span className="text-lg text-mute">/ 30 days</span>
            </p>
          </div>
          <div className="space-y-3">
            <WalletConnect />
            <input
              value={pubkey}
              onChange={(e) => setPubkey(e.target.value)}
              placeholder="Wallet"
              className="w-full rounded-full border border-violet/30 bg-void px-5 py-3 text-sm outline-none"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email for alerts"
              className="w-full rounded-full border border-violet/30 bg-void px-5 py-3 text-sm outline-none"
            />
            <button onClick={subscribe} className="btn-acid min-h-[52px] w-full rounded-full text-base">
              Pay {selected.sol} SOL
            </button>
            {msg && <p className="text-sm text-acid">{msg}</p>}
          </div>
        </div>

        <h2 className="mt-14 font-display text-3xl text-ghost">Compare</h2>
        <p className="mt-2 text-mute">Same kill switch on every plan.</p>
        <div className="mt-5">
          <PlanCompare />
        </div>

        <h2 className="mt-14 font-display text-3xl text-ghost">Questions</h2>
        <div className="mt-5 max-w-3xl">
          <FaqList limit={5} />
        </div>
      </div>
    </main>
  );
}
