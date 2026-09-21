"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Blocks,
  Flame,
  Globe2,
  Landmark,
  Lock,
  Megaphone,
  Network,
  Sparkles,
  TrendingUp,
  Vote,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";

type Step = { t: string; Icon: LucideIcon };
type Era = { q: string; when: string; tag: string; live?: boolean; steps: Step[] };

const ERAS: Era[] = [
  {
    q: "Q4",
    when: "2026",
    tag: "GENESIS",
    live: true,
    steps: [
      { t: "Launch of Solphia — trading bot and token launcher", Icon: Activity },
      { t: "Launch of $SPHA", Icon: Sparkles },
      { t: "Marketing campaigns, community growth, transactional volume", Icon: Megaphone },
      { t: "Automate buybacks and burns", Icon: Flame },
    ],
  },
  {
    q: "Q1",
    when: "2027",
    tag: "EXPANSION",
    steps: [
      { t: "Small exchange listing exploration and applications", Icon: Globe2 },
      { t: "Increased transactional volume and buyback + burn rate", Icon: TrendingUp },
      { t: "New features on the token launcher / DEX", Icon: Blocks },
    ],
  },
  {
    q: "Q2",
    when: "2027",
    tag: "PROTOCOL",
    steps: [
      { t: "Major exchange listing exploration and applications", Icon: Landmark },
      { t: "Increase in ecosystem development", Icon: Network },
      { t: "Implement project governance", Icon: Vote },
      { t: "$SPHA staking", Icon: Lock },
    ],
  },
];

export function SphaRoadmap() {
  return (
    <section className="relative">
      <Reveal>
        <p className="text-[13px] font-medium text-[#14f195]">Roadmap</p>
        <h2 className="pump-h1 mt-2">The next blocks.</h2>
        <p className="pump-p mt-3 max-w-2xl">
          Each quarter is a block. We ship, then we mint the next one.
        </p>
      </Reveal>

      <div className="relative mt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-[1.15rem] top-6 w-px bg-gradient-to-b from-acid via-violet to-[#80eaff] sm:left-1/2 sm:-translate-x-px"
        />

        <div className="space-y-10 sm:space-y-14">
          {ERAS.map((era, i) => (
            <Reveal key={era.q + era.when} delay={i * 80} from={i % 2 ? "right" : "left"}>
              <EraBlock era={era} flip={i % 2 === 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function EraBlock({ era, flip }: { era: Era; flip: boolean }) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-2 z-10 flex h-9 w-9 items-center justify-center sm:left-1/2 sm:-translate-x-1/2">
        <span
          className={`h-3.5 w-3.5 rotate-45 border-2 ${
            era.live ? "border-acid bg-acid shadow-[0_0_18px_rgba(20,241,149,0.85)]" : "border-violet bg-[#12081c]"
          }`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-start sm:gap-0">
      <div
        className={`min-w-0 pl-12 sm:pl-0 ${
          flip ? "sm:col-start-2 sm:pl-12" : "sm:col-start-1 sm:pr-12 sm:text-right"
        }`}
      >
        <div className={`flex flex-wrap items-baseline gap-2 ${flip ? "sm:justify-start" : "sm:justify-end"}`}>
          <span className="font-display text-4xl text-ghost sm:text-5xl">{era.q}</span>
          <span className="font-mono text-sm text-mute">{era.when}</span>
          {era.live ? (
            <span className="rounded-full border border-acid/40 bg-acid/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] text-acid">
              LIVE
            </span>
          ) : null}
        </div>
        <div className={`mt-1 font-mono text-[10px] tracking-[0.22em] text-acid ${flip ? "" : "sm:text-right"}`}>
          {era.tag}
        </div>
      </div>

      <div className={`space-y-2.5 pl-12 sm:pl-0 ${flip ? "sm:col-start-1 sm:row-start-1 sm:pr-12" : "sm:col-start-2 sm:pl-12"}`}>
        {era.steps.map((s) => (
          <div
            key={s.t}
            className="flex items-start gap-3 rounded-2xl border border-violet/20 bg-void/45 px-3.5 py-3 backdrop-blur-md transition hover:border-acid/40 hover:bg-acid/[0.06]"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-acid/10 text-acid">
              <s.Icon className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <p className="pt-1.5 text-sm leading-snug text-ghost sm:text-[15px]">{s.t}</p>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
