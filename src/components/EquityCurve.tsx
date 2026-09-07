"use client";

export function EquityCurve({
  curve,
  up,
}: {
  curve: { t: number; equity: number }[];
  up?: boolean;
}) {
  if (!curve.length) return null;
  const w = 720;
  const h = 240;
  const pad = 8;
  const xs = curve.map((p) => p.equity);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = Math.max(0.5, max - min);
  const pts = curve.map((p, i) => {
    const x = pad + (i / Math.max(1, curve.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.equity - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  const stroke = up === false ? "#ff4d7a" : "#14F195";
  const fill = up === false ? "url(#eqBlood)" : "url(#eqAcid)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Paper equity curve">
      <defs>
        <linearGradient id="eqAcid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14F195" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14F195" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="eqBlood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff4d7a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff4d7a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
