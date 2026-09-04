"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { WalletConnect } from "@/components/WalletConnect";
import { PlanCompare } from "@/components/PlanCompare";
import { FaqList } from "@/components/FaqList";

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [msg, setMsg] = useState("");
  const selected = PLANS[0];

  async function subscribe() {
    const r = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pubkey: pubkey || "11111111111111111111111111111111",
        email,
        paper: true,
        plan: "live",
      }),
    });
    const j = await r.json();
    setMsg(j.error || `${selected.name} on until ${new Date(j.subscribedUntil).toLocaleDateString()}`);
  }

  return (
    <main className="pb-24">
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
        <p className="text-base text-acid">Pricing</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ghost sm:text-6xl">Paper is free. Live is simple.</h1>
        <p className="mt-4 max-w-xl text-lg text-mute">
          One bot. SOL ↔ official SPYx. No four-desk menu. 0.15 SOL / 30 days when live is actually on.
        </p>

        <Link href="/trading" className="panel mt-8 flex items-center gap-4 rounded-3xl p-4 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/plan-paper.jpg" alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl text-ghost">Paper</div>
            <p className="text-sm text-mute">Live oracles. Fake fills. Skip tape. No SOL at risk.</p>
          </div>
          <span className="btn-acid min-h-[44px] shrink-0 rounded-full px-5 text-sm">Try free</span>
        </Link>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="panel rounded-3xl p-5 ring-2 ring-acid shadow-[0_0_40px_rgba(20,241,149,0.18)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.icon} alt="" className="h-16 w-16 rounded-2xl" />
            <div className="mt-4 font-display text-2xl text-ghost">{selected.name}</div>
            <div className="mt-1 font-display text-3xl text-acid">
              {selected.sol} <span className="text-lg text-mute">SOL / 30d</span>
            </div>
            <p className="mt-2 text-sm text-mute">{selected.tagline}</p>
            <ul className="mt-4 space-y-2 text-sm text-ghost">
              {selected.points.map((x) => (
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
          </div>
          <div className="panel rounded-3xl p-5">
            <div className="font-mono text-[11px] tracking-[0.2em] text-violet">WAITLIST</div>
            <p className="mt-2 text-base text-mute">Paper runs now. Live needs the flag and your signature on every swap.</p>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email (optional)"
              className="mt-4 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 text-ghost"
            />
            <input
              value={pubkey}
              onChange={(e) => setPubkey(e.target.value)}
              placeholder="wallet"
              className="mt-3 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 text-ghost"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <WalletConnect />
              <button type="button" onClick={subscribe} className="btn-ghost min-h-[48px] rounded-full px-6">
                Save seat
              </button>
            </div>
            {msg && <p className="mt-3 font-mono text-sm text-acid">{msg}</p>}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-3xl text-ghost">Compare</h2>
          <div className="mt-6">
            <PlanCompare />
          </div>
        </div>

        <div className="mt-12 max-w-3xl">
          <h2 className="font-display text-3xl text-ghost">FAQ</h2>
          <div className="mt-6">
            <FaqList limit={4} />
          </div>
        </div>
      </div>
    </main>
  );
}
