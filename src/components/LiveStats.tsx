"use client";

import { useMarket } from "@/lib/hooks";

export function LiveStats({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useMarket(12_000);
  const paper = data?.paper || {
    equityUsd: 1000,
    startingUsd: 1000,
    pnlPct: 0,
    trades: 0,
  };
  const pair = data?.pair;
  const ticking = Boolean(data?.lastTickAt) && Date.now() - data.lastTickAt < 60_000;
  const pnlUsd = paper ? paper.equityUsd - paper.startingUsd : 0;
  const pnlPct = paper?.pnlPct ?? (paper?.startingUsd ? pnlUsd / paper.startingUsd : 0);
  const items = [
    { k: "Status", v: loading && !data?.paper ? "…" : "PAPER", sub: ticking || data?.paper ? "running" : "warming up" },
    {
      k: "PnL",
      v: paper ? `${pnlPct >= 0 ? "+" : ""}${(pnlPct * 100).toFixed(1)}%` : "—",
      sub: paper ? `${pnlUsd >= 0 ? "+" : "−"}$${Math.abs(pnlUsd).toFixed(2)}` : "after fees",
    },
    {
      k: "Paper book",
      v: paper ? `$${paper.equityUsd.toFixed(0)}` : "—",
      sub: paper ? `${paper.trades || 0} trades` : "PnL in USDC",
    },
    { k: "SOL", v: pair?.solUsd ? `$${Number(pair.solUsd).toFixed(0)}` : "—", sub: "her home bag" },
    { k: "S&P 500", v: pair?.spyxUsd ? `$${Number(pair.spyxUsd).toFixed(0)}` : "—", sub: "SPYx" },
    { k: "Nasdaq", v: pair?.qqqxUsd ? `$${Number(pair.qqqxUsd).toFixed(0)}` : "—", sub: "QQQx" },
    { k: "Gold", v: pair?.gldxUsd ? `$${Number(pair.gldxUsd).toFixed(0)}` : "—", sub: "GLDx" },
  ];
  return (
    <div className={`border-y border-violet/25 bg-void/80 ${compact ? "px-3 py-3" : "px-4 py-4 md:px-10"}`}>
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-violet">
        <span className={`h-2 w-2 rounded-full ${ticking || paper ? "bg-acid shadow-[0_0_10px_#14F195]" : "bg-mute"}`} />
        LIVE STATS · PAPER ON · SOL · SPYx · QQQx · GLDx
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {items.map((s) => (
          <div key={s.k} className="min-w-0">
            <div className="font-mono text-[10px] tracking-[0.16em] text-mute sm:text-[11px]">{s.k}</div>
            <div className={`truncate font-display text-lg sm:text-2xl ${s.k === "PnL" && pnlUsd < 0 ? "text-blood" : "text-acid"}`}>
              {s.v}
            </div>
            <div className="truncate font-mono text-[10px] text-mute sm:text-[11px]">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
