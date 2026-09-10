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

function fmtAxis(n: number): string {
  if (!(n > 0)) return "0";
  if (n >= 1000) return n.toFixed(0);
  if (n >= 1) return n.toFixed(n >= 10 ? 2 : 4);
  if (n >= 0.0001) return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return n.toExponential(1);
}

const BULL = "#14f195";
const BEAR = "#ff4d7a";
const AXIS = "#8b7aa8";

export function SparkCandles({
  candles,
  up,
  className,
  variant = "candles",
  axis = false,
}: {
  candles: Spark[];
  up: boolean;
  className?: string;
  variant?: "candles" | "line";
  axis?: boolean;
}) {
  const tone = up ? BULL : BEAR;
  const axisW = axis ? 52 : 0;
  const vbW = variant === "line" ? 96 : 320 + axisW;
  const vbH = variant === "line" ? 36 : 160;
  const rows = variant === "line" ? bucketCandles(candles, 32) : bucketCandles(candles, 48);
  const padX = variant === "line" ? 1 : 4;
  const padY = variant === "line" ? 3 : 10;
  const plotR = vbW - axisW - (variant === "line" ? 1 : 2);

  if (rows.length < 2) {
    return (
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className || "h-full w-full"} preserveAspectRatio="none" aria-hidden>
        <line x1={padX} x2={plotR} y1={vbH / 2} y2={vbH / 2} stroke={tone} strokeOpacity="0.45" strokeWidth="1.5" />
      </svg>
    );
  }

  const highs = rows.map((c) => (variant === "line" ? c.c : c.h));
  const lows = rows.map((c) => (variant === "line" ? c.c : c.l));
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const span = max - min || Math.abs(max) * 0.04 || 1;
  const y = (px: number) => padY + ((max - px) / span) * (vbH - padY * 2);
  const xAt = (i: number) => padX + (i / (rows.length - 1)) * (plotR - padX);

  if (variant === "line") {
    const d = rows
      .map((c, i) => `${i ? "L" : "M"}${xAt(i).toFixed(2)} ${y(c.c).toFixed(2)}`)
      .join(" ");
    const lastX = xAt(rows.length - 1);
    const firstX = xAt(0);
    return (
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className || "h-full w-full"} preserveAspectRatio="none" aria-hidden>
        <path d={`${d} L${lastX} ${vbH} L${firstX} ${vbH} Z`} fill={tone} fillOpacity="0.14" />
        <path d={d} fill="none" stroke={tone} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  const gap = (plotR - padX) / rows.length;
  const bodyW = Math.max(2.2, Math.min(6.5, gap * 0.7));
  const ticks = [max, min + span * (2 / 3), min + span / 3, min];
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className={className || "h-full w-full"} preserveAspectRatio="none" aria-hidden>
      {axis &&
        ticks.map((v, i) => (
          <g key={i}>
            <line x1={padX} x2={plotR} y1={y(v)} y2={y(v)} stroke={AXIS} strokeOpacity="0.22" />
            <text x={vbW - 4} y={y(v) + 3} textAnchor="end" fill={AXIS} fontSize="9" fontFamily="ui-monospace, monospace">
              {fmtAxis(v)}
            </text>
          </g>
        ))}
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
