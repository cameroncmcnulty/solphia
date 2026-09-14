"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../AdminProvider";
import { Mini } from "../ui";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  status: string;
  progress: number;
  realSol: number;
  marketCapUsd: number;
  holders: number;
  creator: string;
};

export function LaunchSection() {
  const { data, go } = useAdmin();
  const [coins, setCoins] = useState<Coin[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/launch", { cache: "no-store" });
    const j = await r.json();
    if (Array.isArray(j.coins)) setCoins(j.coins);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Mini k="Coins on pad" v={String(data.launchCount)} />
        <Mini k="Owner earnings" v={`${data.ownerEarningsSol.toFixed(4)} SOL`} />
        <Mini k="Swap fee" v="1% · 50 / 25 / 25" />
      </div>
      <section className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">SOLPHIA BONDING CURVE</div>
        <h2 className="mt-1 font-display text-2xl text-ghost">Same pad as the website</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Pump/Moonshot-style virtual AMM: 1B supply, 1% swap, 80% sold on the curve, 20% reserved for the community
          market at graduation. Image, ticker, blurb, and socials are required the same way on /launch. $SPHA itself
          launches from Project with that same metadata, then the 77.1% community-market slice is the tradeable float.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/launch" className="btn-acid rounded-full px-5 py-2 text-sm">
            Open public pad
          </a>
          <button type="button" onClick={() => go("wallets")} className="btn-ghost rounded-full px-5 py-2 text-sm">
            $SPHA launcher
          </button>
        </div>
      </section>
      <div className="space-y-2">
        {coins.length === 0 && <p className="text-sm text-mute">No Solphia-born coins yet. Launch from the public pad or mint $SPHA from Project.</p>}
        {coins.map((c) => (
          <a
            key={c.id}
            href={`/launch?id=${encodeURIComponent(c.id)}`}
            className="flex items-center gap-3 rounded-2xl border border-violet/20 bg-void/40 px-3 py-2 hover:border-acid/40"
          >
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-acid/15" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display text-ghost">${c.symbol}</div>
              <div className="truncate font-mono text-[10px] text-mute">
                {c.name} · {c.status} · {c.holders} holders
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-mute">
              <div>{(c.progress * 100).toFixed(0)}% curve</div>
              <div>{c.realSol.toFixed(2)} SOL</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
