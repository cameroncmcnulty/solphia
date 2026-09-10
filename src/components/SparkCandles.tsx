"use client";

export type Spark = { t: number; o: number; h: number; l: number; c: number };

const BULL = "#14f195";
const BEAR = "#ff4d7a";

export function SparkCandles({
  candles,
  up,
  width = 112,
  height = 44,
  className,
  variant = "candles",
}: {
  candles: Spark[];
  up: boolean;
  width?: number;
  height?: number;
  className?: string;
  variant?: "candles" | "line";
}) {
  if (!candles.length) {
    const stroke = up ? BULL : BEAR;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className || "shrink-0"} aria-hidden>
        <line x1="4" x2={width - 4} y1={height / 2} y2={height / 2} stroke={stroke} strokeOpacity="0.35" strokeWidth="2" />
      </svg>
    );
  }
  const pad = 2;
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || 1e-12;
  const y = (px: number) => pad + ((max - px) / span) * (height - pad * 2);
  const tone = up ? BULL : BEAR;

  if (variant === "line") {
    const pts = candles.map((c, i) => {
      const x = pad + (i / Math.max(1, candles.length - 1)) * (width - pad * 2);
      return `${x},${y(c.c)}`;
    });
    const firstX = pad;
    const lastX = width - pad;
    const base = `${lastX},${height - pad} ${firstX},${height - pad}`;
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={className || "shrink-0"}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon points={`${pts.join(" ")} ${base}`} fill={tone} fillOpacity="0.18" />
        <polyline points={pts.join(" ")} fill="none" stroke={tone} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  const gap = width / candles.length;
  const bodyW = Math.max(1.2, gap * 0.55);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className || "shrink-0"}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {candles.map((c, i) => {
        const x = gap * i + gap / 2;
        const open = y(c.o);
        const close = y(c.c);
        const green = c.c >= c.o;
        const color = green ? BULL : BEAR;
        return (
          <g key={`${c.t}-${i}`}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" />
            <rect
              x={x - bodyW / 2}
              y={Math.min(open, close)}
              width={bodyW}
              height={Math.max(1.1, Math.abs(close - open))}
              fill={color}
            />
          </g>
        );
      })}
      <line
        x1={0}
        x2={width}
        y1={y(candles[candles.length - 1].c)}
        y2={y(candles[candles.length - 1].c)}
        stroke={tone}
        strokeOpacity="0.28"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
