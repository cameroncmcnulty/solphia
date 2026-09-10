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
  priceLabel,
}: {
  mint?: string;
  pair?: string;
  venue?: string;
  seed?: Spark[];
  change24h?: number;
  priceLabel?: string;
}) {
  const [tf, setTf] = useState<ChartTf>("15m");
  const [candles, setCandles] = useState<Spark[]>(seed || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCandles(seed || []);
  }, [mint, seed]);

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
  const chg = candles.length >= 2 ? candles[candles.length - 1].c / candles[0].c - 1 : change24h || 0;
  const last = candles[candles.length - 1]?.c;

  return (
    <div className={`overflow-hidden rounded-2xl border ${up ? "border-acid/35 bg-acid/[0.04]" : "border-blood/35 bg-blood/[0.04]"}`}>
      <div className="flex flex-wrap items-end justify-between gap-2 px-3 pt-3">
        <div>
          <div className={`font-display text-2xl sm:text-3xl ${up ? "text-acid" : "text-blood"}`}>
            {priceLabel || (last ? last.toPrecision(4) : "—")}
          </div>
          <div className={`font-mono text-[12px] ${up ? "text-acid" : "text-blood"}`}>
            {chg >= 0 ? "+" : ""}
            {(chg * 100).toFixed(2)}% · {tf}
          </div>
        </div>
        <div className="flex gap-1 rounded-full border border-violet/25 p-0.5">
          {TFS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setTf(row.id)}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] ${tf === row.id ? (up ? "bg-acid/20 text-acid" : "bg-blood/20 text-blood") : "text-mute"}`}
            >
              {row.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative px-2 pb-2 pt-1">
        {loading && <div className="absolute right-3 top-2 font-mono text-[10px] text-mute">loading</div>}
        <SparkCandles candles={candles} up={up} width={720} height={180} variant="candles" className="h-40 w-full sm:h-48" />
      </div>
    </div>
  );
}
