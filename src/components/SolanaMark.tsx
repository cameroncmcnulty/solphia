"use client";

import { useId } from "react";

/** Official Solana three-bar mark (cyan → magenta), on the usual black chip. */
export function SolanaMark({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const a = `${uid}solA`;
  const b = `${uid}solB`;
  const c = `${uid}solC`;
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#000" />
      <g transform="translate(5.05 7.35) scale(0.0552)">
        <linearGradient
          id={a}
          x1="360.879"
          y1="351.455"
          x2="141.213"
          y2="-69.294"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1 0 0 -1 0 314)"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <path
          fill={`url(#${a})`}
          d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
        />
        <linearGradient
          id={b}
          x1="264.829"
          y1="401.601"
          x2="45.163"
          y2="-19.148"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1 0 0 -1 0 314)"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <path
          fill={`url(#${b})`}
          d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
        />
        <linearGradient
          id={c}
          x1="312.548"
          y1="376.688"
          x2="92.882"
          y2="-44.262"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1 0 0 -1 0 314)"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <path
          fill={`url(#${c})`}
          d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
        />
      </g>
    </svg>
  );
}
