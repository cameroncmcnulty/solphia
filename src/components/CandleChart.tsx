"use client";

import type { PublicCandle } from "@/lib/pair/charts";

export function CandleChart({
  candles,
  up,
  height = 120,
}: {
  candles: PublicCandle[];
  up: boolean;
  height?: number;
}) {
  const w = 320;
  const h = height;
  const pad = 6;
  if (candles.length < 2) {
    return <div className="flex h-[120px] items-center text-sm text-mute">Waiting on candles…</div>;
  }
  const slice = candles.slice(-48);
  const highs = slice.map((c) => c.h);
  const lows = slice.map((c) => c.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || 1;
  const gap = w / slice.length;
  const bodyW = Math.max(1.6, gap * 0.55);
  const y = (px: number) => pad + ((max - px) / span) * (h - pad * 2);
  const bull = up ? "#14f195" : "#ff4d6d";
  const bear = up ? "#0b8f5a" : "#ff4d6d";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full" role="img" aria-hidden="true">
      {slice.map((c, i) => {
        const x = gap * i + gap / 2;
        const open = y(c.o);
        const close = y(c.c);
        const hi = y(c.h);
        const lo = y(c.l);
        const green = c.c >= c.o;
        const top = Math.min(open, close);
        const bh = Math.max(1.2, Math.abs(close - open));
        const color = green ? bull : bear;
        return (
          <g key={c.t}>
            <line x1={x} x2={x} y1={hi} y2={lo} stroke={color} strokeWidth="1.2" />
            <rect x={x - bodyW / 2} y={top} width={bodyW} height={bh} fill={color} rx="0.5" />
          </g>
        );
      })}
    </svg>
  );
}
