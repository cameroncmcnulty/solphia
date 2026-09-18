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
  const [boosts, setBoosts] = useState<{ id: string; symbol: string; rockets: number; mega?: boolean; house?: boolean; endsAt: number }[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/launch", { cache: "no-store" });
    const j = await r.json();
    if (Array.isArray(j.coins)) setCoins(j.coins);
    if (Array.isArray(j.boosts)) setBoosts(j.boosts);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini k="Coins on pad" v={String(data.launchCount)} />
        <Mini k="Owner earnings" v={`${data.ownerEarningsSol.toFixed(4)} SOL`} />
        <Mini k="Treasury pad fees" v={`${(data.treasuryFeesSol || 0).toFixed(4)} SOL`} />
        <Mini k="Venue" v="Solphia curve · 1%" />
      </div>
      <section className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">SOLPHIA BONDING CURVE</div>
        <h2 className="mt-1 font-display text-2xl text-ghost">Same pad as the website</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Mainnet program 5s26ZJDhyErFMx3ELo9CYXS3Y5BcwZvQ5EceYq8WFv4d. 1.00% total — under Pump.fun’s 1.25%.
          Creators take 50% of that fee on-chain. $SPHA itself still launches from Project.
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
      {boosts.length > 0 && (
        <section className="panel rounded-2xl p-5">
          <h2 className="font-display text-2xl text-ghost">Live boosts</h2>
          <div className="mt-3 space-y-2">
            {boosts.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-acid/20 px-3 py-2">
                <div>
                  <div className="font-display text-ghost">${b.symbol}</div>
                  <div className="font-mono text-[10px] text-mute">
                    {b.rockets} rockets{b.mega ? " · mega" : ""}
                    {b.house ? " · house" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-blood"
                  onClick={async () => {
                    await fetch("/api/admin/launch", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ expireBoost: b.id }),
                    });
                    load().catch(() => {});
                  }}
                >
                  End
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
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
