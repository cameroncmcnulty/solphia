"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { ChartTf } from "@/lib/launch/chart";
import {
  axisTicks,
  chartMintLive,
  closesOf,
  downsampleCloses,
  fmtAxisPx,
  lineGeom,
  scaleSpark,
  type Spark,
} from "@/lib/launch/chart";

const BULL = "#14f195";
const BEAR = "#ff4d7a";
const AXIS_W = 64;
const PAD_Y = 18;
const PAD_X = 10;

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
  const gid = useId().replace(/:/g, "");
  const [tf, setTf] = useState<ChartTf>("15m");
  const [raw, setRaw] = useState<Spark[]>(seed || []);
  const [unit, setUnit] = useState<"sol" | "usd">("sol");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [plotRef, { w, h }] = useBox();
  const canFetch = Boolean(pair) || chartMintLive(mint, venue);

  useEffect(() => {
    setRaw(seed || []);
    setUnit("sol");
    setLive(false);
    setHover(null);
  }, [mint, pair]);

  useEffect(() => {
    if (!live && seed && seed.length >= 2) setRaw(seed);
  }, [seed, live]);

  useEffect(() => {
    if (!canFetch) return;
    const ctrl = new AbortController();
    setLoading(true);
    const qs = new URLSearchParams();
    if (mint && chartMintLive(mint, venue)) qs.set("mint", mint);
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
  }, [mint, pair, venue, tf, canFetch]);

  const usd = solUsd && solUsd > 0 ? solUsd : 0;
  const series = useMemo(() => (unit === "sol" && usd > 0 ? scaleSpark(raw, usd) : raw), [raw, unit, usd]);
  const plotW = Math.max(1, w - AXIS_W);
  const closes = useMemo(() => downsampleCloses(closesOf(series), Math.max(24, Math.min(160, Math.floor(plotW / 3)))), [series, plotW]);
  const geom = useMemo(() => lineGeom(closes, plotW, h, PAD_X, PAD_Y), [closes, plotW, h]);
  const up = useMemo(() => {
    if (closes.length >= 2) return closes[closes.length - 1] >= closes[0];
    return (change24h || 0) >= 0;
  }, [closes, change24h]);
  const lastPx = closes[closes.length - 1] || 0;
  const firstPx = closes[0] || lastPx;
  const chg = firstPx > 0 && closes.length >= 2 ? lastPx / firstPx - 1 : change24h || 0;
  const ticks = useMemo(() => (geom ? axisTicks(geom.min, geom.max, 4) : []), [geom]);
  const tone = up ? BULL : BEAR;
  const hit = hover != null && geom?.pts[hover] ? geom.pts[hover] : null;
  const showPx = hit?.v ?? lastPx;

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!geom?.pts.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best = 0;
    let dist = Infinity;
    for (const p of geom.pts) {
      const d = Math.abs(p.x - x);
      if (d < dist) {
        dist = d;
        best = p.i;
      }
    }
    setHover(best);
  }

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
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {loading && (
          <div className="absolute right-[72px] top-2 z-[2] rounded-full bg-void/80 px-2 py-0.5 font-mono text-[9px] text-mute">
            loading
          </div>
        )}
        {w > 24 && h > 24 && geom && (
          <>
            <svg width={w} height={h} aria-hidden className="absolute inset-0">
              <defs>
                <linearGradient id={`fill${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={tone} stopOpacity="0" />
                </linearGradient>
              </defs>
              {ticks.map((v) => (
                <line key={`g-${v}`} x1={0} x2={plotW} y1={geom.y(v)} y2={geom.y(v)} stroke={tone} strokeOpacity="0.12" />
              ))}
              <line
                x1={0}
                x2={plotW}
                y1={geom.lastY}
                y2={geom.lastY}
                stroke={tone}
                strokeOpacity="0.4"
                strokeDasharray="3 4"
              />
              <path d={geom.area} fill={`url(#fill${gid})`} />
              <path d={geom.d} fill="none" stroke={tone} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={geom.lastX} cy={geom.lastY} r="3.2" fill={tone} />
              {hit && (
                <>
                  <line x1={hit.x} x2={hit.x} y1={PAD_Y} y2={h - 6} stroke={tone} strokeOpacity="0.45" />
                  <circle cx={hit.x} cy={hit.y} r="4" fill={tone} stroke="#0b0614" strokeWidth="2" />
                </>
              )}
            </svg>
            {ticks.map((v) => {
              const yy = geom.y(v);
              if (Math.abs(yy - geom.lastY) < 14) return null;
              return (
                <span
                  key={`t-${v}`}
                  className="pointer-events-none absolute right-1.5 font-mono text-[10px] text-mute"
                  style={{ top: yy, transform: "translateY(-50%)" }}
                >
                  ${fmtAxisPx(v)}
                </span>
              );
            })}
            <span
              className={`pointer-events-none absolute right-0 rounded-l-md px-1.5 py-0.5 font-mono text-[10px] ${
                up ? "bg-acid text-void" : "bg-blood text-white"
              }`}
              style={{ top: hit ? hit.y : geom.lastY, transform: "translateY(-50%)" }}
            >
              ${fmtAxisPx(showPx)}
            </span>
          </>
        )}
        {w > 24 && !geom && (
          <div className="flex h-full items-center justify-center font-mono text-[11px] text-mute">Waiting on price…</div>
        )}
      </div>
    </div>
  );
}
