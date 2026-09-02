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
    <div className={`border-y border-violet/25 bg-void/80 ${compact ? "px-3 py-2" : "px-4 py-3 md:px-10"}`}>
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-violet">
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-acid shadow-[0_0_10px_#14F195]" : "bg-mute"}`} />
        LIVE STATS · PAPER · NOT A FAKE COUNTER
      </div>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {items.map((s) => (
          <div key={s.k} className="min-w-0">
            <div className="font-mono text-[9px] tracking-[0.16em] text-mute">{s.k}</div>
            <div className="truncate font-display text-lg text-acid sm:text-xl">{s.v}</div>
            <div className="truncate font-mono text-[9px] text-mute">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
