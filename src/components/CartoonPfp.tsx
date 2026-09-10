"use client";

import { useId } from "react";

/** Deterministic cartoon PFP from a wallet seed until they upload their own. */
export function CartoonPfp({
  seed,
  src,
  className = "h-9 w-9",
}: {
  seed: string;
  src?: string | null;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" draggable={false} className={`shrink-0 rounded-full object-cover ${className}`} />
    );
  }
  const a = avatar(seed || "solphia", uid);
  return (
    <svg viewBox="0 0 64 64" className={`shrink-0 rounded-full ${className}`} aria-hidden>
      <defs>
        <radialGradient id={a.gid} cx="32%" cy="28%" r="80%">
          <stop offset="0%" stopColor={a.bg2} />
          <stop offset="100%" stopColor={a.bg} />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${a.gid})`} />
      <ellipse cx="32" cy="40" rx={a.bodyW} ry="18" fill={a.skin} />
      <circle cx="32" cy="28" r={a.head} fill={a.skin} />
      <path d={a.hair} fill={a.hairC} />
      <circle cx={26 - a.eyeGap} cy="27" r={a.eye} fill="#14081c" />
      <circle cx={38 + a.eyeGap} cy="27" r={a.eye} fill="#14081c" />
      <circle cx={26 - a.eyeGap + 1.2} cy="26" r="1.1" fill="#fff" />
      <circle cx={38 + a.eyeGap + 1.2} cy="26" r="1.1" fill="#fff" />
      <path d={a.mouth} fill="none" stroke="#5a2040" strokeWidth="1.6" strokeLinecap="round" />
      {a.blush && (
        <>
          <ellipse cx="20" cy="32" rx="4" ry="2.2" fill="#ff7aa2" opacity="0.45" />
          <ellipse cx="44" cy="32" rx="4" ry="2.2" fill="#ff7aa2" opacity="0.45" />
        </>
      )}
      {a.hat ? <path d={a.hat} fill={a.hatC} /> : null}
    </svg>
  );
}

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

function avatar(seed: string, uid: string) {
  let s = hash(seed) || 1;
  const n = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const pick = <T,>(xs: T[]) => xs[Math.floor(n() * xs.length)];
  const bg = pick(["#14F195", "#80eaff", "#9945ff", "#c9a8ff", "#ffb020", "#ff7aa2"]);
  const bg2 = pick(["#e8fff4", "#e8fbff", "#f3e8ff", "#fff4d6", "#ffe8f0"]);
  const skin = pick(["#f6d0b1", "#e8b894", "#c98a62", "#8d5a3a", "#fbe0c8"]);
  const hairC = pick(["#1b1024", "#4a2c12", "#c45c1a", "#f2d36b", "#14F195", "#80eaff", "#9945ff"]);
  const head = 14 + Math.round(n() * 3);
  const hairKind = Math.floor(n() * 3);
  const hair =
    hairKind === 0
      ? "M14 26c2-12 34-14 36 0 0 0-6-8-18-8S14 26 14 26z"
      : hairKind === 1
        ? "M16 22c4-14 28-14 32 0v4H16z"
        : "M18 28c-2-16 12-20 14-8 2-12 16-8 14 8H18z";
  const smile = n() > 0.35;
  const mouth = smile ? "M26 34c2.4 3 9.6 3 12 0" : "M28 35h8";
  const hatOn = n() > 0.72;
  const hatC = pick(["#14F195", "#9945ff", "#ffb020", "#04000a"]);
  const hat = hatOn ? "M18 18h28l-3-6H21z" : "";
  return {
    gid: `pfp${uid}`,
    bg,
    bg2,
    skin,
    hairC,
    hair,
    head,
    eye: 2.1 + n() * 0.6,
    eyeGap: n() * 1.4,
    mouth,
    blush: n() > 0.4,
    hat,
    hatC,
    bodyW: 16 + n() * 4,
  };
}
