"use client";

import { useAdmin } from "../AdminProvider";
import { fmtQty, money, num, tapeLabel } from "../ui";

export function DeskSection() {
  const { data } = useAdmin();
  if (!data) return null;
  const p = data.paper;
  const pair = data.pair;
  const tape = p.tape || [];

  return (
    <div className="space-y-6">
      <section className="panel rounded-2xl p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">PUBLIC BOOK</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">What she holds</h2>
          </div>
          <p className="max-w-lg text-sm text-mute">{p.lastAction || pair?.reason || p.lastSkipReason || "Waiting on prices."}</p>
        </div>
        {p.pendingIntent && (
          <p className="mt-3 font-mono text-xs text-acid">
            Pending {p.pendingIntent.from} → {p.pendingIntent.to} · {money(p.pendingIntent.clipUsd)} · {p.pendingIntent.reason}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {data.sleeves.map((s) => (
            <div key={s.id} className="rounded-2xl border border-line/80 bg-void/50 p-4">
              <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{s.name}</div>
              <div className="mt-1 truncate font-display text-2xl text-ghost">{fmtQty(s.qty, s.id)}</div>
              <div className="font-mono text-[11px] text-mute">{money(s.valueUsd)}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">LIVE TAPE</div>
          {tape.length === 0 && <p className="mt-3 text-sm text-mute">No clips yet.</p>}
          <div className="mt-2 max-h-80 space-y-2 overflow-auto">
            {tape.slice(0, 24).map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 font-mono text-[11px]">
                <span className={row.action === "trade" || row.action === "deploy" ? "text-acid" : "text-mute"}>
                  {tapeLabel(row.action)}
                  {row.from && row.to ? ` ${row.from}→${row.to}` : ""}
                </span>
                <span className="max-w-[65%] text-right text-mute">
                  {row.sizeUsd ? money(row.sizeUsd) + " · " : ""}
                  {row.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">FEEDS</div>
          {data.feedHealth.length === 0 && <p className="mt-3 text-sm text-mute">No tick yet.</p>}
          {data.feedHealth.map((f) => (
            <div key={`${f.source}-${f.at}`} className="mt-2 flex justify-between gap-3 font-mono text-[11px]">
              <span className="text-ghost">{f.source}</span>
              <span className={f.ok ? "text-acid" : "text-blood"}>{f.ok ? `${f.count} in ${f.ms}ms` : f.error || "down"}</span>
            </div>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 font-mono text-[11px] text-mute">
            <span>Helius {data.helius ? "ON" : "OFF"}</span>
            <span>Treasury {data.treasurySet ? "SET" : "OFF"}</span>
            <span>
              z7 {num(pair?.z7)} · z24 {num(pair?.z24)}
            </span>
            <span>{pair?.signal || "hold"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
