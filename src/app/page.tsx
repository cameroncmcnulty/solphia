"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { SphaMark } from "@/components/SphaMark";
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
            <p className="flex items-center gap-2 text-sm tracking-[0.22em] text-acid sm:text-base">
              <SphaMark className="h-5 w-5" />
              THE SOLPHIA ECOSYSTEM · $SPHA
            </p>
            <h1 className="solphia-flow mt-3 font-display text-[clamp(2.6rem,11vw,5.8rem)] font-bold leading-[0.9] tracking-[-0.04em]">
              SOLPHIA
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-snug text-ghost sm:text-3xl sm:leading-tight">
              She auto-trades tokenized S&amp;P 500, Nasdaq-100, and gold — for profit.
            </p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-mute sm:text-lg">
              Connect Phantom. She clips SOL against official SPYx, QQQx, and GLDx when a book is stretched. Jupiter
              finds the route. You sign. Launch pad and $SPHA sit around that desk. Every swap funds listings,
              buybacks, and burns.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/trading" className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8 text-base">
                Open the desk
              </Link>
              <Link href="/token" className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8 text-base">
                $SPHA
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-12 md:py-24">
        <p className="text-sm tracking-[0.2em] text-acid">ECOSYSTEM</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-5xl md:text-6xl">
          Products that actually run.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-mute">
          The Solphia ecosystem is the desk, the launch pad, and $SPHA. She auto-trades tokenized stocks for profit.
          The other products feed the token.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <Eco
            n="01"
            t="Auto-trade"
            d="She watches SOL vs tokenized S&P 500, Nasdaq-100, and gold — and clips for profit when a pair stretches. Set it and close the tab. Paper runs 24/7 until you kill her or an 8% drop flattens the book."
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
            t="$SPHA"
            d="The protocol token. CA coming soon. Burns, holders, and liquidity live here the moment the mint is public."
            href="/token"
            c="Token"
          />
        </div>
      </section>

      <section className="px-4 py-16 md:px-12 md:py-24">
        <p className="flex items-center gap-2 text-sm tracking-[0.2em] text-acid">
          <SphaMark className="h-5 w-5" />
          $SPHA
        </p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-5xl md:text-6xl">
          Every swap has a job after the fill.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-mute">
          Desk clips and launch swaps take a protocol cut. That cut is reserved three ways: listings, buybacks, and
          burns — automatically, by design. The on-chain router ships after the mint. The rule is the product now.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Note t="Listings" d="A share of swap proceeds is earmarked for future exchange listing fees so $SPHA can show up where it should." />
          <Note t="Buybacks" d="A share is used to buy $SPHA on the open market. Demand from the products, not from a promise." />
          <Note t="Burns" d="A share is retired forever. More volume through the utilities, smaller circulating supply." />
        </div>
      </section>

      <BacktestBrochure />

      <section className="px-4 py-10 md:px-12">
        <div className="rounded-3xl border border-acid/25 bg-acid/[0.06] px-6 py-8 md:flex md:items-center md:justify-between md:px-10">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] tracking-[0.22em] text-acid">REFERRALS · 25% FOR LIFE</p>
            <h2 className="mt-2 font-display text-2xl text-ghost sm:text-3xl">Invite once. Get paid on every coin they launch.</h2>
            <p className="mt-2 text-sm leading-relaxed text-mute sm:text-base">
              First inviter locks forever. You earn 25% of swap fees on top of the 50% the actual dev keeps. Share the
              link, then withdraw from your dashboard.
            </p>
          </div>
          <Link
            href="/account#referrals"
            className="btn-acid mt-5 inline-flex min-h-[48px] items-center justify-center rounded-full px-7 text-base md:mt-0"
          >
            Get your link
          </Link>
        </div>
      </section>

      <section className="px-4 py-16 md:px-12 md:py-24">
        <p className="text-sm tracking-[0.2em] text-acid">HOW IT WORKS</p>
        <h2 className="mt-3 font-display text-4xl text-ghost sm:text-5xl">Three steps.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Chip t="01 · Connect" d="Phantom only. That wallet is login. She never holds a key." />
          <Chip t="02 · She trades" d="Auto-clips tokenized S&P, Nasdaq, and gold for profit. Launch sits beside that desk." />
          <Chip t="03 · Swap proceeds work" d="A portion of every swap is reserved for listings, buybacks, and burns." />
        </div>
      </section>

      <section className="px-4 pb-16 md:px-12 md:pb-24">
        <div className="rounded-3xl border border-violet/25 bg-void/40 px-6 py-12 md:flex md:items-center md:justify-between md:px-14 md:py-16">
          <div>
            <p className="flex items-center gap-2 text-sm tracking-[0.2em] text-mute">
              <SphaMark className="h-5 w-5" />
              $SPHA
            </p>
            <h2 className="mt-3 font-display text-4xl text-ghost sm:text-5xl md:text-6xl">Turn her on.</h2>
            <p className="mt-4 max-w-lg text-lg text-mute">
              She auto-trades tokenized stocks for profit. Keys in Phantom. Every swap: listings, buybacks, burns.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link href="/trading" className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8">
              Open the desk
            </Link>
            <Link href="/token" className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8">
              $SPHA
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
