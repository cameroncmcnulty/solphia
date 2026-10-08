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

function SolphiaCrest({ size, className, id }: { size: number; className: string; id: string }) {
  const ticks = [-90, 0, 90, 180].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const x = 40 + Math.cos(a) * 30.2;
    const y = 40 + Math.sin(a) * 30.2;
    return `${x},${y - 3.1} ${x + 2},${y} ${x},${y + 3.1} ${x - 2},${y}`;
  });
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className} aria-label="Rank 100">
      <defs>
        <linearGradient id={`${id}ring`} x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#fff8e1" />
          <stop offset="45%" stopColor="#e8c35a" />
          <stop offset="100%" stopColor="#14f195" />
        </linearGradient>
        <radialGradient id={`${id}core`} cx="50%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#24142f" />
          <stop offset="62%" stopColor="#12081c" />
          <stop offset="100%" stopColor="#07040d" />
        </radialGradient>
        <filter id={`${id}glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
      </defs>
      <circle cx="40" cy="40" r="33" fill="#14f195" opacity="0.16" filter={`url(#${id}glow)`} />
      <circle cx="40" cy="40" r="30.5" fill={`url(#${id}core)`} stroke={`url(#${id}ring)`} strokeWidth="2.6" />
      <circle cx="40" cy="40" r="26" fill="none" stroke="#14f195" strokeWidth="0.8" opacity="0.55" />
      <circle cx="40" cy="40" r="22.5" fill="none" stroke="#e8c35a" strokeWidth="0.45" opacity="0.35" />
      {ticks.map((points) => (
        <polygon key={points} points={points} fill="#fff6d6" />
      ))}
      <text
        x="40"
        y="46"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize="20"
        fill="#f8f4ff"
        letterSpacing="-0.8"
      >
        100
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
  if (r >= 100) return <SolphiaCrest size={size} className={className} id={id} />;
  const rings = r >= 80 ? 3 : r >= 50 ? 2 : 1;
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
        y="44"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="800"
        fontSize={r >= 10 ? 22 : 26}
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
