"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { SphaMark } from "@/components/SphaMark";
import { BacktestBrochure } from "@/components/BacktestBrochure";
import { Reveal } from "@/components/Reveal";
import { OrbitTickers } from "@/components/OrbitTickers";

export default function Home() {
  return (
    <main className="relative">
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-4 md:px-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:min-h-[78vh] lg:py-10">
          <div className="relative order-1 mx-auto w-full max-w-[24rem] overflow-visible sm:max-w-[440px] lg:order-2 lg:max-w-[580px]">
            <OrbitTickers />
            <SolphiaFace mode="hero" />
          </div>
          <div className="order-2 pb-10 lg:order-1 lg:pb-4">
            <Reveal>
            <p className="flex items-center gap-2 text-sm tracking-[0.22em] text-acid sm:text-base">
              <SphaMark className="h-5 w-5" />
              THE SOLPHIA ECOSYSTEM · $SPHA
            </p>
            <h1 className="solphia-flow mt-3 font-display text-[clamp(2.6rem,11vw,5.8rem)] font-bold leading-[0.9] tracking-[-0.04em]">
              SOLPHIA
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-snug text-ghost sm:text-3xl sm:leading-tight">
              She auto-trades tokenized S&amp;P 500, Nasdaq, and gold — for profit.
            </p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-mute sm:text-lg">
              Connect your wallet. She trades tokenized S&P 500, Nasdaq, and gold. Launch and $SPHA sit around that desk.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/trading" className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8 text-base">
                Trading desk
              </Link>
              <Link href="/token" className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8 text-base">
                $SPHA
              </Link>
            </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-12 md:py-24">
        <Reveal>
        <p className="text-sm tracking-[0.2em] text-acid">ECOSYSTEM</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-5xl md:text-6xl">
          Products that actually run.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-mute">
          Trading desk, launch pad, and $SPHA. She trades. The rest feeds the token.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <Reveal delay={40} from="left"><Eco
            n="01"
            t="Auto-trade"
            d="She trades tokenized S&P 500, Nasdaq, and gold. Turn her on and close the tab."
            href="/trading"
            c="Tools"
          /></Reveal>
          <Reveal delay={120}><Eco
            n="02"
            t="Launch"
            d="Launch a token. Swap it. Boost it to the top."
            href="/launch"
            c="Launch"
          /></Reveal>
          <Reveal delay={200} from="right"><Eco
            n="03"
            t="$SPHA"
            d="The protocol token. Swaps fund listings, buybacks, and burns."
            href="/token"
            c="Token"
          /></Reveal>
        </div>
        </Reveal>
      </section>

      <section className="px-4 py-16 md:px-12 md:py-24">
        <Reveal>
        <p className="flex items-center gap-2 text-sm tracking-[0.2em] text-acid">
          <SphaMark className="h-5 w-5" />
          $SPHA
        </p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-5xl md:text-6xl">
          Every swap has a job after the fill.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-mute">
          A cut of every swap goes to listings, buybacks, and burns.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Reveal delay={40} from="left"><Note t="Listings" d="A share is saved for future listings." /></Reveal>
          <Reveal delay={120}><Note t="Buybacks" d="A share buys $SPHA on the open market." /></Reveal>
          <Reveal delay={200} from="right"><Note t="Burns" d="A share is taken out of supply." /></Reveal>
        </div>
        </Reveal>
      </section>

      <BacktestBrochure />

      <section className="px-4 py-10 md:px-12">
        <Reveal>
        <div className="rounded-3xl border border-acid/25 bg-acid/[0.06] px-6 py-8 md:flex md:items-center md:justify-between md:px-10">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] tracking-[0.22em] text-acid">REFERRALS</p>
            <h2 className="mt-2 font-display text-2xl text-ghost sm:text-3xl">Invite once. Get paid when they launch.</h2>
            <p className="mt-2 text-sm leading-relaxed text-mute sm:text-base">
              Share your link. Withdraw from your account.
            </p>
          </div>
          <Link
            href="/account#referrals"
            className="btn-acid mt-5 inline-flex min-h-[48px] items-center justify-center rounded-full px-7 text-base md:mt-0"
          >
            Get your link
          </Link>
        </div>
        </Reveal>
      </section>

      <section className="px-4 py-16 md:px-12 md:py-24">
        <Reveal>
        <p className="text-sm tracking-[0.2em] text-acid">HOW IT WORKS</p>
        <h2 className="mt-3 font-display text-4xl text-ghost sm:text-5xl">Three steps.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal delay={40} from="left"><Chip t="01 · Connect" d="Connect your wallet. We never hold a key." /></Reveal>
          <Reveal delay={120}><Chip t="02 · She trades" d="Tokenized S&P, Nasdaq, and gold. Launch sits next to the desk." /></Reveal>
          <Reveal delay={200} from="right"><Chip t="03 · $SPHA" d="Swaps fund listings, buybacks, and burns." /></Reveal>
        </div>
        </Reveal>
      </section>

      <section className="px-4 pb-16 md:px-12 md:pb-24">
        <Reveal>
        <div className="rounded-3xl border border-violet/25 bg-void/40 px-6 py-12 md:flex md:items-center md:justify-between md:px-14 md:py-16">
          <div>
            <p className="flex items-center gap-2 text-sm tracking-[0.2em] text-mute">
              <SphaMark className="h-5 w-5" />
              $SPHA
            </p>
            <h2 className="mt-3 font-display text-4xl text-ghost sm:text-5xl md:text-6xl">Turn her on.</h2>
            <p className="mt-4 max-w-lg text-lg text-mute">
              She trades. Keys stay in your wallet.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link href="/trading" className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8">
              Trading desk
            </Link>
            <Link href="/token" className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8">
              $SPHA
            </Link>
          </div>
        </div>
        </Reveal>
      </section>
    </main>
  );
}

function Eco({ n, t, d, href, c }: { n: string; t: string; d: string; href: string; c: string }) {
  return (
    <Link href={href} className="card-lift group flex flex-col rounded-3xl border border-violet/20 bg-void/35 p-8 hover:border-acid/40">
      <div className="font-mono text-sm text-acid">{n}</div>
      <div className="mt-6 font-display text-3xl text-ghost">{t}</div>
      <p className="mt-4 flex-1 text-base leading-relaxed text-mute">{d}</p>
      <div className="mt-8 text-base text-acid group-hover:underline">{c} →</div>
    </Link>
  );
}

function Note({ t, d }: { t: string; d: string }) {
  return (
    <div className="card-lift rounded-3xl border border-violet/20 bg-void/30 p-7">
      <div className="font-display text-2xl text-ghost">{t}</div>
      <p className="mt-3 text-base leading-relaxed text-mute">{d}</p>
    </div>
  );
}

function Chip({ t, d }: { t: string; d: string }) {
  return (
    <div className="card-lift rounded-3xl border border-violet/15 p-6">
      <div className="font-display text-xl text-ghost">{t}</div>
      <p className="mt-2 text-sm leading-relaxed text-mute sm:text-base">{d}</p>
    </div>
  );
}
