"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { LivePnl } from "@/components/LivePnl";
import { useMarket } from "@/lib/hooks";

export default function Origin() {
  const { data } = useMarket(15000);
  const paper = data?.paper;
  const top = (data?.tokens || []).slice(0, 4);

  return (
    <main className="relative px-5 pb-24 md:px-8">
      <section className="grid min-h-[80vh] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.5em] text-cyan">SHE RUNS EVERYTHING</p>
          <h1 className="mt-4 font-display text-6xl leading-[0.9] text-ghost md:text-8xl">
            SOLPHIA
          </h1>
          <p className="mt-6 max-w-xl font-serif text-2xl leading-snug text-mute">
            A dark terminal for Solana memecoins. Copy the wallets that actually survive, snipe launches and migrations
            only when the safety score clears, and watch a live $1,000 paper book on real events.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/terminal" className="btn-acid rounded-full px-6 py-3 font-mono text-xs">
              ENTER TERMINAL
            </Link>
            <Link href="/subscribe" className="btn-ghost rounded-full px-6 py-3 font-mono text-xs">
              0.15 SOL / MONTH
            </Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 font-mono text-[11px] text-mute">
            <div>
              <dt>FEE</dt>
              <dd className="text-acid">0.35%</dd>
            </div>
            <div>
              <dt>INDUSTRY</dt>
              <dd>~1.00%</dd>
            </div>
            <div>
              <dt>CUSTODY</dt>
              <dd>NONE</dd>
            </div>
          </dl>
        </div>
        <div className="relative flex justify-center">
          <div className="absolute inset-0 m-auto h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
          <SolphiaFace size={520} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {paper && <LivePnl equity={paper.equityUsd} start={paper.startingUsd} pnlPct={paper.pnlPct} open={paper.open} />}
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">WHY MOST BOTS BLEED</div>
          <p className="mt-3 font-serif text-lg text-ghost">
            68.7% of Pump.fun tokens die the day they launch. 56% of traders lose. Bots still charge 1% to copy noise.
            Solphia refuses the trade unless the score clears.
          </p>
        </div>
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">TESTING</div>
          <p className="mt-3 font-serif text-lg text-ghost">
            No live fills until Helius is wired and the book is proven. Every tick is a paper fill on live Pump.fun,
            LaunchLab, Raydium and DexScreener events.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-4">
        {top.map((row: any) => (
          <div key={row.token.mint} className="panel rounded-2xl p-4">
            <div className="font-display text-xl text-ghost">{row.token.symbol}</div>
            <div className="font-mono text-[11px] text-cyan">SAFETY {row.report.score} {row.report.grade}</div>
            <div className="mt-2 font-mono text-[10px] text-mute">{row.report.summary}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
