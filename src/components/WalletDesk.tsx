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
      <div className="flex flex-col gap-1 border-b border-violet/20 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[0.32em] text-violet">COPY DESK</div>
          <h2 className="font-display text-xl text-ghost sm:text-2xl">Wallets she follows</h2>
        </div>
        <div className="font-mono text-[10px] text-mute">{meta.source || "KOL Explorer"}</div>
      </div>
      <div className="hidden grid-cols-12 gap-2 px-5 py-2 font-mono text-[10px] tracking-[0.16em] text-mute md:grid">
        <div className="col-span-3">TRADER</div>
        <div className="col-span-2">7D</div>
        <div className="col-span-2">30D</div>
        <div className="col-span-2">WIN</div>
        <div className="col-span-3 text-right">STATUS</div>
      </div>
      {(compact ? rows.slice(0, 6) : rows).map((w) => (
        <div key={w.address} className="border-t border-violet/10 px-4 py-3 md:grid md:grid-cols-12 md:items-center md:gap-2 md:px-5">
          <div className="flex items-center justify-between md:col-span-3 md:block">
            <div>
              <div className="font-display text-ghost">{w.handle}</div>
              <div className="truncate font-mono text-[10px] text-mute">{w.address.slice(0, 4)}…{w.address.slice(-4)}</div>
            </div>
            <span className={`font-mono text-[10px] md:hidden ${w.copied ? "text-acid" : "text-mute"}`}>
              {w.copied ? "MIRRORED" : "WATCH"}
            </span>
          </div>
          <div className="mt-2 flex justify-between font-mono text-sm md:contents">
            <span className={w.pnl7d >= 0 ? "text-acid" : "text-blood"}>7D {money(w.pnl7d)}</span>
            <span className={`md:col-span-2 ${w.pnl30d >= 0 ? "text-acid" : "text-blood"}`}>30D {money(w.pnl30d)}</span>
            <span className="text-ghost md:col-span-2">{w.winRate.toFixed(1)}%</span>
          </div>
          <div className="hidden text-right font-mono text-[10px] tracking-[0.18em] md:col-span-3 md:block">
            {w.copied ? <span className="text-acid">MIRRORED</span> : <span className="text-mute">WATCH</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
