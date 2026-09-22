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
            <h1 className="mt-3 text-[clamp(2.6rem,11vw,5.2rem)] font-semibold leading-[0.95] tracking-tight text-white">
              SOLPHIA
            </h1>
            <p className="mt-6 max-w-xl text-[22px] font-semibold leading-snug tracking-tight text-white sm:text-[28px]">
              Launch. Shill. Swap. $SPHA.
            </p>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/45 sm:text-[17px]">
              The autonomous desk is in testing. Backtest is live below. Launch pad and Shill Zone are open now.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/launch" className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8 text-base">
                Launch
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
        <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          Products that actually run.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] text-white/45 sm:text-[17px]">
          Launch pad, Shill Zone, and $SPHA. The trading bot stays in testing until the backtest holds live.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <Reveal delay={40} from="left"><Eco
            n="01"
            t="Shill"
            d="Live room. Drop a CA. Pin the rail. Vote the board."
            href="/shill"
            c="Shill"
          /></Reveal>
          <Reveal delay={120}><Eco
            n="02"
            t="Launch"
            d="1.00% forever — curve and after graduate. Creators take half. Invites keep a cut for life."
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
        <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          Every swap has a job after the fill.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] text-white/45 sm:text-[17px]">
          A cut of every swap goes to listings, buybacks, and burns.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Reveal delay={40} from="left"><Note t="Listings" d="A share is saved for future listings." /></Reveal>
          <Reveal delay={120}><Note t="Buybacks" d="A share buys $SPHA on the open market." /></Reveal>
          <Reveal delay={200} from="right"><Note t="Burns" d="A share is taken out of supply." /></Reveal>
        </div>
        </Reveal>
      </section>

      <section className="px-4 pt-6 md:px-12">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.22em] text-acid">AUTONOMOUS DESK · TESTING</p>
          <h2 className="mt-2 max-w-3xl text-[28px] font-semibold tracking-tight text-white sm:text-4xl">
            The bot stays in testing until it is profitable live.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] text-white/45 sm:text-[17px]">
            Same rules she will trade with. Fees are already in the line. This is a replay, not a live book.
          </p>
        </Reveal>
      </section>

      <BacktestBrochure />

      <section className="px-4 py-10 md:px-12">
        <Reveal>
        <div className="rounded-3xl border border-acid/25 bg-acid/[0.06] px-6 py-8 md:flex md:items-center md:justify-between md:px-10">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] tracking-[0.22em] text-acid">REFERRALS</p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-white sm:text-[28px]">Invite once. Get paid on every swap they launch.</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-white/45">
              Your link bonds their wallet. When they launch, you keep a cut of swap fees for life. Withdraw from your account.
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
        <h2 className="mt-3 text-[32px] font-semibold tracking-tight text-white sm:text-5xl">Three steps.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal delay={40} from="left"><Chip t="01 · Connect" d="Connect Phantom. We never hold a key." /></Reveal>
          <Reveal delay={120}><Chip t="02 · Launch" d="Mint on Meteora. 1% forever. Invites keep a cut for life." /></Reveal>
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
            <h2 className="mt-3 text-[32px] font-semibold tracking-tight text-white sm:text-5xl">Launch on Solphia.</h2>
            <p className="mt-4 max-w-lg text-[15px] text-white/45 sm:text-[17px]">
              Phantom signs. Keys stay in your wallet. The bot is still in testing.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link href="/launch" className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8">
              Launch
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
    <Link href={href} className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-4 text-left lg:block lg:rounded-[22px] lg:border lg:border-white/10 lg:bg-black/30 lg:p-6">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#14f195]">{n}</p>
        <p className="mt-1 text-[17px] font-semibold tracking-tight text-white lg:text-[22px]">{t}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-white/45">{d}</p>
        <p className="mt-2 hidden text-[15px] text-[#14f195] lg:block">{c} →</p>
      </div>
      <span className="text-white/30 lg:hidden">›</span>
    </Link>
  );
}

function Note({ t, d }: { t: string; d: string }) {
  return (
    <div className="border-b border-white/[0.06] py-4 lg:rounded-[22px] lg:border lg:border-white/10 lg:bg-black/30 lg:p-6">
      <p className="text-[17px] font-semibold tracking-tight text-white">{t}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-white/45">{d}</p>
    </div>
  );
}

function Chip({ t, d }: { t: string; d: string }) {
  return (
    <div className="border-b border-white/[0.06] py-4 lg:rounded-[22px] lg:border lg:border-white/10 lg:p-6">
      <p className="text-[17px] font-semibold tracking-tight text-white">{t}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-white/45">{d}</p>
    </div>
  );
}
