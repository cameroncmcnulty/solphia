"use client";

import Link from "next/link";
import { SolphiaFace } from "@/components/SolphiaFace";
import { WalletDesk } from "@/components/WalletDesk";
import { useMarket } from "@/lib/hooks";

export default function Home() {
  const { data } = useMarket(15000);
  const paper = data?.paper;
  const tape = (data?.tokens || []).slice(0, 6);
  const lab = data?.lab;
  const refused = lab ? (lab.copy?.denied || 0) + (lab.launch?.denied || 0) + (lab.migrate?.denied || 0) : 0;

  return (
    <main className="relative">
      <section className="px-4 pt-6 md:px-10 md:pt-10">
        <div className="mx-auto max-w-lg lg:hidden">
          <SolphiaFace mode="hero" />
        </div>
        <div className="grid items-center gap-6 lg:min-h-[78vh] lg:grid-cols-2">
          <div className="max-w-xl pb-4 pt-4 lg:py-12">
            <p className="font-mono text-[10px] tracking-[0.28em] text-violet">AUTOMATION WITH A KILL SWITCH</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.02] text-ghost sm:text-5xl lg:text-6xl">
              She refuses more
              <br />
              <span className="text-acid">than she fires.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-mute sm:text-lg">
              Scout finds a setup. Risk has to agree. Policy caps size and daily loss. Then she copies the exit, not
              just the buy. Nothing trades because an LLM felt like it.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/auto" className="btn-acid min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
                Turn her on
              </Link>
              <Link href="/copy" className="btn-ghost min-h-[48px] rounded-full px-6 py-3 text-center font-mono text-xs">
                See who she copies
              </Link>
            </div>
            {paper && (
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-violet/20 pt-5">
                <Stat
                  k="Copy P&L"
                  v={`${paper.equityUsd - paper.startingUsd >= 0 ? "+" : "−"}$${Math.abs(paper.equityUsd - paper.startingUsd).toFixed(0)}`}
                  sub={`${(paper.pnlPct * 100).toFixed(1)}% on $1,000`}
                />
                <Stat k="Book" v={`$${paper.equityUsd.toFixed(0)}`} sub="live marks, 0.35% fee" />
                <Stat k="Refused" v={String(refused)} sub={`${paper.open} open copies`} />
              </div>
            )}
          </div>
          <div className="relative hidden h-[72vh] min-h-[520px] lg:block">
            <SolphiaFace mode="hero" />
          </div>
        </div>
      </section>

      <section className="border-y border-violet/20 px-4 py-3 md:px-10">
        <div className="flex gap-5 overflow-x-auto font-mono text-[11px]">
          {tape.map((row: any) => (
            <div key={row.token.mint} className="flex shrink-0 items-center gap-2">
              <span className="text-ghost">{row.token.symbol}</span>
              <span className={row.report.verdict === "trade" ? "text-acid" : "text-mute"}>
                {row.report.verdict === "trade" ? "take" : row.report.verdict}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-10 md:px-10">
        <h2 className="mb-4 font-display text-2xl text-ghost">Who the copy bot follows</h2>
        <WalletDesk compact />
        <div className="mt-3 text-right">
          <Link href="/copy" className="font-mono text-[11px] text-violet">
            Full list →
          </Link>
        </div>
      </section>

      <section className="grid gap-3 px-4 pb-8 md:grid-cols-2 md:px-10">
        <Card
          title="Alerts · 0.15 SOL"
          body="She watches. You get a ping with a reason. You buy yourself if you want. No bot is spending your SOL."
          href="/pricing"
        />
        <Card
          title="Copy bot · 0.25 SOL"
          body="The passive path. She copies the setup a follower could have seen, fades first-block bundles, and always copies the exit."
          href="/auto"
        />
        <Card
          title="Launch bot · 0.30 SOL"
          body="Only when P(grad) clears the bar. Toxic flow and bot churn are a stand-down. Most names are a no."
          href="/terminal?desk=launch"
        />
        <Card
          title="Everything · 0.50 SOL"
          body="Alerts + copy + launches. Buying them separate is 0.70 SOL. This is the simple one."
          href="/pricing"
        />
      </section>
    </main>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] text-mute">{k}</div>
      <div className="font-display text-xl text-acid sm:text-2xl">{v}</div>
      <div className="font-mono text-[10px] text-mute">{sub}</div>
    </div>
  );
}

function Card({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="panel rounded-2xl p-5">
      <div className="font-display text-xl text-ghost">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-mute">{body}</p>
    </Link>
  );
}
