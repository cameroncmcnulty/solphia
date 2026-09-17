"use client";

export function LivePnl({
  equity,
  start,
  pnlPct,
  open,
}: {
  equity: number;
  start: number;
  pnlPct: number;
  open: number;
}) {
  const up = equity >= start;
  return (
    <div className="panel rounded-2xl px-5 py-4">
      <div className="font-mono text-[10px] tracking-[0.35em] text-cyan">
        {start > 0 ? `LIVE BOOK · $${start.toFixed(0)} START` : "LIVE BOOK"}
      </div>
      <div className={`stat-num mt-1 text-4xl ${up ? "text-acid" : "text-blood"}`}>
        ${equity.toFixed(2)}
      </div>
      <div className="mt-1 flex gap-4 font-mono text-xs text-mute">
        <span className={up ? "text-acid" : "text-blood"}>
          {up ? "+" : ""}
          {(pnlPct * 100).toFixed(2)}%
        </span>
        <span>{open} open</span>
        <span>marked book</span>
      </div>
    </div>
  );
}
