"use client";

import { Gift } from "lucide-react";
import { CartoonPfp } from "@/components/CartoonPfp";

export type HangoutPromo = { id: string; url: string; caption?: string };
export type HangoutJob = { id: string; title: string; blurb: string; href?: string };

export function CircleHangout({
  seed,
  pfpSrc,
  members,
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
      <header className="rounded-3xl border border-acid/25 bg-acid/[0.06] p-5">
        <div className="flex items-center gap-3">
          <CartoonPfp seed={seed} src={pfpSrc} className="h-12 w-12" />
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-acid">FOUNDERS CIRCLE</div>
            <h1 className="pump-h1">You&apos;re in</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-mute">
          {members} founders · {refs} invited · {boostPct}% airdrop boost
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
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
            className="rounded-full border border-violet/30 px-4 py-2 font-mono text-[11px] text-ghost"
            onClick={onCopyInvite}
          >
            {copied ? "copied" : "copy invite"}
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
    <section className="rounded-3xl border border-violet/20 bg-void/30 p-5">
      <div className="font-mono text-[10px] tracking-[0.22em] text-mute">JOB LISTINGS</div>
      <h2 className="pump-h2 mt-1">Work with Solphia</h2>
      {jobs.length === 0 ? (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          This is where we&apos;ll list any opportunities that come up to work with Solphia — roles, contracts, and
          founder-only gigs. Nothing open right now. When something is, it lands here first.
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
