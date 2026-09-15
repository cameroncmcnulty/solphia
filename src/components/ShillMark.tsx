"use client";

import { useId } from "react";

export function ShillMark({ className = "h-6 w-6" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`shillFill${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#80eaff" />
          <stop offset="50%" stopColor="#14f195" />
          <stop offset="100%" stopColor="#ff4fd8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#shillFill${uid})`} opacity="0.16" />
      <path d="M12 26h10l16-10v32L22 38H12a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z" fill={`url(#shillFill${uid})`} />
      <path d="M22 26v12" stroke="#0b0614" strokeWidth="2.5" opacity="0.35" />
      <path d="M44 22c4.5 3 7 7.5 7 10s-2.5 7-7 10" fill="none" stroke="#80eaff" strokeWidth="3" strokeLinecap="round" />
      <path d="M49 17c7 5 11 11 11 15s-4 10-11 15" fill="none" stroke="#14f195" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18" cy="32" r="2.2" fill="#0b0614" />
    </svg>
  );
}
