"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CopyCa } from "@/components/CopyCa";
import { TokenSocials } from "@/components/TokenSocials";

type Coin = {
  id: string;
  mint?: string;
  name: string;
  symbol: string;
  status: string;
  marketCapUsd: number;
  marketCapSol: number;
  progress: number;
  holders: number;
  links?: { website?: string; x?: string; telegram?: string; discord?: string };
};

function tick(symbol?: string) {
  const s = (symbol || "").replace(/^\$+/, "").replace(/\*+$/, "").trim();
  return s ? `$${s}*` : "";
}

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
          <div key={c.id} className="panel flex items-center justify-between gap-3 rounded-2xl p-4">
            <Link href="/launch" className="min-w-0 flex-1">
              <div className="font-display text-xl text-ghost">
                {c.name} <span className="font-mono text-sm text-mute">{tick(c.symbol)}</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-mute">
                {c.status} · {c.holders} holders · {Math.round(c.progress * 100)}%
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <TokenSocials links={c.links} />
              {c.mint ? <CopyCa ca={c.mint} compact /> : null}
              <div className="font-mono text-acid">
                {c.marketCapUsd ? `$${c.marketCapUsd.toFixed(0)}` : `${c.marketCapSol.toFixed(1)} SOL`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
