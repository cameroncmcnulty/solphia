"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { LiveStats } from "@/components/LiveStats";
import { TickerCharts } from "@/components/TickerCharts";
import { FaqList } from "@/components/FaqList";
import { BacktestBrochure } from "@/components/BacktestBrochure";

export default function Home() {
  return (
    <main className="relative">
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-4 px-4 pt-2 md:gap-6 md:px-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:min-h-[72vh] lg:gap-10 lg:py-8">
          <div className="order-1 mx-auto w-full max-w-[200px] sm:max-w-[340px] lg:order-2 lg:max-w-[480px]">
            <SolphiaFace mode="hero" />
          </div>
          <div className="order-2 pb-8 pt-1 lg:order-1 lg:pb-8 lg:pt-8">
            <p className="text-base font-medium tracking-wide text-mute sm:text-2xl">Meet</p>
            <h1 className="solphia-flow mt-1 font-display text-[clamp(2.4rem,12vw,5.75rem)] font-bold leading-[0.9] tracking-[-0.04em]">
              SOLPHIA
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-snug text-ghost sm:text-3xl sm:leading-tight">
              She splits SOL across USDC, S&P 500, Nasdaq-100, and gold — and trades whichever pair is stretched.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-mute sm:text-xl">
              Connect Phantom. Add SOL. She handles the rest. Practice first. Your keys stay in your wallet.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/trading"
                className="btn-acid inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-center text-base sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-lg"
              >
                LAUNCH BOT
              </Link>
              <Link
                href="/faq"
                className="btn-ghost inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-center text-base sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-lg"
              >
                How she trades
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LiveStats />
      <BacktestBrochure />
      <TickerCharts />

      <section className="px-4 py-10 md:px-12 md:py-16">
        <p className="text-base text-acid sm:text-lg">How it works</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-ghost sm:text-4xl md:text-6xl">
          Connect. Add SOL. She trades.
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Step n="01" t="Connect" d="Phantom only. You approve. We never hold your keys." href="/trading" c="Connect" />
          <Step n="02" t="Add SOL" d="Move SOL into a trading wallet on this device." href="/trading" c="Add SOL" />
          <Step n="03" t="Practice" d="She trades on live prices with fake money first, so you can watch." href="/trading" c="Open hub" />
          <Step n="04" t="Stop" d="Hit KILL any time. She sells back and you can withdraw." href="/trading" c="LAUNCH BOT" />
        </div>
      </section>

      <section className="px-4 py-8 md:px-12">
        <p className="text-base text-acid sm:text-lg">What she actually does</p>
        <h2 className="mt-2 font-display text-3xl text-ghost sm:text-4xl md:text-6xl">Every pair. One job.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature t="S&P 500, Nasdaq, gold" d="Official SPYx, QQQx, and GLDx only. Fake tickers are refused." href="/trading" />
          <Feature
            t="Any pair that’s stretched"
            d="If SOL drops 0.7% while gold or the S&P holds, she can take that 1% gap on a short tape — not just the slow 7-day stretch."
            href="/trading"
          />
          <Feature t="PnL in USDC" d="The book, stops, and profit are marked in USDC so a SOL candle doesn’t fake the score." href="/trading" />
          <Feature t="Practice first" d="Paper is always on so you can see PnL before you risk SOL." href="/trading" />
          <Feature t="Your wallet, your keys" d="Phantom stays in charge. She never asks for a seed phrase." href="/trading" />
          <Feature t="Spot only" d="No borrowed money. An 8% drop sells everything and pauses." href="/trading" />
        </div>
      </section>

      <section className="px-4 py-10 md:px-12 md:py-16">
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

      <section className="px-4 pb-8 md:px-12">
        <div className="panel rounded-3xl p-5 sm:p-8 md:flex md:items-center md:justify-between md:p-14">
          <div>
            <p className="text-base text-mute sm:text-lg">Ready</p>
            <h2 className="mt-2 font-display text-3xl text-ghost sm:text-4xl md:text-6xl">Turn her on.</h2>
            <p className="mt-3 text-base text-mute sm:text-xl">Practice first. Keys in Phantom. KILL always works.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link
              href="/trading"
              className="btn-acid inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-base sm:w-auto sm:px-8 sm:text-lg"
            >
              LAUNCH BOT
            </Link>
            <Link
              href="/pricing"
              className="btn-ghost inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-base sm:w-auto sm:px-8 sm:text-lg"
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
    <Link href={href} className="panel rounded-3xl p-5 sm:p-7">
      <div className="text-base text-acid sm:text-lg">{n}</div>
      <div className="mt-3 font-display text-2xl text-ghost sm:text-3xl">{t}</div>
      <p className="mt-3 text-base leading-relaxed text-mute">{d}</p>
      <div className="mt-6 text-base text-acid">{c} →</div>
    </Link>
  );
}

function Feature({ t, d, href }: { t: string; d: string; href: string }) {
  return (
    <Link href={href} className="panel rounded-3xl p-5 sm:p-7">
      <div className="font-display text-2xl leading-tight text-ghost sm:text-3xl">{t}</div>
      <p className="mt-3 text-base leading-relaxed text-mute">{d}</p>
      <div className="mt-6 text-base text-acid">Open →</div>
    </Link>
  );
}
