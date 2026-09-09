"use client";

import { useAdmin } from "../AdminProvider";
import { Field, Mini, shortPk } from "../ui";

export function LaunchSection() {
  const { data, busy, patch, ownerPk, setOwnerPk } = useAdmin();
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Mini k="Coins on pad" v={String(data.launchCount)} />
        <Mini k="Owner earnings" v={`${data.ownerEarningsSol.toFixed(4)} SOL`} />
        <Mini k="Split" v="50 / 25 / 25" />
      </div>
      <section className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">OWNER EARNINGS · 25% OF LAUNCH SWAPS</div>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Your pay bubble. 25% of every launch-curve swap lands here so you do not dip into project treasury. Creator keeps 50%.
          Treasury keeps 25%. {data.launchCount} coins on the pad.
        </p>
        <div className="mt-3 font-display text-3xl text-acid">{data.ownerEarningsSol.toFixed(4)} SOL</div>
        <Field value={ownerPk} onChange={(v) => setOwnerPk(v.trim())} placeholder="Owner Solana address" className="mt-3" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ ownerWallet: ownerPk || null })}
            className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
          >
            Save owner wallet
          </button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-mute">
          {data.ownerWallet ? `Pays to ${shortPk(data.ownerWallet, 6)}` : "No owner wallet set."}
        </p>
      </section>
    </div>
  );
}
