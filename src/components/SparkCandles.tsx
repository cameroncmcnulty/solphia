"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

export type Spark = { t: number; o: number; h: number; l: number; c: number };

const BULL = "#14f195";
const BEAR = "#ff4d7a";

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

function closes(candles: Spark[]): number[] {
  return candles.map((c) => c.c).filter((n) => Number.isFinite(n) && n > 0);
}

/** Tape-row spark. Drawn in the row's real pixels — not a stretched SVG copy of the desk chart. */
export function MiniSpark({ candles, up }: { candles: Spark[]; up: boolean }) {
  const [ref, { w, h }] = useBox();
  const tone = up ? BULL : BEAR;
  const xs = useMemo(() => closes(candles), [candles]);
  const path = useMemo(() => {
    if (w < 8 || h < 8 || xs.length < 2) return null;
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const span = max - min || Math.abs(max) * 0.08 || 1;
    const padY = 4;
    const y = (v: number) => padY + ((max - v) / span) * (h - padY * 2);
    const x = (i: number) => 2 + (i / (xs.length - 1)) * (w - 4);
    const line = xs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const lastX = x(xs.length - 1);
    const lastY = y(xs[xs.length - 1]);
    return { line, lastX, lastY };
  }, [xs, w, h]);

  return (
    <div ref={ref} className="h-10 w-[108px] shrink-0 sm:h-11 sm:w-[152px]">
      {w > 8 && h > 8 && (
        <svg width={w} height={h} aria-hidden>
          {path ? (
            <>
              <path d={`${path.line} L${w - 2} ${h} L2 ${h} Z`} fill={tone} fillOpacity="0.14" />
              <path d={path.line} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={path.lastX} cy={path.lastY} r="2.4" fill={tone} />
            </>
          ) : (
            <line x1={2} x2={w - 2} y1={h / 2} y2={h / 2} stroke={tone} strokeOpacity="0.4" strokeWidth="1.75" />
          )}
        </svg>
      )}
    </div>
  );
}

export function SparkCandles(props: { candles: Spark[]; up: boolean; className?: string; variant?: "candles" | "line"; axis?: boolean }) {
  if (props.variant === "line") return <MiniSpark candles={props.candles} up={props.up} />;
  return null;
}
