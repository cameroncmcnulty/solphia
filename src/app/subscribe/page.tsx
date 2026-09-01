"use client";

import { useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";

export default function SubscribePage() {
  const [email, setEmail] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [msg, setMsg] = useState("");

  async function paperSub() {
    const r = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pubkey: pubkey || "11111111111111111111111111111111", email, paper: true }),
    });
    const j = await r.json();
    setMsg(j.error || `Paper subscription until ${new Date(j.subscribedUntil).toLocaleDateString()}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24">
      <p className="font-mono text-[11px] tracking-[0.4em] text-cyan">THE WIRE</p>
      <h1 className="mt-2 font-display text-5xl text-ghost">0.15 SOL / month</h1>
      <p className="mt-4 font-serif text-xl text-mute">
        Alerts in a dark, exact email. Copy, launch, and migration pulses. You keep the keys. Solphia never holds SOL
        besides the subscription payment to the treasury.
      </p>
      <div className="mt-8 panel rounded-2xl p-6 space-y-4">
        <WalletConnect />
        <input
          value={pubkey}
          onChange={(e) => setPubkey(e.target.value)}
          placeholder="Wallet address"
          className="w-full rounded-full border border-line bg-void px-4 py-3 font-mono text-xs outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email for the wire"
          className="w-full rounded-full border border-line bg-void px-4 py-3 font-mono text-xs outline-none"
        />
        <button onClick={paperSub} className="btn-acid w-full rounded-full py-3 font-mono text-xs">
          PAPER SUBSCRIBE (TESTING)
        </button>
        <p className="font-mono text-[11px] text-mute">
          Live 0.15 SOL transfer unlocks when SOLPHIA_TREASURY is set. Until then this flags your seat on the paper wire.
        </p>
        {msg && <p className="font-mono text-sm text-acid">{msg}</p>}
      </div>
    </main>
  );
}
