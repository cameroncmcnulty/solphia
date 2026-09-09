"use client";

import { useAdmin } from "../AdminProvider";
import { Field } from "../ui";

export function ContentSection() {
  const { data, busy, patch, hint, setHint, copied, setCopied, saved, setSaved } = useAdmin();
  if (!data) return null;

  return (
    <section className="panel rounded-2xl p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">CONTENT BOT · IN HOUSE · MAX 24</div>
          <h2 className="mt-1 font-display text-2xl text-ghost">She writes and paints the posts</h2>
          <p className="mt-2 max-w-2xl text-sm text-mute">
            She writes the caption and paints the frame: her face, candlestick tapes, sleeve mix, how-to steps, session warnings, kill
            switch, pair list. Aesthetic PnL — for the post, not the live book. Oldest drop at 24.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ generatePromo: true, contentHint: hint || undefined })}
          className="btn-acid rounded-full px-5 py-3 text-sm disabled:opacity-40"
        >
          {busy ? "She’s painting…" : "Run the content bot"}
        </button>
      </div>
      <Field value={hint} onChange={setHint} placeholder="Optional angle — gold, weekend, paper first…" className="mt-4" />
      <p className="mt-2 font-mono text-[11px] text-mute">
        {data.promos.length}/24 · last auto {data.lastPromoDay || "never"} · in-house renderer
      </p>
      {data.promos.length === 0 && <p className="mt-4 text-sm text-mute">Empty. Run the content bot, or wait for the daily cron.</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.promos.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-2xl border border-line bg-void/60">
            {item.kind === "video" ? (
              <video src={item.url} controls className="aspect-[9/16] w-full bg-black object-cover sm:aspect-video" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.dataUrl || item.url}
                alt={item.headline}
                className={`w-full object-cover ${item.aspect === "9:16" ? "aspect-[9/16]" : item.aspect === "16:9" ? "aspect-video" : "aspect-square"}`}
              />
            )}
            <div className="space-y-2 p-4">
              <div className="font-mono text-[10px] tracking-[0.2em] text-violet">
                {item.kind.toUpperCase()} · {item.aspect} · {item.pnlLabel}
              </div>
              <h3 className="font-display text-xl text-ghost">{item.headline}</h3>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-mute">{item.caption}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="btn-ghost rounded-full px-4 py-1.5 text-xs"
                  onClick={async () => {
                    await navigator.clipboard.writeText(item.caption);
                    setCopied(item.id);
                    setTimeout(() => setCopied(""), 1500);
                  }}
                >
                  {copied === item.id ? "Copied" : "Copy caption"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-line px-4 py-1.5 text-xs text-mute"
                  onClick={async () => {
                    const src = item.dataUrl || item.url;
                    const blob = await fetch(src).then((r) => r.blob());
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `solphia-${item.aspect.replace(":", "x")}-${item.id}.png`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    setSaved(item.id);
                    setTimeout(() => setSaved(""), 1500);
                  }}
                >
                  {saved === item.id ? "Saved" : "Save image"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
