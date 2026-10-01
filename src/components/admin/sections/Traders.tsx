"use client";

import { useAdmin } from "../AdminProvider";
import { money, shortPk } from "../ui";

export function TradersSection() {
  const { data, patch, busy } = useAdmin();
  if (!data) return null;

  return (
    <div className="panel rounded-2xl p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">BOTS</div>
          <p className="mt-1 max-w-xl text-sm text-mute">
            Personal books. Seats and comps live under Users. 2×/3× is Jupiter SOL-PERP, not fake pad leverage.
          </p>
        </div>
      </div>
      {data.traders.length === 0 && <p className="mt-3 text-sm text-mute">No personal books yet.</p>}
      <div className="mt-2 max-h-[40rem] space-y-3 overflow-auto">
        {data.traders.map((t) => (
          <div key={t.owner} className="border-b border-line/60 pb-2 font-mono text-[11px] last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-2 text-ghost">
              <span>{shortPk(t.owner)}</span>
              <span className={t.killed ? "text-blood" : t.mode === "live" ? "text-acid" : "text-cyan"}>
                {t.killed ? "KILL" : t.mode.toUpperCase()}
                {t.leverage > 1 ? ` · SOL ${t.leverage}×` : ""}
                {t.delegated ? " · 24/7" : ""}
                {t.pending ? " · CLIP" : ""}
              </span>
            </div>
            <div className="mt-1 text-mute">
              {money(t.equityUsd)} · {t.pnlPct >= 0 ? "+" : ""}
              {(t.pnlPct * 100).toFixed(2)}% · {t.depositedSol.toFixed(3)} SOL in · {t.trades} trades
            </div>
            {t.lastAction && <div className="mt-1 text-mute">{t.lastAction}</div>}
            <div className="mt-2 flex flex-wrap gap-1">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ traderLive: { owner: t.owner, leverage: n } })}
                  className={`rounded-full px-2 py-0.5 ${t.leverage === n ? "bg-acid/20 text-acid" : "border border-violet/30 text-mute"}`}
                >
                  {n === 1 ? "spot" : `${n}×`}
                </button>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ traderLive: { owner: t.owner, mode: t.mode === "live" ? "paper" : "live" } })}
                className={`rounded-full px-2 py-0.5 ${t.mode === "live" ? "bg-acid/20 text-acid" : "border border-violet/30 text-mute"}`}
              >
                {t.mode === "live" ? "LIVE" : "arm live"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
