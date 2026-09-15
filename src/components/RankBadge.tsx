"use client";

import { rankTier } from "@/lib/rank/engine";

export function StaffBadge({
  role,
  size = 72,
  className = "",
}: {
  role: "admin" | "mod";
  size?: number;
  className?: string;
}) {
  const admin = role === "admin";
  const metal = admin ? "#ff4d6d" : "#80eaff";
  const glow = admin ? "#ff8fab" : "#14f195";
  const label = admin ? "ADMIN" : "MOD";
  const id = `stf${role}${size}`;
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className} aria-label={label}>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="45%" stopColor={metal} />
          <stop offset="100%" stopColor={glow} />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0b0614" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill={`url(#${id}g)`} />
      <polygon points={hex(40, 40, 32)} fill="#12081c" stroke={`url(#${id}m)`} strokeWidth="3" />
      <polygon points={hex(40, 40, 26)} fill="none" stroke={glow} strokeWidth="1.2" opacity="0.8" />
      <text x="40" y="44" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="800" fontSize={admin ? 11 : 13} fill="#f4f0ff">
        {label}
      </text>
    </svg>
  );
}

export function RankBadge({
  rank,
  size = 72,
  className = "",
}: {
  rank: number;
  size?: number;
  className?: string;
}) {
  const r = Math.max(1, Math.min(100, Math.floor(rank || 1)));
  const tier = rankTier(r);
  const id = `rb${r}${tier.id}${size}`.replace(/[^a-z0-9]/gi, "");
  const rings = r >= 100 ? 4 : r >= 80 ? 3 : r >= 50 ? 2 : 1;
  const jewels = r >= 90 ? 8 : r >= 65 ? 6 : r >= 35 ? 4 : 3;
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className} aria-label={`Rank ${r}`}>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="35%" stopColor={tier.metal} />
          <stop offset="100%" stopColor={tier.glow} />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={tier.glow} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0b0614" stopOpacity="0.2" />
        </radialGradient>
        <filter id={`${id}f`}>
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <circle cx="40" cy="40" r="36" fill={`url(#${id}g)`} opacity="0.85" filter={`url(#${id}f)`} />
      {Array.from({ length: rings }).map((_, i) => (
        <polygon
          key={i}
          points={hex(40, 40, 34 - i * 4)}
          fill={i === rings - 1 ? "#12081c" : "none"}
          stroke={`url(#${id}m)`}
          strokeWidth={i === 0 ? 2.6 : 1.4}
          opacity={1 - i * 0.12}
        />
      ))}
      {Array.from({ length: jewels }).map((_, i) => {
        const a = (Math.PI * 2 * i) / jewels - Math.PI / 2;
        const rad = 30;
        return <circle key={`j${i}`} cx={40 + Math.cos(a) * rad} cy={40 + Math.sin(a) * rad} r={r >= 80 ? 2.2 : 1.6} fill={tier.glow} />;
      })}
      <text
        x="40"
        y={r >= 100 ? 38 : 44}
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize={r >= 100 ? 18 : r >= 10 ? 22 : 26}
        fill="#f4f0ff"
      >
        {r}
      </text>
      <text x="40" y="58" textAnchor="middle" fontSize="7" fill={tier.glow} letterSpacing="1.4" fontFamily="ui-monospace, monospace">
        {tier.title.toUpperCase()}
      </text>
    </svg>
  );
}

function hex(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 })
    .map((_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
    })
    .join(" ");
}
