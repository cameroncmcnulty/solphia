"use client";

export type Spark = { t: number; o: number; h: number; l: number; c: number };

function bucketCandles(rows: Spark[], max: number): Spark[] {
  if (rows.length <= max) return rows;
  const size = Math.ceil(rows.length / max);
  const out: Spark[] = [];
  for (let i = 0; i < rows.length; i += size) {
    const sl = rows.slice(i, i + size);
    const first = sl[0];
    const last = sl[sl.length - 1];
    out.push({
      t: first.t,
      o: first.o,
      h: Math.max(...sl.map((x) => x.h)),
      l: Math.min(...sl.map((x) => x.l)),
      c: last.c,
    });
  }
  return out;
}

const BULL = "#14f195";
const BEAR = "#ff4d7a";

export function SparkCandles({
  candles,
  up,
  className,
  variant = "candles",
}: {
  candles: Spark[];
  up: boolean;
  className?: string;
  variant?: "candles" | "line";
}) {
  const tone = up ? BULL : BEAR;
  const vbW = variant === "line" ? 88 : 320;
  const vbH = variant === "line" ? 32 : 148;
  const rows = variant === "line" ? bucketCandles(candles, 20) : bucketCandles(candles, 42);
  const padX = variant === "line" ? 1 : 6;
  const padY = variant === "line" ? 2 : 8;

  if (rows.length < 2) {
    return (
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className || "h-full w-full"} preserveAspectRatio="none" aria-hidden>
        <line x1={padX} x2={vbW - padX} y1={vbH / 2} y2={vbH / 2} stroke={tone} strokeOpacity="0.4" strokeWidth="1.5" />
      </svg>
    );
  }

  const highs = rows.map((c) => c.h);
  const lows = rows.map((c) => c.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || Math.abs(max) * 0.02 || 1;
  const y = (px: number) => padY + ((max - px) / span) * (vbH - padY * 2);
  const xAt = (i: number) => padX + (i / (rows.length - 1)) * (vbW - padX * 2);

  if (variant === "line") {
    const pts = rows.map((c, i) => `${xAt(i).toFixed(2)},${y(c.c).toFixed(2)}`);
    const lastX = xAt(rows.length - 1);
    const firstX = xAt(0);
    return (
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className || "h-full w-full"} preserveAspectRatio="none" aria-hidden>
        <polygon
          points={`${pts.join(" ")} ${lastX},${vbH - 1} ${firstX},${vbH - 1}`}
          fill={tone}
          fillOpacity="0.16"
        />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={tone}
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const gap = (vbW - padX * 2) / rows.length;
  const bodyW = Math.max(2, Math.min(7, gap * 0.62));
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className || "h-full w-full"} preserveAspectRatio="none" aria-hidden>
      {rows.map((c, i) => {
        const x = padX + gap * i + gap / 2;
        const open = y(c.o);
        const close = y(c.c);
        const color = c.c >= c.o ? BULL : BEAR;
        return (
          <g key={`${c.t}-${i}`}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" />
            <rect
              x={x - bodyW / 2}
              y={Math.min(open, close)}
              width={bodyW}
              height={Math.max(1.2, Math.abs(close - open))}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}
