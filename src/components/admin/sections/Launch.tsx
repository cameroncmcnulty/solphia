"use client";

import { useAdmin } from "../AdminProvider";
import { Mini } from "../ui";

export function LaunchSection() {
  const { data, go } = useAdmin();
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Mini k="Coins on pad" v={String(data.launchCount)} />
        <Mini k="Owner earnings" v={`${data.ownerEarningsSol.toFixed(4)} SOL`} />
        <Mini k="Split" v="50 / 25 / 25" />
      </div>
      <section className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">USER LAUNCH PAD</div>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          This is the public pad for coins other people launch. $SPHA itself launches from Project. Owner SOL from pad
          swaps still accrues here: {data.ownerEarningsSol.toFixed(4)} SOL.
        </p>
        <button type="button" onClick={() => go("wallets")} className="mt-4 font-mono text-[11px] text-acid">
          Project wallets and $SPHA launcher →
        </button>
      </section>
    </div>
  );
}
