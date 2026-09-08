"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  status: string;
  marketCapUsd: number;
  marketCapSol: number;
  progress: number;
  holders: number;
};

export default function TokenPage() {
  const [coins, setCoins] = useState<Coin[]>([]);
  useEffect(() => {
    fetch("/api/launch")
      .then((r) => r.json())
      .then((j) => setCoins(j.coins || []))
      .catch(() => setCoins([]));
  }, []);
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-acid">TOKEN · CURVE + GRADUATES</p>
      <h1 className="mt-2 font-display text-4xl text-ghost sm:text-6xl">Every coin on her curve.</h1>
      <p className="mt-4 max-w-xl text-mute">Fair launches only. Trade them on Launch. Full token desk comes next.</p>
      <div className="mt-8 space-y-2">
        {coins.length === 0 && <p className="text-sm text-mute">Nothing launched yet.</p>}
        {coins.map((c) => (
          <Link
            key={c.id}
            href="/launch"
            className="panel flex items-center justify-between rounded-2xl p-4"
          >
            <div>
              <div className="font-display text-xl text-ghost">
                {c.name} <span className="font-mono text-sm text-mute">{c.symbol}</span>
              </div>
              <div className="font-mono text-[11px] text-mute">
                {c.status} · {c.holders} holders · {Math.round(c.progress * 100)}%
              </div>
            </div>
            <div className="font-mono text-acid">
              {c.marketCapUsd ? `$${c.marketCapUsd.toFixed(0)}` : `${c.marketCapSol.toFixed(1)} SOL`}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
