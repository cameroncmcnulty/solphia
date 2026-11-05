"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { CopyCa } from "@/components/CopyCa";
import { TealConfetti } from "@/components/TealConfetti";
import { pad2, splitRemaining, type SphaPublicCountdown, type SphaPublicPhase } from "@/lib/token/countdown";
import type { TokenStat } from "@/lib/token/solphia";

type Pack = {
  mint: string;
  phase: SphaPublicPhase;
  countdown: SphaPublicCountdown;
  stats?: TokenStat[];
  extra?: TokenStat[];
  image?: string;
  blurb?: string;
};

function remainingOf(cd: SphaPublicCountdown, fetchedAt: number, now: number) {
  if (cd.phase !== "counting" || !(cd.launchAt > 0)) return 0;
  const skew = cd.serverNow - fetchedAt;
  return Math.max(0, cd.launchAt - (now + skew));
}

export function SphaCountdown({
  pack,
  onNeedRefresh,
}: {
  pack: Pack;
  onNeedRefresh: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [fetchedAt] = useState(() => Date.now());
  const [fire, setFire] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const liveOnce = useRef(false);
  const asked = useRef(false);

  const remaining = remainingOf(pack.countdown, fetchedAt, now);
  const live = pack.phase === "live" && Boolean(pack.mint);
  const parts = splitRemaining(remaining);
  const span = Math.max(pack.countdown.remainingMs, pack.countdown.mintLeadMs, 1);
  const progress = live ? 1 : pack.phase === "soon" ? 0.18 : Math.min(1, Math.max(0, 1 - remaining / span));

  useEffect(() => {
    if (live) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (live && !liveOnce.current) {
      liveOnce.current = true;
      setFire(true);
    }
  }, [live]);

  useEffect(() => {
    if (live || asked.current) return;
    if (pack.phase === "counting" && remaining <= 0) {
      asked.current = true;
      onNeedRefresh();
      const t = window.setTimeout(() => {
        asked.current = false;
      }, 2500);
      return () => window.clearTimeout(t);
    }
  }, [live, pack.phase, remaining, onNeedRefresh]);

  const cells = useMemo(
    () => [
      { k: "DAYS", v: pad2(parts.d) },
      { k: "HRS", v: pad2(parts.h) },
      { k: "MIN", v: pad2(parts.m) },
      { k: "SEC", v: pad2(parts.s) },
    ],
    [parts.d, parts.h, parts.m, parts.s],
  );

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const el = stage.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: x * 10, y: y * -8 });
  }

  return (
    <div className="spha-cd-wrap mt-8">
      <TealConfetti fire={fire} />
      <div
        ref={stage}
        className="spha-cd"
        onPointerMove={onMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        style={{
          transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        }}
      >
        <div className="spha-cd-grid" aria-hidden />
        <div className="spha-cd-scan" aria-hidden />
        <svg className="spha-cd-orbit spha-cd-orbit-a" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r="92" />
        </svg>
        <svg className="spha-cd-orbit spha-cd-orbit-b" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r="78" />
        </svg>
        <svg className="spha-cd-ring" viewBox="0 0 200 200" aria-hidden>
          <circle className="spha-cd-track" cx="100" cy="100" r="86" />
          <circle
            className="spha-cd-prog"
            cx="100"
            cy="100"
            r="86"
            style={{
              strokeDasharray: `${2 * Math.PI * 86}`,
              strokeDashoffset: `${2 * Math.PI * 86 * (1 - progress)}`,
            }}
          />
        </svg>
        <div className="spha-cd-core">
          <p className="spha-cd-kicker">
            {live ? "PROTOCOL LIVE" : pack.phase === "counting" ? "T-MINUS OFFICIAL LAUNCH" : "OFFICIAL LAUNCH"}
          </p>
          {live ? (
            <div className="spha-cd-live">
              <div className="spha-cd-live-tag">$SPHA IS LIVE</div>
              <CopyCa ca={pack.mint} full />
            </div>
          ) : pack.phase === "soon" ? (
            <div className="spha-cd-soon">
              <span className="spha-cd-soon-glint">COMING SOON</span>
              <p className="spha-cd-sub">The official clock arms from the $SPHA launcher. Until then this core stays sealed.</p>
            </div>
          ) : (
            <div className="spha-cd-clock" role="timer" aria-live="polite">
              {cells.map((c) => (
                <div key={c.k} className="spha-cd-cell">
                  <span className="spha-cd-num">{c.v}</span>
                  <span className="spha-cd-lbl">{c.k}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="spha-cd-bit spha-cd-bit-1" aria-hidden />
        <span className="spha-cd-bit spha-cd-bit-2" aria-hidden />
        <span className="spha-cd-bit spha-cd-bit-3" aria-hidden />
      </div>
    </div>
  );
}
