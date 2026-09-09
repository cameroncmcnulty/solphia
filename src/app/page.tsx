"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { LiveStats } from "@/components/LiveStats";
import { BacktestBrochure } from "@/components/BacktestBrochure";

export default function Home() {
  return (
    <main className="relative">
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-4 md:px-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:min-h-[78vh] lg:py-10">
          <div className="order-1 mx-auto w-full max-w-[220px] sm:max-w-[360px] lg:order-2 lg:max-w-[500px]">
            <SolphiaFace mode="hero" />
          </div>
          <div className="order-2 pb-10 lg:order-1 lg:pb-4">
            <p className="text-sm tracking-[0.22em] text-acid sm:text-base">THE SOLANA ECOSYSTEM · $SPHA*</p>
            <h1 className="solphia-flow mt-3 font-display text-[clamp(2.6rem,11vw,5.8rem)] font-bold leading-[0.9] tracking-[-0.04em]">
              SOLPHIA
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-snug text-ghost sm:text-3xl sm:leading-tight">
              Aggregator. Launch pad. $SPHA*. One stack — and every product tightens the token.
            </p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-mute sm:text-lg">
              Jupiter finds the route. She picks the market. Desk volume and launch fees buy $SPHA* off the market and
              retire it. Use the utilities; supply does the rest.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/trading" className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8 text-base">
                Open the desk
              </Link>
              <Link href="/token" className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8 text-base">
                $SPHA*
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LiveStats />

      <section className="px-4 py-16 md:px-12 md:py-24">
        <p className="text-sm tracking-[0.2em] text-acid">ECOSYSTEM</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-5xl md:text-6xl">
          Products that actually run.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-mute">
          Floki built a universe around a token. Solphia does the same on Solana — with a desk, a launch pad, and a
          token that only gets scarcer as those products are used.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <Eco
            n="01"
            t="Aggregator"
            d="Four official books. One clip. SOL versus SPYx, QQQx, and GLDx. Jupiter quotes. Phantom signs. Paper first."
            href="/trading"
            c="Trade"
          />
          <Eco
            n="02"
            t="Launch"
            d="Fair bonding curve. 1B supply. Mint and freeze locked. 1% swap. 50% of fees to the creator."
            href="/launch"
            c="Launch"
          />
          <Eco
            n="03"
            t="$SPHA*"
            d="The protocol token. CA coming soon. Burns, holders, and liquidity live here the moment the mint is public."
            href="/token"
            c="Token"
          />
        </div>
      </section>

      <section className="px-4 py-16 md:px-12 md:py-24">
        <p className="text-sm tracking-[0.2em] text-acid">$SPHA*</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-5xl md:text-6xl">
          The utilities write the tokenomics.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-mute">
          $SPHA* is not a sticker on the ecosystem. It is what the ecosystem pays. Protocol revenue from the desk and
          the launch pad is used to buy $SPHA* and take it out of circulation — automatically. More flow through the
          products means a smaller float.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Note t="Desk" d="Clips on official markets generate protocol take. A slice buys $SPHA* and burns it." />
          <Note t="Launch" d="Every 1% swap on the curve feeds the same engine. Creators get paid. Supply tightens." />
          <Note t="Token" d="The burn ledger, holders, and CA live on the $SPHA* desk. No data until mint is live — the rails are ready." />
        </div>
      </section>

      <section className="px-4 py-16 md:px-12 md:py-24">
        <p className="text-sm tracking-[0.2em] text-acid">AGGREGATOR</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-5xl md:text-6xl">
          Jupiter-class routing. Next job up.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-mute">
          Jupiter is how Solana finds the cheapest hop. Solphia sits on that rail: she watches SOL against official
          xStocks, takes the stretched sleeve, then asks Jupiter for the quote. Junk routes never print.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Chip t="Jupiter quotes" d="Live route, impact, and out-amount before she clips." />
          <Chip t="Official mints" d="SOL, USDC, SPYx, QQQx, GLDx. Lookalikes are refused." />
          <Chip t="Clean hops" d="Liquid intermediates only. Stale and thin paths drop." />
          <Chip t="One clip" d="About 20% into the pair that’s actually stretched." />
        </div>
      </section>

      <BacktestBrochure />

      <section className="px-4 py-16 md:px-12 md:py-24">
        <p className="text-sm tracking-[0.2em] text-acid">HOW IT WORKS</p>
        <h2 className="mt-3 font-display text-4xl text-ghost sm:text-5xl">Three steps.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Chip t="01 · Connect" d="Phantom only. That wallet is login. She never holds a key." />
          <Chip t="02 · Use a product" d="Trade the books. Launch a coin. Both feed $SPHA*." />
          <Chip t="03 · Supply tightens" d="Protocol revenue buys $SPHA* and retires it. The stack is the buyback." />
        </div>
      </section>

      <section className="px-4 pb-16 md:px-12 md:pb-24">
        <div className="rounded-3xl border border-violet/25 bg-void/40 px-6 py-12 md:flex md:items-center md:justify-between md:px-14 md:py-16">
          <div>
            <p className="text-sm tracking-[0.2em] text-mute">$SPHA*</p>
            <h2 className="mt-3 font-display text-4xl text-ghost sm:text-5xl md:text-6xl">Enter the ecosystem.</h2>
            <p className="mt-4 max-w-lg text-lg text-mute">Keys in Phantom. Utilities on chain. Burns from use.</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link href="/trading" className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8">
              Open the desk
            </Link>
            <Link href="/token" className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8">
              $SPHA*
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Eco({ n, t, d, href, c }: { n: string; t: string; d: string; href: string; c: string }) {
  return (
    <Link href={href} className="group flex flex-col rounded-3xl border border-violet/20 bg-void/35 p-8 transition hover:border-acid/40">
      <div className="font-mono text-sm text-acid">{n}</div>
      <div className="mt-6 font-display text-3xl text-ghost">{t}</div>
      <p className="mt-4 flex-1 text-base leading-relaxed text-mute">{d}</p>
      <div className="mt-8 text-base text-acid group-hover:underline">{c} →</div>
    </Link>
  );
}

function Note({ t, d }: { t: string; d: string }) {
  return (
    <div className="rounded-3xl border border-violet/20 bg-void/30 p-7">
      <div className="font-display text-2xl text-ghost">{t}</div>
      <p className="mt-3 text-base leading-relaxed text-mute">{d}</p>
    </div>
  );
}

function Chip({ t, d }: { t: string; d: string }) {
  return (
    <div className="rounded-3xl border border-violet/15 p-6">
      <div className="font-display text-xl text-ghost">{t}</div>
      <p className="mt-2 text-sm leading-relaxed text-mute sm:text-base">{d}</p>
    </div>
  );
}
