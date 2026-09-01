"use client";

import { SafetyBadge } from "./SafetyBadge";

export function TokenTable({
  rows,
  onBuy,
  onSell,
}: {
  rows: any[];
  onBuy?: (mint: string, strategy?: string) => void;
  onSell?: (mint: string) => void;
}) {
  if (!rows?.length) {
    return <div className="panel rounded-2xl p-8 font-mono text-sm text-mute">Waiting for live feeds…</div>;
  }
  return (
    <div className="space-y-2 md:space-y-0 md:overflow-hidden md:rounded-2xl md:border md:border-violet/20">
      <div className="hidden grid-cols-12 gap-2 border-b border-line px-4 py-3 font-mono text-[10px] tracking-[0.2em] text-mute md:grid">
        <div className="col-span-3">TOKEN</div>
        <div className="col-span-2">VENUE</div>
        <div className="col-span-2">MCAP</div>
        <div className="col-span-2">SAFETY</div>
        <div className="col-span-3 text-right">ACTION</div>
      </div>
      <div className="max-h-[70vh] overflow-auto md:max-h-[640px]">
        {rows.map((row) => {
          const t = row.token || row;
          const r = row.report || { score: 0, grade: "X", verdict: "skip", why: "", allowedStrategies: [] };
          return (
            <div key={t.mint} className="panel mb-2 rounded-2xl p-3 md:mb-0 md:grid md:grid-cols-12 md:items-center md:gap-2 md:rounded-none md:border-0 md:border-b md:border-line/60 md:bg-transparent md:p-4 md:shadow-none">
              <div className="flex items-center gap-3 md:col-span-3">
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" className="h-10 w-10 rounded-full object-cover md:h-8 md:w-8" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-line md:h-8 md:w-8" />
                )}
                <div className="min-w-0">
                  <div className="font-display text-base text-ghost md:text-sm">{t.symbol}</div>
                  <div className="truncate font-mono text-[10px] text-mute">{t.name} · {t.venue}</div>
                </div>
                <div className="ml-auto md:hidden">
                  <SafetyBadge score={r.score} verdict={r.verdict} />
                </div>
              </div>
              <div className="hidden font-mono text-[11px] uppercase text-cyan md:col-span-2 md:block">{t.venue}</div>
              <div className="mt-2 font-mono text-sm md:col-span-2 md:mt-0">${Math.round(t.marketCapUsd || 0).toLocaleString()}</div>
              <div className="hidden md:col-span-2 md:block">
                <SafetyBadge score={r.score} verdict={r.verdict} />
              </div>
              <div className="mt-2 font-mono text-[11px] leading-snug text-mute md:col-span-12">
                {r.why || r.summary}
              </div>
              <div className="mt-3 flex gap-2 md:col-span-3 md:mt-0 md:justify-end">
                <button
                  onClick={() => onBuy?.(t.mint, r.allowedStrategies?.[0])}
                  disabled={r.vetoed || r.verdict === "skip"}
                  className="btn-acid min-h-[44px] flex-1 rounded-full px-3 font-mono text-[11px] disabled:opacity-30 md:min-h-0 md:flex-none md:py-1.5"
                >
                  COPY THIS
                </button>
                <button onClick={() => onSell?.(t.mint)} className="btn-ghost min-h-[44px] flex-1 rounded-full px-3 font-mono text-[11px] md:min-h-0 md:flex-none md:py-1.5">
                  FLAT
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
