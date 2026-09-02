"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { WalletDesk } from "@/components/WalletDesk";
import { LiveStats } from "@/components/LiveStats";
import { FaqList } from "@/components/FaqList";
import { PlanCompare } from "@/components/PlanCompare";
import { PLANS } from "@/lib/plans";
import { useMarket } from "@/lib/hooks";

export default function Home() {
  const { data } = useMarket(15000);
  const tape = (data?.tokens || []).slice(0, 8);

  return (
    <main className="relative">
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-end gap-2 px-4 pt-2 md:px-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:min-h-[88vh] lg:gap-8 lg:py-4">
          <div className="order-1 mx-auto w-full lg:order-2">
            <SolphiaFace mode="hero" />
          </div>
          <div className="order-2 pb-10 pt-4 lg:order-1 lg:py-12">
            <p className="text-lg font-medium tracking-wide text-mute sm:text-2xl">Meet</p>
            <h1 className="solphia-flow mt-1 font-display text-[clamp(2.75rem,14vw,7.5rem)] font-bold leading-[0.9] tracking-[-0.04em]">
              SOLPHIA
            </h1>
            <p className="mt-5 max-w-xl text-xl leading-snug text-ghost sm:text-3xl sm:leading-tight">
              She refuses more than she fires.
            </p>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-mute sm:text-xl">
              Solana copy bot. Kill switch on. You keep the keys.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/trading"
                className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8 py-3 text-center text-base sm:min-h-[56px] sm:text-lg"
              >
                LAUNCH BOT
              </Link>
              <Link
                href="/terminal"
                className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8 py-3 text-center text-base sm:min-h-[56px] sm:text-lg"
              >
                Open the tape
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LiveStats />

      <section className="px-4 py-6 md:px-12">
        <div className="mb-3 text-sm text-mute">Live tape</div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tape.map((row: any) => (
            <Link
              key={row.token.mint}
              href="/trading"
              className="btn-ghost flex shrink-0 items-center gap-3 rounded-full px-5 py-3 text-base"
            >
              <span className="font-display text-xl text-ghost">{row.token.symbol}</span>
              <span className={row.report.verdict === "trade" ? "text-acid" : "text-mute"}>
                {row.report.verdict === "trade" ? "take" : row.report.verdict}
              </span>
            </Link>
          ))}
          {!tape.length && <span className="text-base text-mute">Waiting on the market…</span>}
        </div>
      </section>

      <section className="px-4 py-12 md:px-12 md:py-16">
        <p className="text-base text-acid sm:text-lg">How it works</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-ghost sm:text-4xl md:text-6xl">
          Connect. Set size. Launch.
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Step n="01" t="Connect" d="Phantom or Solflare. You sign." href="/trading" c="Connect" />
          <Step n="02" t="Set size" d="Max SOL, stop, take-profit." href="/trading" c="Configure" />
          <Step n="03" t="Paper first" d="Live tape. Fake fills. No risk." href="/trading" c="Open hub" />
          <Step n="04" t="Launch" d="Scout + Risk agree. Kill switch on." href="/trading" c="LAUNCH BOT" />
        </div>
      </section>

      <section className="px-4 py-8 md:px-12">
        <p className="text-base text-acid sm:text-lg">Why she’s different</p>
        <h2 className="mt-2 font-display text-3xl text-ghost sm:text-4xl md:text-6xl">Picky on purpose.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature t="Real stats" d="Paper book and refused count. No fake trader counters." href="/trading" />
          <Feature t="Simple rails" d="Size, safety, stop, take-profit. Drag to set." href="/trading" />
          <Feature t="P(grad)" d="Under 5 minutes is a no on Picks." href="/trading" />
          <Feature t="Copy" d="Visible setups only. She always copies the sell." href="/copy" />
          <Feature t="Picks" d="Learns from every close. Bars only move up." href="/trading" />
          <Feature t="0.35% fees" d="Other desks take ~1% a side." href="/pricing" />
        </div>
      </section>

      <section className="px-4 py-12 md:px-12 md:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl text-ghost sm:text-4xl md:text-5xl">Who she copies</h2>
            <p className="mt-2 text-base text-mute sm:text-lg">Quality this week, not a 30-day highlight reel.</p>
          </div>
          <Link href="/copy" className="btn-ghost inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-3 text-base">
            Full list
          </Link>
        </div>
        <div className="mt-6">
          <WalletDesk compact />
        </div>
      </section>

      <section className="px-4 py-12 md:px-12 md:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-base text-acid">Plans</p>
            <h2 className="mt-1 font-display text-3xl text-ghost sm:text-4xl md:text-6xl">Pick a desk</h2>
          </div>
          <Link href="/pricing" className="btn-ghost min-h-[44px] rounded-full px-6 text-base">
            See pricing
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PLANS.map((p) => (
            <Link key={p.id} href="/pricing" className="panel rounded-3xl p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.icon} alt="" className="h-14 w-14 rounded-2xl" />
              <div className="mt-4 font-display text-2xl text-ghost">{p.name}</div>
              <div className="mt-1 text-acid">{p.sol} SOL</div>
              <p className="mt-2 text-sm text-mute">{p.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 py-12 md:px-12 md:py-16">
        <h2 className="font-display text-3xl text-ghost sm:text-4xl md:text-6xl">Compare</h2>
        <p className="mt-3 max-w-2xl text-base text-mute sm:text-xl">Paper is free. Everything is 0.50 SOL / 30 days.</p>
        <div className="mt-8">
          <PlanCompare />
        </div>
      </section>

      <section className="px-4 py-12 md:px-12 md:py-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-3xl text-ghost sm:text-4xl md:text-5xl">Questions</h2>
          <Link href="/faq" className="text-base text-violet sm:text-lg">
            All FAQ →
          </Link>
        </div>
        <div className="mt-6 max-w-3xl">
          <FaqList limit={4} />
        </div>
      </section>

      <section className="px-4 pb-24 md:px-12">
        <div className="panel rounded-3xl p-6 sm:p-8 md:flex md:items-center md:justify-between md:p-14">
          <div>
            <p className="text-base text-mute sm:text-lg">Ready</p>
            <h2 className="mt-2 font-display text-3xl text-ghost sm:text-4xl md:text-6xl">Turn her on.</h2>
            <p className="mt-3 text-base text-mute sm:text-xl">Paper first. Keys on your device. Kill switch on.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link
              href="/trading"
              className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8 py-3 text-base sm:text-lg"
            >
              LAUNCH BOT
            </Link>
            <Link
              href="/pricing"
              className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8 py-3 text-base sm:text-lg"
            >
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
    <Link href={href} className="panel rounded-3xl p-6 sm:p-7">
      <div className="text-base text-acid sm:text-lg">{n}</div>
      <div className="mt-3 font-display text-2xl text-ghost sm:text-3xl">{t}</div>
      <p className="mt-3 text-base leading-relaxed text-mute">{d}</p>
      <div className="mt-6 text-base text-acid">{c} →</div>
    </Link>
  );
}

function Feature({ t, d, href }: { t: string; d: string; href: string }) {
  return (
    <Link href={href} className="panel rounded-3xl p-6 sm:p-7">
      <div className="font-display text-2xl leading-tight text-ghost sm:text-3xl">{t}</div>
      <p className="mt-3 text-base leading-relaxed text-mute">{d}</p>
      <div className="mt-6 text-base text-acid">Open →</div>
    </Link>
  );
}
