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
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-50 md:opacity-100 lg:left-[38%] lg:right-[-6%]">
          <SolphiaFace mode="hero" />
        </div>
        <div className="relative z-10 px-4 pb-10 pt-8 md:px-10 md:pt-16 lg:grid lg:min-h-[82vh] lg:grid-cols-[minmax(0,1fr)_0.55fr] lg:items-center">
          <div className="max-w-xl">
            <p className="font-mono text-[10px] tracking-[0.38em] text-violet sm:text-[11px]">SOLANA · AUTO · YOUR WALLET</p>
            <h1 className="mt-3 font-display text-4xl leading-[0.95] text-ghost sm:text-6xl md:text-7xl">
              Trade less.
              <br />
              <span className="text-acid">Copy what survives.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-mute sm:text-lg">
              Connect Phantom, deposit SOL into a trading wallet you own, and arm auto. Solphia only fires when the
              safety score clears. Keys never leave your device.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/auto" className="btn-acid min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
                Arm auto
              </Link>
              <Link href="/terminal" className="btn-ghost min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
                Open terminal
              </Link>
            </div>
            {paper && (
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-violet/20 pt-5">
                <Stat k="Demo book" v={`$${paper.equityUsd.toFixed(0)}`} sub="started $1,000" />
                <Stat k="Fee" v="0.35%" sub="vs ~1% bots" />
                <Stat k="Open" v={String(paper.open)} sub={`${paper.winCount}W / ${paper.lossCount}L`} />
              </div>
            )}
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

      <section className="px-4 py-10 md:px-10 md:py-16">
        <WalletDesk compact />
        <div className="mt-4 text-right">
          <Link href="/copy" className="font-mono text-[11px] tracking-[0.2em] text-violet hover:text-acid">
            Full copy desk →
          </Link>
        </div>
      </section>

      <section className="grid gap-3 px-4 pb-8 md:grid-cols-3 md:px-10">
        <Card title="Discover" body="Live Pump.fun, LaunchLab, Raydium and DexScreener. Every row carries a safety score before it can hit the book." href="/terminal" />
        <Card title="Copy" body="A short list of wallets with public 7-day and 30-day PnL. Solphia only mirrors a print if the coin also clears the engine." href="/copy" />
        <Card title="Snipers" body="Launch and migration are separate desks with hard gates. Bundles, freeze authority and serial deployers never arm." href="/terminal?desk=launch" />
      </section>

      <section className="px-4 pb-8 md:px-10 md:pb-16">
        <div className="panel flex flex-col items-stretch gap-4 rounded-2xl p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
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
