"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { LiveStats } from "@/components/LiveStats";
import { FaqList } from "@/components/FaqList";
import { useMarket } from "@/lib/hooks";

export default function Home() {
  const { data } = useMarket(8000);
  const pair = data?.pair;
  const tape = (data?.paper?.tape || []).slice(0, 8);

  return (
    <main className="relative">
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-2 md:px-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:min-h-[78vh] lg:gap-10 lg:py-8">
          <div className="order-1 mx-auto w-full max-w-[240px] sm:max-w-[340px] lg:order-2 lg:max-w-[480px]">
            <SolphiaFace mode="hero" />
          </div>
          <div className="order-2 pb-16 pt-2 lg:order-1 lg:pb-8 lg:pt-8">
            <p className="text-lg font-medium tracking-wide text-mute sm:text-2xl">Meet</p>
            <h1 className="solphia-flow mt-1 font-display text-[clamp(2.5rem,11vw,5.75rem)] font-bold leading-[0.9] tracking-[-0.04em]">
              SOLPHIA
            </h1>
            <p className="mt-5 max-w-xl text-xl leading-snug text-ghost sm:text-3xl sm:leading-tight">
              SOL vs tokenized S&P 500. She sits more than she trades.
            </p>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-mute sm:text-xl">
              Connect Phantom or Solflare. Fund SOL. Set a few knobs. Paper first. Keys stay on your device.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/trading"
                className="btn-acid inline-flex min-h-[52px] items-center justify-center rounded-full px-8 py-3 text-center text-base sm:min-h-[56px] sm:text-lg"
              >
                LAUNCH BOT
              </Link>
              <Link
                href="/faq"
                className="btn-ghost inline-flex min-h-[52px] items-center justify-center rounded-full px-8 py-3 text-center text-base sm:min-h-[56px] sm:text-lg"
              >
                How she trades
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LiveStats />

      <section className="px-4 py-6 md:px-12">
        <div className="mb-3 text-sm text-mute">Last decisions</div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tape.map((row: any) => (
            <Link
              key={row.id}
              href="/trading"
              className="btn-ghost flex shrink-0 items-center gap-3 rounded-full px-5 py-3 text-base"
            >
              <span className="font-display text-xl text-ghost">{String(row.action || "hold")}</span>
              <span className={row.action === "trade" ? "text-acid" : "text-mute"}>
                {row.z != null ? `z ${Number(row.z).toFixed(1)}` : "sit"}
              </span>
            </Link>
          ))}
          {!tape.length && (
            <span className="text-base text-mute">
              {pair?.reason || "Waiting on SOL / SPYx oracles…"}
            </span>
          )}
        </div>
      </section>

      <section className="px-4 py-12 md:px-12 md:py-16">
        <p className="text-base text-acid sm:text-lg">How it works</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-ghost sm:text-4xl md:text-6xl">
          Connect. Fund. Set knobs. Run.
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Step n="01" t="Connect" d="Phantom or Solflare. You sign." href="/trading" c="Connect" />
          <Step n="02" t="Fund" d="Deposit SOL into a wallet you own. She never holds keys." href="/trading" c="Fund" />
          <Step n="03" t="Paper" d="Mean-revert the SOL/SPYx ratio. Fake fills. Skip reasons on the tape." href="/trading" c="Open hub" />
          <Step n="04" t="Kill" d="Flatten to USDC and halt. Always on." href="/trading" c="LAUNCH BOT" />
        </div>
      </section>

      <section className="px-4 py-8 md:px-12">
        <p className="text-base text-acid sm:text-lg">Why she’s different</p>
        <h2 className="mt-2 font-display text-3xl text-ghost sm:text-4xl md:text-6xl">One job.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature t="Official SPYx" d="Pinned Backed/xStocks mint. Lookalike tickers are refused." href="/trading" />
          <Feature t="Ratio band" d="R = P_SOL / P_SPYx. Extended high → sell SOL. Extended low → sell SPYx. Else hold." href="/trading" />
          <Feature t="SOL + S&P history" d="She sizes from SOL’s 5–8% days and SPY’s ~1% range — not 15m noise." href="/trading" />
          <Feature t="USDC marks" d="Working capital and stops in USDC so a SOL candle doesn’t fake the book." href="/trading" />
          <Feature t="Skip tape" d="Stale oracle, thin book, junk route, cooldown — she increments skipped." href="/trading" />
          <Feature t="Spot only" d="No leverage in v1. Perps later if a real venue exists." href="/trading" />
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
