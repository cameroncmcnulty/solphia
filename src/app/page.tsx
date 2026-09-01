"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { WalletDesk } from "@/components/WalletDesk";
import { useMarket } from "@/lib/hooks";

export default function Home() {
  const { data } = useMarket(15000);
  const paper = data?.paper;
  const tape = (data?.tokens || []).slice(0, 8);

  return (
    <main className="relative">
      <section className="relative min-h-[88vh] overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-[-8%] hidden w-[62%] lg:block">
          <SolphiaFace mode="hero" />
        </div>
        <div className="relative z-10 grid min-h-[88vh] items-center px-5 py-12 md:px-10 lg:grid-cols-[minmax(0,1fr)_0.7fr]">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] tracking-[0.42em] text-violet">SOLANA MEME TERMINAL · PAPER FIRST</p>
            <h1 className="mt-4 font-display text-6xl leading-[0.92] text-ghost md:text-7xl">
              Trade less.
              <br />
              <span className="text-acid">Copy what survives.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-mute">
              Solphia scores every Pump.fun, LaunchLab and Raydium print from 0–100, then paper-copies wallets
              that already have an edge. You keep the keys. She keeps the noise out.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/terminal" className="btn-acid rounded-full px-6 py-3 font-mono text-xs">
                Open terminal
              </Link>
              <Link href="/pricing" className="btn-ghost rounded-full px-6 py-3 font-mono text-xs">
                See desks
              </Link>
            </div>
            {paper && (
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-violet/20 pt-6">
                <Stat k="Paper book" v={`$${paper.equityUsd.toFixed(0)}`} sub="started $1,000" />
                <Stat k="Fee" v="0.35%" sub="vs ~1% bots" />
                <Stat k="Open" v={String(paper.open)} sub={`${paper.winCount}W / ${paper.lossCount}L`} />
              </div>
            )}
          </div>
          <div className="mt-10 lg:hidden">
            <SolphiaFace mode="hero" />
          </div>
        </div>
      </section>

      <section className="border-y border-violet/20 bg-ink/40 px-5 py-4 md:px-10">
        <div className="flex gap-6 overflow-x-auto font-mono text-[11px] tracking-wider">
          {tape.map((row: any) => (
            <div key={row.token.mint} className="flex shrink-0 items-center gap-3">
              <span className="text-ghost">{row.token.symbol}</span>
              <span className={row.report.score >= 70 ? "text-acid" : "text-mute"}>
                {row.report.score} {row.report.grade}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 md:px-10">
        <WalletDesk compact />
        <div className="mt-4 text-right">
          <Link href="/copy" className="font-mono text-[11px] tracking-[0.2em] text-violet hover:text-acid">
            Full copy desk →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 px-5 pb-8 md:grid-cols-3 md:px-10">
        <Card title="Discover" body="Live Pump.fun, LaunchLab, Raydium and DexScreener. Every row carries a safety score before it can hit the book." href="/terminal" />
        <Card title="Copy" body="A short list of wallets with public 7-day and 30-day PnL. Solphia only mirrors a print if the coin also clears the engine." href="/copy" />
        <Card title="Snipers" body="Launch and migration are separate desks with hard gates. Bundles, freeze authority and serial deployers never arm." href="/terminal?desk=launch" />
      </section>

      <section className="px-5 pb-20 md:px-10">
        <div className="panel flex flex-col items-start justify-between gap-6 rounded-2xl p-8 md:flex-row md:items-center">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-violet">ACCESS</div>
            <h2 className="mt-1 font-display text-3xl text-ghost">Pulse is 0.15 SOL. The rest is à la carte — or one key for all of it.</h2>
          </div>
          <Link href="/pricing" className="btn-acid rounded-full px-6 py-3 font-mono text-xs">
            Pricing
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.22em] text-mute">{k}</div>
      <div className="font-display text-2xl text-acid">{v}</div>
      <div className="font-mono text-[10px] text-mute">{sub}</div>
    </div>
  );
}

function Card({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="panel rounded-2xl p-6 transition hover:border-acid/40">
      <div className="font-display text-2xl text-ghost">{title}</div>
      <p className="mt-3 text-sm leading-relaxed text-mute">{body}</p>
    </Link>
  );
}
