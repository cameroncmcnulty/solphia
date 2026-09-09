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
            <p className="text-base font-medium tracking-wide text-acid sm:text-2xl">Solana aggregator</p>
            <h1 className="solphia-flow mt-1 font-display text-[clamp(2.4rem,12vw,5.75rem)] font-bold leading-[0.9] tracking-[-0.04em]">
              SOLPHIA
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-snug text-ghost sm:text-3xl sm:leading-tight">
              Jupiter finds the best route. She picks the best market — then takes it.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-mute sm:text-xl">
              Four official books, one clip: SOL vs S&amp;P 500, Nasdaq-100, and gold. Quotes on Jupiter. You sign in
              Phantom. Built at that scale — a routing layer, not a gadget.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/trading"
                className="btn-acid inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-center text-base sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-lg"
              >
                Open the desk
              </Link>
              <Link
                href="/launch"
                className="btn-ghost inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-center text-base sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-lg"
              >
                Launch a coin
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LiveStats />

      <section className="px-4 py-10 md:px-12 md:py-16">
        <p className="text-base text-acid sm:text-lg">The aggregator</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-ghost sm:text-4xl md:text-6xl">
          Same class as Jupiter. Next job up the stack.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-mute sm:text-xl">
          Jupiter is how Solana finds the cheapest hop across AMMs. Solphia sits on that rail: she watches SOL against
          official SPYx, QQQx, and GLDx, takes the sleeve that’s stretched, then asks Jupiter for the quote. Stale,
          thin, or junk routes are skipped. Intermediate hops stay on liquid official mints. You approve the swap.
          She never holds the key.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tech t="Jupiter quotes" d="Live swap routes. Impact and out-amount before she clips." />
          <Tech t="Official mints only" d="SOL, USDC, SPYx, QQQx, GLDx. Fake tickers are refused." />
          <Tech t="Clean hops" d="Restricts intermediates. Drops stale, thin, or junk paths." />
          <Tech t="Four sleeves, one clip" d="She sizes ~20% into the pair that’s actually stretched." />
        </div>
      </section>

      <section className="px-4 py-10 md:px-12 md:py-16">
        <p className="text-base text-acid sm:text-lg">The stack</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-ghost sm:text-4xl md:text-6xl">
          Three products. One ecosystem.
        </h2>
        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          <Pillar
            k="01"
            t="Trade"
            d="The aggregator desk. SOL vs official SPYx, QQQx, GLDx. Jupiter for the route. Paper first. Optional 2×/3× on SOL. Phantom signs."
            href="/trading"
            c="Open desk"
          />
          <Pillar
            k="02"
            t="Launch"
            d="Fair bonding curve. 1B supply, mint and freeze locked, 1% swap, 50% of fees to the creator. Swap like you would in Phantom."
            href="/launch"
            c="Launch"
          />
          <Pillar
            k="03"
            t="$SOLPHIA*"
            d="The protocol token. CA coming soon. Burned supply, holders, and liquidity live on Token the moment the mint is public."
            href="/token"
            c="Token desk"
          />
        </div>
      </section>

      <BacktestBrochure />
      <TickerCharts />

      <section className="px-4 py-10 md:px-12 md:py-16">
        <p className="text-base text-acid sm:text-lg">Why it holds together</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-ghost sm:text-4xl md:text-6xl">
          Built like a chain, not a gadget.
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Feature
            t="Jupiter under the hood"
            d="Every live clip is a Jupiter quote with official endpoints. She chooses the market; the aggregator finds the hop. PnL is marked in USDC."
          />
          <Feature
            t="Keys never leave Phantom"
            d="Connect is login. She never asks for a seed. Practice on live prices with paper, then size in when you are ready."
          />
          <Feature
            t="Fair launches, not team bags"
            d="Create is free. 800M on a constant-product curve, 200M into LP at 85 SOL. 5% wallet cap. 50% of the 1% swap is paid to the dev."
          />
          <Feature
            t="A token with a home"
            d="$SOLPHIA* is the protocol asset — not a side meme. The Token page is its desk: burns, holders, liquidity, CA when it is live."
          />
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
            <h2 className="mt-2 font-display text-3xl text-ghost sm:text-4xl md:text-6xl">Enter the stack.</h2>
            <p className="mt-3 text-base text-mute sm:text-xl">Trade. Launch. $SOLPHIA*. Keys in Phantom.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link
              href="/trading"
              className="btn-acid inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-base sm:w-auto sm:px-8 sm:text-lg"
            >
              Open the desk
            </Link>
            <Link
              href="/token"
              className="btn-ghost inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-6 py-3 text-base sm:w-auto sm:px-8 sm:text-lg"
            >
              $SOLPHIA*
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Pillar({ k, t, d, href, c }: { k: string; t: string; d: string; href: string; c: string }) {
  return (
    <Link href={href} className="panel rounded-3xl p-5 sm:p-7">
      <div className="text-base text-acid sm:text-lg">{k}</div>
      <div className="mt-3 font-display text-2xl text-ghost sm:text-3xl">{t}</div>
      <p className="mt-3 text-base leading-relaxed text-mute">{d}</p>
      <div className="mt-6 text-base text-acid">{c} →</div>
    </Link>
  );
}

function Feature({ t, d }: { t: string; d: string }) {
  return (
    <div className="panel rounded-3xl p-5 sm:p-7">
      <div className="font-display text-2xl leading-tight text-ghost sm:text-3xl">{t}</div>
      <p className="mt-3 text-base leading-relaxed text-mute">{d}</p>
    </div>
  );
}

function Tech({ t, d }: { t: string; d: string }) {
  return (
    <div className="panel rounded-3xl p-5">
      <div className="font-display text-xl text-ghost sm:text-2xl">{t}</div>
      <p className="mt-2 text-sm leading-relaxed text-mute sm:text-base">{d}</p>
    </div>
  );
}
