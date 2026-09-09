"use client";

import { useAdmin } from "../AdminProvider";
import { Field } from "../ui";

export function SphaSection() {
  const { data, busy, patch, sphaX, setSphaX, sphaTg, setSphaTg, sphaDc, setSphaDc } = useAdmin();
  if (!data) return null;

  return (
    <section className="panel rounded-2xl p-5">
      <div className="font-mono text-[10px] tracking-[0.3em] text-mute">$SPHA · SOCIALS</div>
      <p className="mt-2 max-w-2xl text-sm text-mute">
        Icons always show on the token page in Solphia teal. Empty fields stay decorative — they do not link until you save a URL or
        handle.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Field value={sphaX} onChange={setSphaX} placeholder="X / @handle" />
        <Field value={sphaTg} onChange={setSphaTg} placeholder="Telegram / t.me/…" />
        <Field value={sphaDc} onChange={setSphaDc} placeholder="Discord / discord.gg/…" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => patch({ sphaSocials: { x: sphaX, telegram: sphaTg, discord: sphaDc } })}
        className="btn-acid mt-4 rounded-full px-5 py-2 text-sm disabled:opacity-40"
      >
        Save $SPHA socials
      </button>
    </section>
  );
}
