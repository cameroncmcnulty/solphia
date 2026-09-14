import { SPHA_SLICES, SPHA_SUPPLY, sphaTokensFor } from "@/lib/token/omics";

function tok(n: number) {
  return n.toLocaleString("en-US");
}

export function Tokenomics({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "" : "rounded-3xl border border-violet/20 bg-void/40 p-5 sm:p-7"}>
      <div className="font-mono text-[10px] tracking-[0.22em] text-acid">TOKENOMICS · 100,000,000 $SPHA</div>
      <p className="mt-2 max-w-2xl text-sm text-mute sm:text-base">
        At launch the mint fills four wallets in one shot. Mint and freeze authorities are then revoked. The
        community-market share is the tradeable float — every swap of it is meant to route through Solphia at 1%.
      </p>
      <div className="mt-5 flex h-4 overflow-hidden rounded-full">
        {SPHA_SLICES.map((s) => (
          <div
            key={s.id}
            title={`${s.label} ${s.pct}`}
            className={
              s.id === "lp"
                ? "bg-acid"
                : s.id === "foundation"
                  ? "bg-[#80eaff]"
                  : s.id === "owner"
                    ? "bg-violet"
                    : "bg-[#ffb020]"
            }
            style={{ width: `${s.bps / 100}%` }}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {SPHA_SLICES.map((s) => (
          <div key={s.id} className="rounded-2xl border border-violet/15 px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-display text-xl text-ghost">{s.label}</div>
              <div className="font-mono text-sm text-acid">{s.pct}</div>
            </div>
            <div className="mt-1 font-mono text-[11px] text-mute">{tok(sphaTokensFor(s.bps, SPHA_SUPPLY))} tokens</div>
            <p className="mt-2 text-sm text-mute">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
