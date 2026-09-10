"use client";

import { useAdmin } from "../AdminProvider";
import { money, shortPk } from "../ui";

export function TradersSection() {
  const { data } = useAdmin();
  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">BOTS</div>
        {data.traders.length === 0 && <p className="mt-3 text-sm text-mute">No personal books yet.</p>}
        <div className="mt-2 max-h-[32rem] space-y-3 overflow-auto">
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
            </div>
          ))}
        </div>
      </div>
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">
          SEATS · {data.seatSol} / {data.seatSolLev} SOL / 30d
        </div>
        {data.seats.length === 0 && <p className="mt-3 text-sm text-mute">No seats yet.</p>}
        <div className="mt-2 max-h-[32rem] space-y-2 overflow-auto">
          {data.seats.map((u) => (
            <div key={u.pubkey} className="flex justify-between gap-3 font-mono text-[11px] text-ghost">
              <span>{shortPk(u.pubkey)}</span>
              <span className="text-mute">
                {u.admin ? "admin" : u.plan}
                {u.autoRenew ? " · auto" : ""}
                {u.paid && u.until ? ` · to ${new Date(u.until).toLocaleDateString()}` : u.admin ? "" : " · unpaid"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
