"use client";

import { useEffect, useMemo, useState } from "react";
import { SparkCandles, type Spark } from "./SparkCandles";
import type { ChartTf } from "@/lib/launch/chart";

const TFS: { id: ChartTf; label: string }[] = [
  { id: "5m", label: "5M" },
  { id: "15m", label: "15M" },
  { id: "1h", label: "1H" },
  { id: "6h", label: "6H" },
];

export function TokenChart({
  mint,
  pair,
  venue,
  seed,
  change24h,
}: {
  mint?: string;
  pair?: string;
  venue?: string;
  seed?: Spark[];
  change24h?: number;
}) {
  const [tf, setTf] = useState<ChartTf>("15m");
  const [candles, setCandles] = useState<Spark[]>(seed || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCandles(seed || []);
  }, [mint, pair, seed]);

  useEffect(() => {
    if (!mint && !pair) return;
    const ctrl = new AbortController();
    setLoading(true);
    const qs = new URLSearchParams();
    if (mint) qs.set("mint", mint);
    if (pair) qs.set("pair", pair);
    if (venue) qs.set("venue", venue);
    qs.set("tf", tf);
    fetch(`/api/launch/chart?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.candles) && j.candles.length >= 4) setCandles(j.candles);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [mint, pair, venue, tf]);

  const up = useMemo(() => {
    if (candles.length >= 2) return (candles[candles.length - 1]?.c || 0) >= (candles[0]?.c || 0);
    return (change24h || 0) >= 0;
  }, [candles, change24h]);
  const chg = candles.length >= 2 ? candles[candles.length - 1].c / Math.max(1e-12, candles[0].c) - 1 : change24h || 0;

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-mono text-[11px] ${up ? "text-acid" : "text-blood"}`}>
          {chg >= 0 ? "+" : ""}
          {(chg * 100).toFixed(2)}%
          <span className="ml-1.5 text-mute">{tf}</span>
        </span>
        <div className="flex gap-0.5 rounded-full border border-violet/25 p-0.5">
          {TFS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setTf(row.id)}
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                tf === row.id ? (up ? "bg-acid/20 text-acid" : "bg-blood/20 text-blood") : "text-mute"
              }`}
            >
              {row.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`relative h-[148px] w-full min-w-0 overflow-hidden rounded-xl border sm:h-[168px] ${
          up ? "border-acid/30 bg-void/50" : "border-blood/30 bg-void/50"
        }`}
      >
        {loading && <div className="absolute right-2 top-1.5 z-[1] font-mono text-[9px] text-mute">…</div>}
        <SparkCandles candles={candles} up={up} variant="candles" className="h-full w-full" />
      </div>
    </div>
  );
}
