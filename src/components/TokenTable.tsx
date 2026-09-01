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
    <div className="panel overflow-hidden rounded-2xl">
      <div className="grid grid-cols-12 gap-2 border-b border-line px-4 py-3 font-mono text-[10px] tracking-[0.2em] text-mute">
        <div className="col-span-3">TOKEN</div>
        <div className="col-span-2">VENUE</div>
        <div className="col-span-2">MCAP</div>
        <div className="col-span-2">SAFETY</div>
        <div className="col-span-3 text-right">ACTION</div>
      </div>
      <div className="max-h-[640px] overflow-auto">
        {rows.map((row) => {
          const t = row.token || row;
          const r = row.report || { score: 0, grade: "X", allowedStrategies: [] };
          return (
            <div key={t.mint} className="grid grid-cols-12 items-center gap-2 border-b border-line/60 px-4 py-3 hover:bg-white/[0.03]">
              <div className="col-span-3 flex items-center gap-3">
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-line" />
                )}
                <div>
                  <div className="font-display text-sm text-ghost">{t.symbol}</div>
                  <div className="truncate font-mono text-[10px] text-mute">{t.name}</div>
                </div>
              </div>
              <div className="col-span-2 font-mono text-[11px] uppercase text-cyan">{t.venue}</div>
              <div className="col-span-2 font-mono text-sm">${Math.round(t.marketCapUsd || 0).toLocaleString()}</div>
              <div className="col-span-2">
                <SafetyBadge score={r.score} grade={r.grade} />
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <button
                  onClick={() => onBuy?.(t.mint, r.allowedStrategies?.[0])}
                  disabled={r.vetoed}
                  className="btn-acid rounded-full px-3 py-1.5 font-mono text-[10px] disabled:opacity-30"
                >
                  PAPER BUY
                </button>
                <button onClick={() => onSell?.(t.mint)} className="btn-ghost rounded-full px-3 py-1.5 font-mono text-[10px]">
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
