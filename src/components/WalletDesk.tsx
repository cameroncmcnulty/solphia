"use client";

import { useEffect, useState } from "react";

function money(n: number) {
  const sign = n >= 0 ? "+" : "-";
  const abs = Math.abs(n);
  const body = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`;
  return sign + body;
}

export function WalletDesk({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState({ source: "", updatedAt: 0 });

  useEffect(() => {
    fetch("/api/copy/wallets")
      .then((r) => r.json())
      .then((j) => {
        setRows(j.rows || []);
        setMeta({ source: j.source, updatedAt: j.updatedAt });
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="panel overflow-hidden rounded-2xl">
      <div className="flex items-end justify-between border-b border-violet/20 px-5 py-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.32em] text-violet">COPY DESK</div>
          <h2 className="font-display text-2xl text-ghost">Wallets Solphia follows</h2>
        </div>
        <div className="font-mono text-[10px] text-mute">
          {meta.source || "KOL Explorer"} · paper copy only
        </div>
      </div>
      <div className="grid grid-cols-12 gap-2 px-5 py-2 font-mono text-[10px] tracking-[0.16em] text-mute">
        <div className="col-span-3">TRADER</div>
        <div className="col-span-2">7D</div>
        <div className="col-span-2">30D</div>
        <div className="col-span-2">WIN</div>
        <div className="col-span-3 text-right">STATUS</div>
      </div>
      {(compact ? rows.slice(0, 6) : rows).map((w) => (
        <div key={w.address} className="grid grid-cols-12 items-center gap-2 border-t border-violet/10 px-5 py-3 hover:bg-violet/5">
          <div className="col-span-3">
            <div className="font-display text-ghost">{w.handle}</div>
            <div className="truncate font-mono text-[10px] text-mute">{w.address.slice(0, 4)}…{w.address.slice(-4)} · {w.style}</div>
          </div>
          <div className={`col-span-2 font-mono text-sm ${w.pnl7d >= 0 ? "text-acid" : "text-blood"}`}>{money(w.pnl7d)}</div>
          <div className={`col-span-2 font-mono text-sm ${w.pnl30d >= 0 ? "text-acid" : "text-blood"}`}>{money(w.pnl30d)}</div>
          <div className="col-span-2 font-mono text-sm text-ghost">{w.winRate.toFixed(1)}%</div>
          <div className="col-span-3 text-right font-mono text-[10px] tracking-[0.18em]">
            {w.copied ? <span className="text-acid">MIRRORED</span> : <span className="text-mute">WATCH</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
