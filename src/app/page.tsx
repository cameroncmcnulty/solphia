"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { WalletDesk } from "@/components/WalletDesk";
import { LiveStats } from "@/components/LiveStats";
import { FaqList } from "@/components/FaqList";
import { PlanCompare } from "@/components/PlanCompare";
import { useMarket } from "@/lib/hooks";

export default function Home() {
  const { data } = useMarket(15000);
  const tape = (data?.tokens || []).slice(0, 8);

  return (
    <main className="relative">
      <section className="relative min-h-[92vh] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-45 lg:opacity-55">
          <SolphiaFace mode="hero" />
        </div>
        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-center px-5 py-16 md:px-12">
          <p className="text-xl font-medium tracking-wide text-mute sm:text-2xl md:text-3xl">Welcome to</p>
          <h1 className="solphia-flow mt-2 font-display text-[18vw] font-bold leading-[0.88] tracking-[-0.04em] sm:text-[14vw] md:text-[11vw] lg:text-[9.5rem]">
            SOLPHIA
          </h1>
          <p className="mt-6 max-w-3xl text-2xl leading-snug text-ghost sm:text-3xl md:text-4xl md:leading-tight">
            She refuses more than she fires.
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-mute sm:text-xl">
            A Solana copy bot with a kill switch. Scout finds a setup. Risk has to agree. You keep the keys.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auto"
              className="btn-acid inline-flex min-h-[56px] items-center justify-center rounded-full px-10 py-4 text-center text-lg"
            >
              Get started
            </Link>
            <Link
              href="/terminal"
              className="btn-ghost inline-flex min-h-[56px] items-center justify-center rounded-full px-10 py-4 text-center text-lg"
            >
              Open the tape
            </Link>
          </div>
        </div>
      </section>

      <LiveStats />

      <section className="px-5 py-6 md:px-12">
        <div className="mb-3 text-sm text-mute">Live tape</div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {tape.map((row: any) => (
            <Link
              key={row.token.mint}
              href="/terminal"
              className="flex shrink-0 items-center gap-3 rounded-full border border-violet/30 px-5 py-3 text-base"
            >
              <span className="font-display text-xl text-ghost">{row.token.symbol}</span>
              <span className={row.report.verdict === "trade" ? "text-acid" : "text-mute"}>
                {row.report.verdict === "trade" ? "take" : row.report.verdict}
              </span>
            </Link>
          ))}
          {!tape.length && <span className="text-lg text-mute">Waiting on the market…</span>}
        </div>
      </section>

      <section className="px-5 py-16 md:px-12">
        <p className="text-lg text-acid">How it works</p>
        <h2 className="mt-2 max-w-3xl font-display text-4xl leading-tight text-ghost md:text-6xl">
          Four steps. No mystery menu.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Step n="01" t="Connect" d="Phantom or Solflare. You sign. She never sees a seed." href="/auto" c="Connect wallet" />
          <Step n="02" t="Configure" d="Max SOL, safety, stop, take-profit. The preview updates as you drag." href="/auto" c="Open config" />
          <Step n="03" t="Watch" d="The tape, P(grad), names she refused. Paper until live is on." href="/terminal" c="Open tape" />
          <Step n="04" t="Turn her on" d="Scout + Risk + policy. Kill switch on. Close the phone." href="/auto" c="Turn her on" />
        </div>
      </section>

      <section className="px-5 py-8 md:px-12">
        <p className="text-lg text-acid">Why she’s different</p>
        <h2 className="mt-2 font-display text-4xl text-ghost md:text-6xl">Picky on purpose.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature t="Live stats that are real" d="Paper book, refused count, mind bar. No fake trader counters." href="/terminal" />
          <Feature t="Configuration you can read" d="Sliders for size, safety, stop, take-profit." href="/auto" />
          <Feature t="P(grad), not a sniper" d="Under 5 minutes is a no on Picks." href="/terminal?desk=launch" />
          <Feature t="Copy the decision" d="Only when a follower could have seen the setup. Always copy the exit." href="/copy" />
          <Feature t="Solphia Picks" d="Learns from after-fee PnL. Bars only move up after losses." href="/terminal?desk=picks" />
          <Feature t="0.35% vs ~1%" d="Other terminals take about 1% a side. She takes 35 bps." href="/pricing" />
        </div>
      </section>

      <section className="px-5 py-16 md:px-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-4xl text-ghost md:text-5xl">Who she copies</h2>
            <p className="mt-2 text-lg text-mute">Quality this week, not a 30-day highlight reel.</p>
          </div>
          <Link href="/copy" className="btn-ghost rounded-full px-6 py-3 text-base">
            Full list
          </Link>
        </div>
        <div className="mt-6">
          <WalletDesk compact />
        </div>
      </section>

      <section className="px-5 py-16 md:px-12">
        <h2 className="font-display text-4xl text-ghost md:text-6xl">Plans, compared.</h2>
        <p className="mt-3 max-w-2xl text-xl text-mute">
          Paper is free. Everything is 0.50 SOL / 30 days — cheaper than buying the desks separate.
        </p>
        <div className="mt-8">
          <PlanCompare />
        </div>
      </section>

      <section className="px-5 py-16 md:px-12">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-4xl text-ghost md:text-5xl">Questions</h2>
          <Link href="/faq" className="text-lg text-violet">
            All FAQ →
          </Link>
        </div>
        <div className="mt-6 max-w-3xl">
          <FaqList limit={4} />
        </div>
      </section>

      <section className="px-5 pb-20 md:px-12">
        <div className="panel rounded-3xl p-8 md:flex md:items-center md:justify-between md:p-14">
          <div>
            <p className="text-lg text-mute">Ready</p>
            <h2 className="mt-2 font-display text-4xl text-ghost md:text-6xl">Turn her on.</h2>
            <p className="mt-3 text-xl text-mute">Paper first. Keys on your device. Kill switch on.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link href="/auto" className="btn-acid inline-flex min-h-[56px] items-center justify-center rounded-full px-10 py-4 text-lg">
              Get started
            </Link>
            <Link href="/pricing" className="btn-ghost inline-flex min-h-[56px] items-center justify-center rounded-full px-10 py-4 text-lg">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Step({ n, t, d, href, c }: { n: string; t: string; d: string; href: string; c: string }) {
  return (
    <Link href={href} className="panel rounded-3xl p-7">
      <div className="text-lg text-acid">{n}</div>
      <div className="mt-3 font-display text-3xl text-ghost">{t}</div>
      <p className="mt-3 text-lg leading-relaxed text-mute">{d}</p>
      <div className="mt-6 text-base text-acid">{c} →</div>
    </Link>
  );
}

function Feature({ t, d, href }: { t: string; d: string; href: string }) {
  return (
    <Link href={href} className="panel rounded-3xl p-7">
      <div className="font-display text-3xl leading-tight text-ghost">{t}</div>
      <p className="mt-3 text-lg leading-relaxed text-mute">{d}</p>
      <div className="mt-6 text-base text-acid">Open →</div>
    </Link>
  );
}
