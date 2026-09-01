"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMarket } from "@/lib/hooks";
import { TokenTable } from "./TokenTable";
import { SolphiaFace } from "./SolphiaFace";
import { WalletDesk } from "./WalletDesk";
import type { Strategy } from "@/lib/types";

const DESKS: { id: string; label: string; strategy?: Strategy }[] = [
  { id: "discover", label: "Discover" },
  { id: "copy", label: "Copy" },
  { id: "launch", label: "Launch", strategy: "launch_snipe" },
  { id: "migrate", label: "Migrate", strategy: "migration_snipe" },
  { id: "book", label: "Book" },
];

export function TerminalClient({
  forcedDesk,
}: {
  forcedDesk?: string;
}) {
  const params = useSearchParams();
  const initial = forcedDesk || params.get("desk") || "discover";
  const [desk, setDesk] = useState(initial);
  const { data, err, loading, refresh } = useMarket(12000);
  const [msg, setMsg] = useState("");
  const paper = data?.paper;
  const active = DESKS.find((d) => d.id === desk) || DESKS[0];

  const rows = useMemo(() => {
    const list = data?.tokens || [];
    if (!active.strategy) return list;
    return list.filter((r: any) => r.report?.allowedStrategies?.includes(active.strategy));
  }, [data, active]);

  async function act(action: "buy" | "sell", mint: string, strat?: string) {
    const r = await fetch("/api/paper", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, mint, strategy: strat || active.strategy }),
    });
    const j = await r.json();
    setMsg(j.error || j.fill?.reason || action);
    refresh();
  }

  return (
    <main className="px-5 pb-24 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.4em] text-violet">LIVE MARKET · PAPER FILLS</p>
          <h1 className="font-display text-4xl text-ghost">Terminal</h1>
        </div>
        {paper && (
          <div className="flex gap-6 font-mono text-sm">
            <div>
              <div className="text-[10px] tracking-[0.2em] text-mute">EQUITY</div>
              <div className="text-acid">${paper.equityUsd.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.2em] text-mute">PNL</div>
              <div className={paper.pnlPct >= 0 ? "text-acid" : "text-blood"}>
                {(paper.pnlPct * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.2em] text-mute">OPEN</div>
              <div>{paper.open}</div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {DESKS.map((d) => (
          <button
            key={d.id}
            onClick={() => setDesk(d.id)}
            className={`rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.18em] ${
              desk === d.id ? "bg-acid text-void" : "border border-violet/30 text-mute hover:text-ghost"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          {desk === "copy" && <WalletDesk />}
          {desk === "book" && paper && (
            <div className="panel rounded-2xl p-5">
              <div className="font-mono text-[10px] tracking-[0.3em] text-mute">BLOTTER</div>
              <div className="mt-4 space-y-2">
                {(paper.fills || []).slice(0, 24).map((f: any) => (
                  <div key={f.id} className="flex justify-between gap-3 font-mono text-xs">
                    <span className={f.side === "buy" ? "text-acid" : "text-blood"}>{f.side.toUpperCase()}</span>
                    <span>{f.symbol}</span>
                    <span className="text-mute">{f.strategy}</span>
                    <span>${Number(f.sizeUsd).toFixed(2)}</span>
                    <span className={f.pnlUsd >= 0 ? "text-acid" : "text-blood"}>
                      {f.pnlUsd == null ? "—" : `${f.pnlUsd >= 0 ? "+" : ""}${Number(f.pnlUsd).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {desk !== "copy" && desk !== "book" && (
            <TokenTable rows={rows} onBuy={(m, s) => act("buy", m, s)} onSell={(m) => act("sell", m)} />
          )}
          {err && <p className="mt-3 font-mono text-blood">{err}</p>}
          {msg && <p className="mt-3 font-mono text-acid">{msg}</p>}
        </div>
        <aside className="space-y-4">
          <div className="panel overflow-hidden rounded-2xl">
            <SolphiaFace mode="panel" />
          </div>
          <div className="panel rounded-2xl p-5">
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ENGINE</div>
            <p className="mt-2 text-sm text-mute">
              {loading ? "Syncing feeds…" : "Pump.fun, LaunchLab, Raydium, DexScreener live."} Safety score gates
              every paper fill. 0.35% fee already in the book.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
