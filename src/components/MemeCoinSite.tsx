"use client";

import { useCallback, useEffect, useState } from "react";
import { pad2, splitRemaining } from "@/lib/token/countdown";
import { copyText } from "@/lib/copyText";

export type MemePack = {
  name: string;
  symbol: string;
  handle: string;
  blurb: string;
  about: string;
  howToBuy: string;
  roadmap: { title: string; body: string }[];
  colors: { bg: string; ink: string; accent: string; muted: string; card: string };
  website: string;
  x: string;
  telegram: string;
  image: string;
  supply: number;
  slices: { id: string; label: string; pct: string; bps: number; tokens: number; note: string }[];
  mint: string;
  phase: "soon" | "counting" | "live";
  countdown: { phase: string; launchAt: number; remainingMs: number; mintLeadMs: number; serverNow: number };
};

function fmtSupply(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  return n.toLocaleString();
}

export function MemeCoinSite({ initial, ticker }: { initial: MemePack; ticker: string }) {
  const [pack, setPack] = useState(initial);
  const [copied, setCopied] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    fetch(`/api/m/${encodeURIComponent(ticker)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) return;
        setPack((prev) => ({
          ...prev,
          ...j,
          mint: j.phase === "live" ? j.mint || prev.mint : "",
          countdown: j.countdown || prev.countdown,
        }));
      })
      .catch(() => {});
  }, [ticker]);

  useEffect(() => {
    load();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      load();
    }, pack.phase === "live" ? 8_000 : 1_200);
    return () => window.clearInterval(id);
  }, [load, pack.phase]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remaining = pack.phase === "live" ? 0 : pack.countdown.launchAt > 0 ? Math.max(0, pack.countdown.launchAt - now) : 0;
  const parts = splitRemaining(remaining);
  const c = pack.colors;
  const tick = pack.symbol ? `$${pack.symbol}` : "";

  function copy(label: string, value: string) {
    if (!copyText(value, `${label} copied`)) return;
    setCopied(label);
    setTimeout(() => setCopied(""), 1600);
  }

  return (
    <main className="min-h-screen" style={{ background: c.bg, color: c.ink }}>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pack.image} alt="" className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16" />
            <div>
              <p className="font-mono text-[11px] tracking-[0.28em]" style={{ color: c.accent }}>
                {tick}
              </p>
              <h1 className="font-display text-4xl sm:text-6xl">{pack.name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 font-mono text-[12px]">
            {pack.x ? (
              <a href={pack.x} target="_blank" rel="noreferrer" style={{ color: c.accent }}>
                X
              </a>
            ) : null}
            {pack.telegram ? (
              <a href={pack.telegram} target="_blank" rel="noreferrer" style={{ color: c.accent }}>
                Telegram
              </a>
            ) : null}
          </div>
        </header>

        <p className="mt-6 max-w-2xl text-lg" style={{ color: c.muted }}>
          {pack.blurb}
        </p>

        <section className="mt-10 rounded-3xl p-6" style={{ background: c.card }}>
          {pack.phase === "live" && pack.mint ? (
            <div>
              <div className="font-mono text-[11px] tracking-[0.22em]" style={{ color: c.accent }}>
                LIVE
              </div>
              <p className="mt-2 text-sm" style={{ color: c.muted }}>
                Contract address
              </p>
              <button
                type="button"
                className="mt-2 break-all text-left font-mono text-sm"
                onClick={() => copy("CA", pack.mint)}
              >
                {pack.mint}
              </button>
              {copied ? (
                <p className="mt-2 font-mono text-[11px]" style={{ color: c.accent }}>
                  {copied} copied
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={`https://dexscreener.com/solana/${pack.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full px-5 py-2 font-mono text-[12px] tracking-[0.16em]"
                  style={{ background: c.accent, color: c.bg }}
                >
                  Dexscreener
                </a>
                <a
                  href={`https://www.meteora.ag`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border px-5 py-2 font-mono text-[12px] tracking-[0.16em]"
                  style={{ borderColor: c.accent, color: c.accent }}
                >
                  Meteora
                </a>
              </div>
            </div>
          ) : pack.countdown.launchAt > 0 ? (
            <div>
              <div className="font-mono text-[11px] tracking-[0.22em]" style={{ color: c.accent }}>
                LAUNCH COUNTDOWN
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                {[
                  ["DAYS", parts.d],
                  ["HRS", parts.h],
                  ["MIN", parts.m],
                  ["SEC", parts.s],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl py-4" style={{ background: c.bg }}>
                    <div className="font-display text-3xl sm:text-5xl">{pad2(Number(v))}</div>
                    <div className="mt-1 font-mono text-[10px] tracking-[0.2em]" style={{ color: c.muted }}>
                      {k}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-[12px]" style={{ color: c.muted }}>
                CA publishes on this page at T-0.
              </p>
            </div>
          ) : (
            <div>
              <div className="font-mono text-[11px] tracking-[0.22em]" style={{ color: c.accent }}>
                COMING SOON
              </div>
              <p className="mt-3 text-sm" style={{ color: c.muted }}>
                Launch time is not public yet.
              </p>
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-3xl">About</h2>
          <p className="mt-4 max-w-3xl leading-relaxed" style={{ color: c.muted }}>
            {pack.about}
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-3xl">Tokenomics</h2>
          <p className="mt-2 font-mono text-sm" style={{ color: c.muted }}>
            Total supply {fmtSupply(pack.supply)} · 6 decimals
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {pack.slices.map((s) => (
              <div key={s.id} className="rounded-2xl p-4" style={{ background: c.card }}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-display text-xl">{s.label}</div>
                  <div className="font-mono text-lg" style={{ color: c.accent }}>
                    {s.pct}
                  </div>
                </div>
                <div className="mt-1 font-mono text-[12px]" style={{ color: c.muted }}>
                  {fmtSupply(s.tokens)} tokens
                </div>
                <p className="mt-2 text-sm" style={{ color: c.muted }}>
                  {s.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-3xl">How to buy</h2>
          <p className="mt-4 max-w-3xl leading-relaxed" style={{ color: c.muted }}>
            {pack.howToBuy}
          </p>
        </section>

        <section className="mt-12 pb-16">
          <h2 className="font-display text-3xl">Roadmap</h2>
          <div className="mt-6 grid gap-3">
            {pack.roadmap.map((r) => (
              <div key={r.title} className="rounded-2xl p-4" style={{ background: c.card }}>
                <div className="font-mono text-[11px] tracking-[0.2em]" style={{ color: c.accent }}>
                  {r.title}
                </div>
                <p className="mt-2 text-sm" style={{ color: c.muted }}>
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
