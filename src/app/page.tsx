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
        <div className="grid items-center lg:min-h-[82vh] lg:grid-cols-[minmax(0,1.05fr)_0.95fr]">
        <div className="relative z-10 px-4 pb-6 pt-8 md:px-10 md:pt-16">
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
        <div className="px-2 pb-4 lg:h-full lg:pr-6">
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

      <section className="px-4 py-10 md:px-10 md:py-16">
        <WalletDesk compact />
        <div className="mt-4 text-right">
          <Link href="/copy" className="font-mono text-[11px] tracking-[0.2em] text-violet hover:text-acid">
            Full copy desk →
          </Link>
        </div>
      </section>

      <section className="grid gap-3 px-4 pb-8 md:grid-cols-2 md:px-10">
        <Card title="Pulse · 0.15 SOL" body="She watches. You get the ping. Email + in-app when a coin clears the safety score, a followed wallet buys, or a curve is about to graduate. You still place the trade yourself." href="/pricing" />
        <Card title="Copy · 0.25 SOL" body="Auto-mirrors a short list of wallets with public PnL. A fill only fires if the coin also passes the risk engine — that filter is the whole product." href="/copy" />
        <Card title="Snipers · 0.30 SOL" body="Launch (under 8 minutes, anti-bundle) and migration (bonding ≥82%). Not copy trading. For curve events, not KOL flow." href="/terminal?desk=launch" />
        <Card title="Full · 0.50 SOL" body="Pulse + copy + both snipers + auto-pilot. Stacking the three desks is 0.70 SOL. Full is the floor pass." href="/pricing" />
      </section>

      <section className="px-4 pb-8 md:px-10 md:pb-16">
        <div className="panel flex flex-col items-stretch gap-4 rounded-2xl p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-violet">ACCESS</div>
            <h2 className="mt-1 font-display text-3xl text-ghost">Pulse is the wire. Copy and snipers are desks. Full is cheaper than buying all three.</h2>
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
