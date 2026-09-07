"use client";

import { useEffect, useState } from "react";
import type { TickerChart } from "@/lib/pair/charts";
import { CandleChart } from "./CandleChart";

function money(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  if (n >= 100) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(n >= 10 ? 2 : 3)}`;
}

export function TickerCharts() {
  const [tickers, setTickers] = useState<TickerChart[]>([]);
  const [at, setAt] = useState(0);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const r = await fetch("/api/charts", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (stop) return;
        setTickers(j.tickers || []);
        setAt(j.at || Date.now());
      } catch {
        /* keep last */
      }
    }
    load();
    const id = setInterval(load, 25_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const live = at && Date.now() - at < 60_000;

  return (
    <section className="px-4 py-8 md:px-12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-base text-acid">Live tape</p>
          <h2 className="mt-1 font-display text-3xl text-ghost sm:text-4xl">SOL · S&P · Nasdaq · Gold</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-violet">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-acid shadow-[0_0_10px_#14F195]" : "bg-mute"}`} />
          15m
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tickers.map((t) => {
          const up = t.changePct >= 0;
          return (
            <article key={t.id} className="panel rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] tracking-[0.18em] text-mute">{t.symbol}</div>
                  <div className="truncate font-display text-xl text-ghost">{t.name}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`font-display text-xl ${up ? "text-acid" : "text-blood"}`}>
                    {t.last ? money(t.last) : "—"}
                  </div>
                  <div className={`font-mono text-[11px] ${up ? "text-acid" : "text-blood"}`}>
                    {t.last ? `${up ? "+" : ""}${(t.changePct * 100).toFixed(2)}%` : ""}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <CandleChart candles={t.candles} up={up} />
              </div>
            </article>
          );
        })}
        {!tickers.length &&
          ["SOL", "SPYx", "QQQx", "GLDx"].map((s) => (
            <article key={s} className="panel rounded-2xl p-4">
              <div className="font-mono text-[11px] text-mute">{s}</div>
              <div className="mt-6 h-[120px] text-sm text-mute">Loading candles…</div>
            </article>
          ))}
      </div>
    </section>
  );
}
