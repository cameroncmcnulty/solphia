"use client";

export function SafetyBadge({ score, verdict }: { score: number; verdict?: string; grade?: string }) {
  const label = verdict === "trade" ? "TAKE" : verdict === "wait" ? "WAIT" : verdict === "skip" ? "SKIP" : String(score);
  const color = verdict === "trade" || score >= 68 ? "#14F195" : verdict === "wait" || score >= 52 ? "#80eaff" : "#ff4d7a";
  return (
    <div className="text-right">
      <div className="font-display text-lg" style={{ color }}>
        {score}
      </div>
      <div className="font-mono text-[10px] tracking-[0.18em]" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
