"use client";

import { useMarket } from "@/lib/hooks";

export function LiveStats({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useMarket(12000);
  const paper = data?.paper;
  const lab = data?.lab;
  const mind = data?.mind;
  const refused = lab
    ? (lab.copy?.denied || 0) + (lab.launch?.denied || 0) + (lab.migrate?.denied || 0) + (lab.pick?.denied || 0)
    : 0;
  const watching = (data?.tokens || []).length;
  const live = Boolean(data?.lastTickAt) && Date.now() - data.lastTickAt < 45_000;
  const pnl = paper ? paper.equityUsd - paper.startingUsd : 0;
  const items = [
    { k: "Status", v: loading ? "…" : live ? "LIVE" : "IDLE", sub: live ? "feeds ticking" : "waiting on tape" },
    {
      k: "Paper book",
      v: paper ? `$${paper.equityUsd.toFixed(0)}` : "—",
      sub: paper ? `${pnl >= 0 ? "+" : "−"}$${Math.abs(pnl).toFixed(0)} after fees` : "marks, not hype",
    },
    { k: "Open", v: paper ? String(paper.open) : "0", sub: `${paper?.trades || 0} closed` },
    { k: "Refused", v: String(refused), sub: "names she skipped" },
    { k: "Watching", v: String(watching), sub: "scored this tick" },
    { k: "Mind bar", v: mind ? `${Math.round((mind.pickThreshold || 0) * 100)}%` : "76%", sub: `${mind?.studied || 0} studied` },
  ];
  return (
    <div className={`border-y border-violet/25 bg-void/80 ${compact ? "px-3 py-3" : "px-4 py-4 md:px-10"}`}>
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-violet">
        <span className={`h-2 w-2 rounded-full ${live ? "bg-acid shadow-[0_0_10px_#14F195]" : "bg-mute"}`} />
        LIVE STATS · PAPER
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
        {items.map((s) => (
          <div key={s.k} className="min-w-[42%] shrink-0 sm:min-w-0">
            <div className="font-mono text-[11px] tracking-[0.16em] text-mute">{s.k}</div>
            <div className="truncate font-display text-xl text-acid sm:text-2xl">{s.v}</div>
            <div className="truncate font-mono text-[11px] text-mute">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
