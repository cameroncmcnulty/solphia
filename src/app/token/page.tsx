"use client";

import { CopyCa } from "@/components/CopyCa";
import { SolphiaConstellation } from "@/components/SolphiaConstellation";
import { TokenSocials } from "@/components/TokenSocials";
import { solphiaTokenDesk } from "@/lib/token/solphia";

function tick(symbol: string) {
  const s = symbol.replace(/^\$+/, "").replace(/\*+$/, "").trim();
  return s ? `$${s}*` : "";
}

export default function TokenPage() {
  const t = solphiaTokenDesk();

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-x-hidden pb-24">
      <SolphiaConstellation />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">PROTOCOL TOKEN · {tick(t.symbol)}</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-6xl">{t.name}</h1>
        <p className="mt-4 max-w-2xl text-base text-mute sm:text-lg">
          The Solphia token. Contract address coming soon — these bubbles fill with live stats the moment the mint is
          public. Burned supply, holders, liquidity, and lock status sit here.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <CopyCa ca={t.mint || undefined} />
          <TokenSocials links={t.links} size="md" />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.stats.map((s) => (
            <Bubble key={s.k} k={s.k} v={s.v} hint={s.hint} />
          ))}
        </div>

        <div className="panel-bubble mt-6 rounded-3xl p-5">
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">TAPE</div>
          <div className="mt-6 flex h-40 items-center justify-center font-mono text-sm text-mute">
            Candles live after CA.
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.extra.map((s) => (
            <Bubble key={s.k} k={s.k} v={s.v} />
          ))}
        </div>

        <section className="panel-bubble mt-6 rounded-3xl p-5">
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">ABOUT</div>
          <h2 className="mt-1 font-display text-2xl text-ghost">Built to sit beside the bot.</h2>
          <p className="mt-3 max-w-2xl text-sm text-mute sm:text-base">
            When the mint is live this desk will read the chain: price, market cap, burned tokens, circulating supply,
            holders, and whether mint and freeze stay locked. Fair-launch coins you create live on Launch. This page is
            only {tick(t.symbol)}.
          </p>
        </section>
      </div>
    </main>
  );
}

function Bubble({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="panel-bubble rounded-3xl px-4 py-4">
      <div className="font-mono text-[10px] tracking-[0.16em] text-mute">{k}</div>
      <div className="mt-1 font-display text-2xl text-ghost sm:text-3xl">{v}</div>
      {hint && <div className="mt-1 font-mono text-[10px] text-mute">{hint}</div>}
    </div>
  );
}
