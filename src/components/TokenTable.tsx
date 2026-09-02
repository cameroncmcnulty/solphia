"use client";

export function TokenTable({
  rows,
  openMints,
  onBuy,
  onSell,
}: {
  rows: any[];
  openMints?: string[];
  onBuy?: (mint: string, strategy?: string) => void;
  onSell?: (mint: string) => void;
}) {
  const held = new Set(openMints || []);
  if (!rows?.length) {
    return (
      <div className="panel rounded-2xl p-8 text-center">
        <p className="font-display text-xl text-ghost">Nothing here right now.</p>
        <p className="mt-2 text-sm text-mute">She is watching the tape. Names appear when the feeds tick.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const t = row.token || row;
        const r = row.report || { score: 0, verdict: "skip", why: "" };
        const take = r.verdict === "trade" && !r.vetoed;
        const inBook = held.has(t.mint);
        const why = String(r.why || r.summary || "").replace(/^Skip — |^Wait — |^Take it — /, "");
        return (
          <div key={t.mint} className="panel rounded-2xl p-4">
            <div className="flex items-start gap-3">
              {t.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-full bg-line" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-ghost">{t.symbol}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] ${
                      take ? "bg-acid/15 text-acid" : r.verdict === "wait" ? "text-cyan" : "text-blood"
                    }`}
                  >
                    {take ? "TAKE" : r.verdict === "wait" ? "WAIT" : "SKIP"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-mute">{why || "No read yet."}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-lg text-ghost">{r.score}</div>
                {r.pGrad != null && (
                  <div className="font-mono text-[10px] text-mute">{Math.round(r.pGrad * 100)}%</div>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {take && (
                <button
                  onClick={() => onBuy?.(t.mint, r.allowedStrategies?.[0])}
                  className="btn-acid min-h-[44px] flex-1 rounded-full px-4 font-mono text-[11px]"
                >
                  Buy
                </button>
              )}
              {inBook && (
                <button
                  onClick={() => onSell?.(t.mint)}
                  className="btn-ghost min-h-[44px] flex-1 rounded-full px-4 font-mono text-[11px]"
                >
                  Sell
                </button>
              )}
              {!take && !inBook && (
                <div className="min-h-[44px] flex-1 rounded-full border border-violet/20 px-4 py-3 text-center font-mono text-[11px] text-mute">
                  She passed
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
