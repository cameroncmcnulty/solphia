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
      <LiveStats />

      <section className="px-4 pt-6 md:px-10 md:pt-10">
        <div className="mx-auto max-w-lg lg:hidden">
          <SolphiaFace mode="hero" />
        </div>
        <div className="grid items-center gap-6 lg:min-h-[72vh] lg:grid-cols-2">
          <div className="max-w-xl pb-4 pt-4 lg:py-12">
            <p className="font-mono text-[10px] tracking-[0.28em] text-violet">AUTOMATION WITH A KILL SWITCH</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.02] text-ghost sm:text-5xl lg:text-6xl">
              She refuses more
              <br />
              <span className="text-acid">than she fires.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-mute sm:text-lg">
              Live tape. Real paper P&amp;L after fees. A configuration desk you can actually read. Scout finds a setup,
              Risk has to agree, policy caps size. Solphia Picks is her own book — extremely picky, and it only gets
              stricter after losses.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/auto" className="btn-acid min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
                Turn her on
              </Link>
              <Link href="/terminal" className="btn-ghost min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
                Open live tape
              </Link>
              <Link href="/pricing" className="btn-ghost min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
                Compare plans
              </Link>
            </div>
          </div>
          <div className="relative hidden h-[68vh] min-h-[480px] lg:block">
            <SolphiaFace mode="hero" />
          </div>
        </div>
      </section>

      <section className="border-y border-violet/20 px-4 py-3 md:px-10">
        <div className="mb-2 font-mono text-[10px] tracking-[0.2em] text-mute">TAPE · TAP A NAME</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tape.map((row: any) => (
            <Link
              key={row.token.mint}
              href="/terminal"
              className="flex shrink-0 items-center gap-2 rounded-full border border-violet/30 px-3 py-2 font-mono text-[11px]"
            >
              <span className="text-ghost">{row.token.symbol}</span>
              <span className={row.report.verdict === "trade" ? "text-acid" : "text-mute"}>
                {row.report.verdict === "trade" ? "take" : row.report.verdict}
              </span>
              {row.report.pGrad != null && (
                <span className="text-violet">P(grad) {Math.round(row.report.pGrad * 100)}%</span>
              )}
            </Link>
          ))}
          {!tape.length && <span className="font-mono text-[11px] text-mute">Waiting on Pump.fun / Raydium…</span>}
        </div>
      </section>

      <section className="px-4 py-12 md:px-10">
        <p className="font-mono text-[10px] tracking-[0.22em] text-violet">HOW IT WORKS</p>
        <h2 className="mt-2 font-display text-3xl text-ghost">Four steps. No mystery menu.</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Step n="01" t="Connect" d="Phantom or Solflare. You sign. She never sees a seed." href="/auto" c="Connect wallet" />
          <Step n="02" t="Configure" d="Max SOL, min safety, stop, first take-profit. Preview updates as you drag." href="/auto" c="Open config" />
          <Step n="03" t="Watch the tape" d="Live stats, P(grad), refused names. Paper fills until live is on." href="/terminal" c="Open tape" />
          <Step n="04" t="Turn her on" d="Scout + Risk + policy. Kill switch on. Close the phone." href="/auto" c="Turn her on" />
        </div>
      </section>

      <section className="px-4 py-4 md:px-10">
        <p className="font-mono text-[10px] tracking-[0.22em] text-violet">WHY SHE’S DIFFERENT</p>
        <h2 className="mt-2 font-display text-3xl text-ghost">Picky on purpose.</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Feature t="Live stats that are real" d="Paper book, refused count, mind bar, coins on the tape. No 136k fake traders." href="/terminal" />
          <Feature t="Configuration you can read" d="Sliders for size, safety, stop, take-profit. A preview card that says if the rails are valid." href="/auto" />
          <Feature t="P(grad), not a sniper" d="Bonding curve is a survival problem. Under 5 minutes is a no on Picks." href="/terminal?desk=launch" />
          <Feature t="Copy the decision" d="Only when a follower could have seen the setup. Always copy the exit." href="/copy" />
          <Feature t="Solphia Picks" d="Self-learning on after-fee PnL. Telegram required. Bars only move up after losses." href="/terminal?desk=picks" />
          <Feature t="0.35% vs ~1%" d="Industry terminals take about 1% a side. She takes 35 bps on fills." href="/pricing" />
        </div>
      </section>

      <section className="px-4 py-10 md:px-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ghost">Who the copy bot follows</h2>
            <p className="mt-1 text-sm text-mute">Quality this week, not a 30-day highlight reel.</p>
          </div>
          <Link href="/copy" className="btn-ghost rounded-full px-4 py-2 font-mono text-[11px]">
            Full list
          </Link>
        </div>
        <div className="mt-4">
          <WalletDesk compact />
        </div>
      </section>

      <section className="px-4 py-10 md:px-10">
        <h2 className="font-display text-3xl text-ghost">Plans, compared.</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Paper is free. Pay in SOL for 30 days. Everything is 0.50 — cheaper than buying the desks separate (0.70).
        </p>
        <div className="mt-6">
          <PlanCompare />
        </div>
      </section>

      <section className="px-4 py-10 md:px-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl text-ghost">Questions</h2>
          <Link href="/faq" className="font-mono text-[11px] text-violet">
            All FAQ →
          </Link>
        </div>
        <div className="mt-4 max-w-3xl">
          <FaqList limit={4} />
        </div>
      </section>

      <section className="px-4 pb-12 md:px-10">
        <div className="panel rounded-2xl p-6 md:flex md:items-center md:justify-between md:p-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-violet">READY</div>
            <h2 className="mt-1 font-display text-3xl text-ghost">Turn her on. Close the phone.</h2>
            <p className="mt-2 max-w-lg text-sm text-mute">Paper first. Keys on your device. Kill switch on.</p>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row md:mt-0">
            <Link href="/auto" className="btn-acid min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
              Open Auto
            </Link>
            <Link href="/pricing" className="btn-ghost min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
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
    <Link href={href} className="panel rounded-2xl p-5">
      <div className="font-mono text-[10px] text-acid">{n}</div>
      <div className="mt-2 font-display text-xl text-ghost">{t}</div>
      <p className="mt-2 text-sm leading-relaxed text-mute">{d}</p>
      <div className="mt-4 font-mono text-[11px] text-violet">{c} →</div>
    </Link>
  );
}

function Feature({ t, d, href }: { t: string; d: string; href: string }) {
  return (
    <Link href={href} className="panel rounded-2xl p-5">
      <div className="font-display text-xl text-ghost">{t}</div>
      <p className="mt-2 text-sm leading-relaxed text-mute">{d}</p>
      <div className="mt-4 font-mono text-[11px] text-acid">Open →</div>
    </Link>
  );
}
