"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CopyCa } from "@/components/CopyCa";
import { SphaMark } from "@/components/SphaMark";
import { SphaSocials } from "@/components/SphaSocials";
import { SolphiaConstellation } from "@/components/SolphiaConstellation";
import { solphiaTokenDesk } from "@/lib/token/solphia";

function tick(symbol: string) {
  const s = symbol.replace(/^\$+/, "").replace(/\*+$/, "").trim();
  return s ? `$${s}` : "";
}

export default function TokenPage() {
  const t = solphiaTokenDesk();
  const [socials, setSocials] = useState({ x: "", telegram: "", discord: "" });

  useEffect(() => {
    fetch("/api/spha", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.socials) setSocials({ x: j.socials.x || "", telegram: j.socials.telegram || "", discord: j.socials.discord || "" });
      })
      .catch(() => {});
  }, []);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-x-hidden pb-24">
      <SolphiaConstellation />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 md:px-8 md:pt-14">
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">PROTOCOL TOKEN</p>
        <div className="mt-3 flex items-center gap-4">
          <SphaMark className="h-14 w-14 sm:h-16 sm:w-16" />
          <h1 className="font-display text-5xl text-ghost sm:text-7xl">{tick(t.symbol)}</h1>
        </div>
        <p className="mt-5 max-w-2xl text-lg text-mute sm:text-xl">
          Every swap in the stack sets aside a portion of proceeds for three jobs: future listing fees, market
          buybacks, and {tick(t.symbol)} burns. Automatic by design. The router ships after mint. CA coming soon.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <SphaSocials x={socials.x} telegram={socials.telegram} discord={socials.discord} />
          <CopyCa ca={t.mint || undefined} />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Story
            t="Listings"
            d="A share of every swap is reserved for future exchange listing fees — so $SPHA can list without a surprise raise."
          />
          <Story
            t="Buybacks"
            d="A share buys $SPHA on the open market. Desk clips and launch swaps are the bid."
          />
          <Story
            t="Burns"
            d="A share is taken out of circulation. Volume in the utilities is what tightens the float."
          />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.stats.map((s) => (
            <Bubble key={s.k} k={s.k} v={s.v} hint={s.hint} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.extra.map((s) => (
            <Bubble key={s.k} k={s.k} v={s.v} />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/trading" className="btn-acid inline-flex min-h-[48px] items-center justify-center rounded-full px-8">
            Open the desk
          </Link>
          <Link href="/launch" className="btn-ghost inline-flex min-h-[48px] items-center justify-center rounded-full px-8">
            Launch
          </Link>
        </div>
      </div>
    </main>
  );
}

function Story({ t, d }: { t: string; d: string }) {
  return (
    <div className="panel-bubble rounded-3xl p-6">
      <div className="font-display text-2xl text-ghost">{t}</div>
      <p className="mt-3 text-sm leading-relaxed text-mute sm:text-base">{d}</p>
    </div>
  );
}

function Bubble({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="panel-bubble rounded-3xl px-4 py-4">
      <div className="font-mono text-[10px] tracking-[0.16em] text-mute">{k}</div>
      <div className="mt-1 font-display text-2xl text-ghost sm:text-3xl">{v}</div>
      {hint && <div className="mt-1 font-mono text-[10px] text-mute">{hint}</div>}
    </div>
  );
}
