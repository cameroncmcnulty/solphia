"use client";

export function SafetyBadge({ score, grade }: { score: number; grade: string }) {
  const color = score >= 78 ? "#b8ff3c" : score >= 60 ? "#5cffd8" : score >= 40 ? "#ffb020" : "#ff3d6e";
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex items-center gap-2">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="3" fill="none" />
        <circle
          cx="24"
          cy="24"
          r={r}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
        <text x="24" y="28" textAnchor="middle" fill={color} fontSize="11" fontFamily="IBM Plex Mono, monospace">
          {score}
        </text>
      </svg>
      <div>
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">SAFETY</div>
        <div className="font-display text-lg" style={{ color }}>
          {grade}
        </div>
      </div>
    </div>
  );
}
