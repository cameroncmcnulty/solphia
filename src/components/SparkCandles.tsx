"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { closesOf, lineGeom, sparkUp, type Spark } from "@/lib/launch/chart";

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

/** Tape-row spark. Phantom-style line in the row's real pixels. */
export function MiniSpark({ candles, up }: { candles: Spark[]; up: boolean }) {
  const gid = useId().replace(/:/g, "");
  const [ref, { w, h }] = useBox();
  const tone = up ? BULL : BEAR;
  const xs = useMemo(() => closesOf(candles), [candles]);
  const geom = useMemo(() => lineGeom(xs, w, h, 3, 4), [xs, w, h]);
  const rising = xs.length >= 2 ? sparkUp(candles, 0) : up;
  const color = rising ? BULL : BEAR;

  return (
    <div ref={ref} className="h-10 w-[108px] shrink-0 sm:h-11 sm:w-[152px]">
      {w > 8 && h > 8 && (
        <svg width={w} height={h} aria-hidden>
          {geom ? (
            <>
              <defs>
                <linearGradient id={`ms${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={geom.area} fill={`url(#ms${gid})`} />
              <path d={geom.d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={geom.lastX} cy={geom.lastY} r="2.2" fill={color} />
            </>
          ) : (
            <line x1={2} x2={w - 2} y1={h / 2} y2={h / 2} stroke={tone} strokeOpacity="0.35" strokeWidth="1.75" />
          )}
        </svg>
      )}
    </div>
  );
}

export function SparkCandles(props: { candles: Spark[]; up: boolean; className?: string; variant?: "candles" | "line"; axis?: boolean }) {
  return <MiniSpark candles={props.candles} up={props.up} />;
}
