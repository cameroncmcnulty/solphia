"use client";

export type Spark = { t: number; o: number; h: number; l: number; c: number };

export function SparkCandles({
  candles,
  up,
  width = 112,
  height = 44,
  className,
}: {
  candles: Spark[];
  up: boolean;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!candles.length) {
    return <div className={className || "h-11 w-28 rounded bg-void/40"} />;
  }
  const pad = 2;
  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || 1e-12;
  const gap = width / candles.length;
  const bodyW = Math.max(1.2, gap * 0.55);
  const y = (px: number) => pad + ((max - px) / span) * (height - pad * 2);
  const bull = "#14f195";
  const bear = "#ff4d7a";

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
        const color = green ? bull : bear;
        return (
          <g key={c.t}>
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
        stroke={up ? bull : bear}
        strokeOpacity="0.25"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
