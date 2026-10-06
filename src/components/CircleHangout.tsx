"use client";

import { Crown, Gift } from "lucide-react";
import { CartoonPfp } from "@/components/CartoonPfp";

export type HangoutPromo = { id: string; url: string; caption?: string };
export type HangoutJob = { id: string; title: string; blurb: string; href?: string };

export function CircleHangout({
  seed,
  pfpSrc,
  refs,
  boostPct,
  unclaimed,
  promos,
  jobs,
  busy,
  note,
  err,
  copied,
  onWithdraw,
  onCopyInvite,
  hideWithdraw,
}: {
  seed: string;
  pfpSrc?: string;
  members: number;
  refs: number;
  boostPct: number;
  unclaimed: number;
  promos: HangoutPromo[];
  jobs: HangoutJob[];
  busy?: boolean;
  note?: string;
  err?: string;
  copied?: boolean;
  onWithdraw?: () => void;
  onCopyInvite?: () => void;
  hideWithdraw?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="relative overflow-hidden rounded-3xl border border-[#e8c35a]/45 bg-[radial-gradient(120%_80%_at_10%_0%,rgba(232,195,90,0.18),transparent_55%),linear-gradient(180deg,rgba(20,8,28,0.92),rgba(8,0,14,0.96))] p-6 shadow-[0_0_40px_rgba(232,195,90,0.12)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CartoonPfp seed={seed} src={pfpSrc} className="h-14 w-14 ring-2 ring-[#e8c35a]/70" />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#e8c35a]/60 bg-[#12081c] text-[#e8c35a]">
              <Crown className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.28em] text-[#e8c35a]">FOUNDING CLASS · ELITE</div>
            <h1 className="font-display text-4xl text-ghost sm:text-5xl">You made the cut.</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ghost/90 sm:text-base">
          You are among the early <span className="font-semibold tracking-wide text-[#e8c35a]">BELIEVERS</span>.
          This is not a crowd. It is a founding class. True greatness here is earned through commitment and
          dedication to Solphia — and you already belong in this room.
        </p>
        <p className="mt-3 font-mono text-[12px] text-[#e8c35a]/80">
          Limited spots · {refs} referred · {(1 + (boostPct || 0) / 100).toFixed(2)}× airdrop
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {!hideWithdraw && (
            <button
              type="button"
              disabled={busy || !(unclaimed > 0)}
              onClick={onWithdraw}
              className="btn-acid inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm disabled:opacity-40"
            >
              <Gift className="h-4 w-4" />
              Withdraw {unclaimed > 0 ? unclaimed.toFixed(2) : "airdrop"}
            </button>
          )}
          <button
            type="button"
            className="rounded-full border border-[#e8c35a]/40 bg-[#e8c35a]/10 px-4 py-2 font-mono text-[11px] text-[#e8c35a]"
            onClick={onCopyInvite}
          >
            {copied ? "copied" : "invite a believer"}
          </button>
        </div>
        {note && <p className="mt-2 text-sm text-acid">{note}</p>}
        {err && <p className="mt-2 text-sm text-blood">{err}</p>}
      </header>

      <JobsBoard jobs={jobs} />

      {promos.length > 0 && (
        <section>
          <div className="font-mono text-[10px] tracking-[0.22em] text-mute">MEDIA</div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {promos.map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-2xl border border-violet/20 bg-void/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption || ""} className="aspect-square w-full object-cover" />
                {p.caption && <figcaption className="px-2 py-1.5 text-[11px] text-mute">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function JobsBoard({ jobs }: { jobs: HangoutJob[] }) {
  return (
    <section className="rounded-3xl border border-[#e8c35a]/20 bg-void/30 p-5">
      <div className="font-mono text-[10px] tracking-[0.22em] text-[#e8c35a]/70">INNER CIRCLE</div>
      <h2 className="pump-h2 mt-1">Work with Solphia</h2>
      {jobs.length === 0 ? (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Founder-only roles, contracts, and gigs land here first. Nothing open right now. When something is,
          this class sees it before the rest of the market.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {jobs.map((j) => (
            <article key={j.id} className="rounded-2xl border border-violet/20 bg-void/50 px-4 py-3">
              <h3 className="font-display text-lg text-ghost">{j.title}</h3>
              <p className="mt-1 text-sm text-mute">{j.blurb}</p>
              {j.href && (
                <a href={j.href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-acid">
                  Apply →
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
