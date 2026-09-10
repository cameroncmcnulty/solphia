"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChartTf } from "@/lib/launch/chart";
import { axisTicks, bucketCandles, fmtAxisPx, scaleSpark, type Spark } from "@/lib/launch/chart";

const BULL = "#14f195";
const BEAR = "#ff4d7a";
const AXIS_W = 64;
const PAD_Y = 16;

const TFS: { id: ChartTf; label: string }[] = [
  { id: "5m", label: "5M" },
  { id: "15m", label: "15M" },
  { id: "1h", label: "1H" },
  { id: "6h", label: "6H" },
];

function useBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox({ w: Math.max(1, Math.round(el.clientWidth)), h: Math.max(1, Math.round(el.clientHeight)) });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

export function TokenChart({
  mint,
  pair,
  venue,
  seed,
  change24h,
  solUsd,
}: {
  mint?: string;
  pair?: string;
  venue?: string;
  seed?: Spark[];
  change24h?: number;
  solUsd?: number;
}) {
  const [tf, setTf] = useState<ChartTf>("15m");
  const [raw, setRaw] = useState<Spark[]>(seed || []);
  const [unit, setUnit] = useState<"sol" | "usd">("sol");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plotRef, { w, h }] = useBox();

  useEffect(() => {
    setRaw(seed || []);
    setUnit("sol");
    setLive(false);
  }, [mint, pair]);

  useEffect(() => {
    if (!live && seed && seed.length >= 2) setRaw(seed);
  }, [seed, live]);

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
        if (Array.isArray(j.candles) && j.candles.length >= 4) {
          setRaw(j.candles);
          setUnit(j.unit === "usd" ? "usd" : "sol");
          setLive(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [mint, pair, venue, tf]);

  const usd = solUsd && solUsd > 0 ? solUsd : 0;
  const candles = useMemo(() => (unit === "sol" && usd > 0 ? scaleSpark(raw, usd) : raw), [raw, unit, usd]);
  const plotW = Math.max(1, w - AXIS_W);
  const nBars = Math.max(20, Math.min(64, Math.floor(plotW / 8)));
  const rows = useMemo(() => bucketCandles(candles, nBars), [candles, nBars]);
  const up = useMemo(() => {
    if (rows.length >= 2) return rows[rows.length - 1].c >= rows[0].c;
    return (change24h || 0) >= 0;
  }, [rows, change24h]);
  const chg = rows.length >= 2 ? rows[rows.length - 1].c / Math.max(1e-12, rows[0].c) - 1 : change24h || 0;

  const max = rows.length ? Math.max(...rows.map((c) => c.h)) : 0;
  const min = rows.length ? Math.min(...rows.map((c) => c.l)) : 0;
  const span = max - min || Math.abs(max) * 0.04 || 1;
  const y = (px: number) => PAD_Y + ((max - px) / span) * (h - PAD_Y * 2);
  const last = rows[rows.length - 1];
  const ticks = useMemo(() => axisTicks(min, max, 4), [min, max]);
  const tone = up ? BULL : BEAR;

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-mono text-[13px] ${up ? "text-acid" : "text-blood"}`}>
          {chg >= 0 ? "+" : ""}
          {(chg * 100).toFixed(2)}%
          <span className="ml-2 text-[10px] text-mute">USD</span>
        </span>
        <div className="flex gap-0.5 rounded-full border border-violet/25 p-0.5">
          {TFS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setTf(row.id)}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] ${
                tf === row.id ? (up ? "bg-acid/20 text-acid" : "bg-blood/20 text-blood") : "text-mute"
              }`}
            >
              {row.label}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={plotRef}
        className={`relative h-[240px] w-full min-w-0 overflow-hidden rounded-2xl border sm:h-[300px] lg:h-[340px] ${
          up ? "border-acid/30" : "border-blood/30"
        } bg-void/50`}
      >
        {loading && (
          <div className="absolute right-[72px] top-2 z-[2] rounded-full bg-void/80 px-2 py-0.5 font-mono text-[9px] text-mute">
            loading
          </div>
        )}
        {w > 24 && h > 24 && rows.length >= 2 && (
          <>
            <svg width={w} height={h} aria-hidden className="absolute inset-0">
              {ticks.map((v) => (
                <line key={`g-${v}`} x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke={tone} strokeOpacity="0.12" />
              ))}
              {last && (
                <line
                  x1={0}
                  x2={plotW}
                  y1={y(last.c)}
                  y2={y(last.c)}
                  stroke={tone}
                  strokeOpacity="0.45"
                  strokeDasharray="3 4"
                />
              )}
              {rows.map((c, i) => {
                const gap = plotW / rows.length;
                const x = gap * i + gap / 2;
                const bodyW = Math.max(2.6, Math.min(9, gap * 0.62));
                const color = c.c >= c.o ? BULL : BEAR;
                const open = y(c.o);
                const close = y(c.c);
                return (
                  <g key={`${c.t}-${i}`}>
                    <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1.25" />
                    <rect
                      x={x - bodyW / 2}
                      y={Math.min(open, close)}
                      width={bodyW}
                      height={Math.max(1.5, Math.abs(close - open))}
                      fill={color}
                    />
                  </g>
                );
              })}
            </svg>
            {ticks.map((v) => {
              if (last && Math.abs(y(v) - y(last.c)) < 14) return null;
              return (
                <span
                  key={`t-${v}`}
                  className="pointer-events-none absolute right-1.5 font-mono text-[10px] text-mute"
                  style={{ top: y(v), transform: "translateY(-50%)" }}
                >
                  ${fmtAxisPx(v)}
                </span>
              );
            })}
            {last && (
              <span
                className={`pointer-events-none absolute right-0 rounded-l-md px-1.5 py-0.5 font-mono text-[10px] ${
                  up ? "bg-acid text-void" : "bg-blood text-white"
                }`}
                style={{ top: y(last.c), transform: "translateY(-50%)" }}
              >
                ${fmtAxisPx(last.c)}
              </span>
            )}
          </>
        )}
        {w > 24 && rows.length < 2 && (
          <div className="flex h-full items-center justify-center font-mono text-[11px] text-mute">Waiting on candles…</div>
        )}
      </div>
    </div>
  );
}
