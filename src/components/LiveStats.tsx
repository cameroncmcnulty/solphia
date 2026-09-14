"use client";

import { useEffect, useState } from "react";
import { useMarket } from "@/lib/hooks";

type Bt = { ready?: boolean; pnlPct?: number; trades?: number; winRate?: number; horizon?: string };

export function LiveStats({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useMarket(12_000);
  const [bt, setBt] = useState<Bt | null>(null);
  const pair = data?.pair;
  const ticking = Boolean(data?.lastTickAt) && Date.now() - data.lastTickAt < 60_000;

  useEffect(() => {
    let stop = false;
    fetch("/api/backtest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (stop) return;
        const one = j?.windows?.["1m"]?.[1] || j?.windows?.["1m"] || j;
        if (one?.ready) setBt(one);
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, []);

  const pnlPct = bt?.pnlPct || 0;
  const items = [
    { k: "Status", v: ticking ? "LIVE" : loading ? "…" : "DESK", sub: ticking ? "prices live" : "engine on" },
    {
      k: "1m backtest",
      v: bt?.ready ? `${pnlPct >= 0 ? "+" : ""}${(pnlPct * 100).toFixed(1)}%` : "—",
      sub: bt?.ready ? `${bt.trades || 0} clips · ${Math.round((bt.winRate || 0) * 100)}% win` : "fees in",
    },
    { k: "SOL", v: pair?.solUsd ? `$${Number(pair.solUsd).toFixed(0)}` : "—", sub: "her home bag" },
    { k: "S&P 500", v: pair?.spyxUsd ? `$${Number(pair.spyxUsd).toFixed(0)}` : "—", sub: "SPYx" },
    { k: "Nasdaq", v: pair?.qqqxUsd ? `$${Number(pair.qqqxUsd).toFixed(0)}` : "—", sub: "QQQx" },
    { k: "Gold", v: pair?.gldxUsd ? `$${Number(pair.gldxUsd).toFixed(0)}` : "—", sub: "GLDx" },
  ];
  return (
    <div className={`border-y border-violet/25 bg-void/80 ${compact ? "px-3 py-3" : "px-4 py-4 md:px-10"}`}>
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-violet">
        <span className={`h-2 w-2 rounded-full ${ticking ? "bg-acid shadow-[0_0_10px_#14F195]" : "bg-mute"}`} />
        LIVE DESK · BACKTEST · SOL · SPYx · QQQx · GLDx
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((s) => (
          <div key={s.k} className="min-w-0">
            <div className="font-mono text-[10px] tracking-[0.16em] text-mute sm:text-[11px]">{s.k}</div>
            <div className={`truncate font-display text-lg sm:text-2xl ${s.k === "1m backtest" && pnlPct < 0 ? "text-blood" : "text-acid"}`}>
              {s.v}
            </div>
            <div className="truncate font-mono text-[10px] text-mute sm:text-[11px]">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
