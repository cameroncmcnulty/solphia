"use client";

import { useMemo, useState } from "react";
import { useMarket } from "@/lib/hooks";
import { LivePnl } from "./LivePnl";
import { TokenTable } from "./TokenTable";
import { SolphiaFace } from "./SolphiaFace";
import type { Strategy } from "@/lib/types";

export function TerminalClient({
  title,
  blurb,
  strategy,
}: {
  title: string;
  blurb: string;
  strategy?: Strategy;
}) {
  const { data, err, loading, refresh } = useMarket(12000);
  const [msg, setMsg] = useState("");
  const paper = data?.paper;
  const rows = useMemo(() => {
    const list = data?.tokens || [];
    if (!strategy) return list;
    return list.filter((r: any) => r.report?.allowedStrategies?.includes(strategy));
  }, [data, strategy]);

  async function act(action: "buy" | "sell", mint: string, strat?: string) {
    const r = await fetch("/api/paper", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, mint, strategy: strat || strategy }),
    });
    const j = await r.json();
    setMsg(j.error || j.fill?.reason || action);
    refresh();
  }

  return (
    <main className="px-5 pb-24 md:px-8">
      <div className="mb-8 grid items-center gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.4em] text-cyan">TESTING STAGE · PAPER FILLS ON REAL EVENTS</p>
          <h1 className="mt-2 font-display text-5xl text-ghost md:text-6xl">{title}</h1>
          <p className="mt-3 max-w-2xl font-serif text-xl text-mute">{blurb}</p>
        </div>
        <div className="flex justify-center">
          <SolphiaFace size={280} />
        </div>
      </div>

      {paper && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <LivePnl equity={paper.equityUsd} start={paper.startingUsd} pnlPct={paper.pnlPct} open={paper.open} />
          <div className="panel rounded-2xl px-5 py-4">
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">REALIZED / FEES</div>
            <div className="mt-2 font-display text-3xl text-ghost">${paper.realizedPnlUsd.toFixed(2)}</div>
            <div className="mt-1 font-mono text-xs text-mute">
              fees ${paper.feesPaidUsd.toFixed(2)} · slip ${paper.slippagePaidUsd.toFixed(2)} · {paper.winCount}W/{paper.lossCount}L
            </div>
          </div>
          <div className="panel rounded-2xl px-5 py-4">
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ENGINE</div>
            <div className="mt-2 font-display text-3xl text-acid">0.35%</div>
            <div className="mt-1 font-mono text-xs text-mute">vs ~1% industry · narrower filters · auto tick {loading ? "…" : "live"}</div>
          </div>
        </div>
      )}

      {err && <p className="mb-4 font-mono text-blood">{err}</p>}
      {msg && <p className="mb-4 font-mono text-cyan">{msg}</p>}

      <TokenTable rows={rows} onBuy={(m, s) => act("buy", m, s)} onSell={(m) => act("sell", m)} />

      {paper?.fills?.length > 0 && (
        <div className="mt-8 panel rounded-2xl p-5">
          <div className="mb-3 font-mono text-[10px] tracking-[0.3em] text-mute">BLOTTER</div>
          <div className="space-y-2">
            {paper.fills.slice(0, 16).map((f: any) => (
              <div key={f.id} className="flex justify-between gap-4 font-mono text-xs">
                <span className={f.side === "buy" ? "text-acid" : "text-blood"}>{f.side.toUpperCase()}</span>
                <span className="text-ghost">{f.symbol}</span>
                <span className="text-mute">{f.strategy}</span>
                <span>${f.sizeUsd.toFixed(2)}</span>
                <span className={f.pnlUsd >= 0 ? "text-acid" : "text-blood"}>
                  {f.pnlUsd == null ? "—" : `${f.pnlUsd >= 0 ? "+" : ""}${f.pnlUsd.toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
