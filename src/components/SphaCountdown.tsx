"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { CopyCa } from "@/components/CopyCa";
import { TealConfetti } from "@/components/TealConfetti";
import {
  formatSphaLaunchWhen,
  pad2,
  splitRemaining,
  type SphaPublicCountdown,
  type SphaPublicPhase,
} from "@/lib/token/countdown";
import type { TokenStat } from "@/lib/token/solphia";

type Pack = {
  mint: string;
  symbol?: string;
  phase: SphaPublicPhase;
  countdown: SphaPublicCountdown;
  stats?: TokenStat[];
  extra?: TokenStat[];
  image?: string;
  blurb?: string;
};

function remainingOf(cd: SphaPublicCountdown, now: number) {
  if (!(cd.launchAt > 0)) return Math.max(0, cd.remainingMs || 0);
  if (now > 0) return Math.max(0, cd.launchAt - now);
  if (cd.remainingMs > 0) return cd.remainingMs;
  return Math.max(0, cd.launchAt - (cd.serverNow || 0));
}

function FlipCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="spha-cd-cell">
      <span key={value} className="spha-cd-num" data-value={value} suppressHydrationWarning>
        {value}
      </span>
      <span className="spha-cd-lbl">{label}</span>
    </div>
  );
}

export function SphaCountdown({
  pack,
  onNeedRefresh,
}: {
  pack: Pack;
  onNeedRefresh: () => void;
}) {
  const [now, setNow] = useState(0);
  const [fire, setFire] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const liveOnce = useRef(false);
  const asked = useRef(false);
  const launchAtHold = useRef(Math.max(0, pack.countdown.launchAt));
  if (pack.countdown.launchAt > 0) launchAtHold.current = pack.countdown.launchAt;

  const live = Boolean(pack.mint) || pack.phase === "live";
  const launchAt = pack.countdown.launchAt > 0 ? pack.countdown.launchAt : launchAtHold.current;
  const counting = !live && launchAt > 0;
  const remaining = live ? 0 : remainingOf({ ...pack.countdown, launchAt }, now);
  const parts = splitRemaining(counting ? remaining : 0);
  const span = Math.max(pack.countdown.remainingMs, pack.countdown.mintLeadMs, 1);
  const progress = live ? 1 : counting ? Math.min(1, Math.max(0, 1 - remaining / Math.max(span, remaining, 1))) : 0.12;
  const ticker = (pack.symbol || "SPHA").replace(/^\$+/, "");
  const whenLabel = formatSphaLaunchWhen(launchAt);

  useEffect(() => {
    if (live) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 100);
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
    if (counting && remaining <= 0) {
      asked.current = true;
      onNeedRefresh();
      const t = window.setTimeout(() => {
        asked.current = false;
      }, 2500);
      return () => window.clearTimeout(t);
    }
  }, [live, counting, remaining, onNeedRefresh]);

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
    setTilt({ x: x * 8, y: y * -6 });
  }

  return (
    <div className="spha-cd-wrap mt-8">
      <TealConfetti fire={fire} />
      <div
        ref={stage}
        className={`spha-cd${counting ? " spha-cd-live-tick" : ""}`}
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
            cx="100" cy="100" r="86"
            style={{
              strokeDasharray: `${2 * Math.PI * 86}`,
              strokeDashoffset: `${2 * Math.PI * 86 * (1 - progress)}`,
            }}
          />
        </svg>
        <div className="spha-cd-core">
          <p className="spha-cd-kicker">
            {live ? "PROTOCOL LIVE" : counting ? "OFFICIAL $SPHA TGE" : "OFFICIAL LAUNCH"}
          </p>
          {live ? (
            <div className="spha-cd-live">
              <div className="spha-cd-live-tag">${ticker} IS LIVE</div>
              <CopyCa ca={pack.mint} full />
              <a className="spha-cd-buy" href={`/swap?mint=${encodeURIComponent(pack.mint)}`}>
                BUY ${ticker}
              </a>
            </div>
          ) : counting ? (
            <div className="spha-cd-clock-wrap">
              {whenLabel ? <p className="spha-cd-when">{whenLabel}</p> : null}
              <div className="spha-cd-clock" role="timer" suppressHydrationWarning aria-live="polite" aria-label={`Launch in ${parts.d} days ${parts.h} hours ${parts.m} minutes ${parts.s} seconds`}>
                {cells.map((c, i) => (
                  <div key={c.k} className="spha-cd-unit">
                    <FlipCell label={c.k} value={c.v} />
                    {i < cells.length - 1 ? <span className="spha-cd-colon" aria-hidden>:</span> : null}
                  </div>
                ))}
              </div>
              <p className="spha-cd-sub">The clock is live. Contract address reveals here at T-0.</p>
            </div>
          ) : (
            <div className="spha-cd-soon">
              <span className="spha-cd-soon-glint">COMING SOON</span>
              <p className="spha-cd-sub">The official clock arms from the $SPHA launcher. Until then this core stays sealed.</p>
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
