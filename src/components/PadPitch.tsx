"use client";

import { CopyCa } from "@/components/CopyCa";
import { DBC_PROGRAM_ID } from "@/lib/launch/dbcIds";

const ROWS: { k: string; us: string; them: string; usW: number; themW: number }[] = [
  { k: "Trade fee", us: "1.00%", them: "1.25%", usW: 100, themW: 125 },
  { k: "Creator take", us: "0.50%", them: "0.30%", usW: 50, themW: 30 },
  { k: "House take", us: "0.50%", them: "0.95%", usW: 50, themW: 95 },
];

function Bar({ pct, tone }: { pct: number; tone: "us" | "them" }) {
  const w = Math.max(8, Math.min(100, (pct / 125) * 100));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${tone === "us" ? "bg-acid" : "bg-violet/70"}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

export function PadPitch() {
  return (
    <section className="panel-bubble relative overflow-hidden rounded-3xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "url(/solphia-curve.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "78% 42%",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04000a] via-[#04000a]/92 to-[#04000a]/55" />
      <div className="relative z-10 grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-acid">METEORA DBC · JUPITER ROUTED</p>
          <h2 className="mt-2 font-display text-3xl leading-tight text-ghost sm:text-4xl">
            1% curve.
            <span className="block text-acid">Phantom can buy it.</span>
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-mute">
            Same virtual AMM family as Pump.fun, on Meteora’s Dynamic Bonding Curve — the program Jupiter Instant
            Routing already indexes. Paste the CA into Phantom Swap and it quotes, like a Pump.fun coin before
            graduation. After the curve fills it moves to Meteora DAMM v2, still Jupiter-routable.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ["1.00%", "total fee"],
              ["50%", "of that fee to the creator"],
              ["1 sig", "Phantom prompt"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-void/60 px-3 py-3">
                <p className="stat-num text-xl text-acid sm:text-2xl">{n}</p>
                <p className="mt-1 text-[11px] leading-snug text-mute">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-void/70">
            <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 border-b border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-mute">
              <span>On every buy / sell</span>
              <span className="text-right text-acid">Solphia</span>
              <span className="text-right">Pump.fun</span>
            </div>
            {ROWS.map((r) => (
              <div key={r.k} className="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-2 border-b border-white/5 px-3 py-2.5 last:border-0">
                <div>
                  <p className="text-xs text-ghost">{r.k}</p>
                  <div className="mt-1 hidden gap-3 sm:grid sm:grid-cols-2">
                    <Bar pct={r.usW} tone="us" />
                    <Bar pct={r.themW} tone="them" />
                  </div>
                </div>
                <p className="stat-num text-right text-sm text-acid">{r.us}</p>
                <p className="stat-num text-right text-sm text-mute">{r.them}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-mute">
            Pump.fun bonding curve: 1.25% (0.30% creator + 0.95% protocol). Solphia: 1.00% (0.50% creator + 0.25% owner +
            0.25% treasury), paid in the same swap. Create is 0 SOL on both.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mute">Meteora DBC</span>
            <CopyCa ca={DBC_PROGRAM_ID} compact />
          </div>
        </div>
        <div className="hidden min-h-[220px] lg:block" />
      </div>
    </section>
  );
}
