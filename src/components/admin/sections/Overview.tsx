"use client";

import { useAdmin } from "../AdminProvider";
import { Mini, Stat, age, money } from "../ui";

export function OverviewSection() {
  const { data, now, pnlWin, setPnlWin, patch, busy } = useAdmin();
  if (!data) return null;
  const p = data.paper;
  const ops = data.ops;
  const win = pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24;
  const pnlLabel = pnlWin === "d30" ? "Month PnL" : pnlWin === "d7" ? "7d PnL" : "24h PnL";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["h24", "d7", "d30"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setPnlWin(k)}
            className={`rounded-full px-4 py-1.5 font-mono text-[11px] ${pnlWin === k ? "bg-acid/15 text-acid" : "border border-line text-mute"}`}
          >
            {k === "h24" ? "24h PnL" : k === "d7" ? "7 day PnL" : "Month PnL"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat k="Holding" v={money(ops.holdingUsd)} sub={`${ops.solIn.toFixed(3)} SOL in`} />
        <Stat k="Wallets" v={String(ops.wallets)} sub={`${ops.newWallets24} new / 24h`} />
        <Stat k="Trading now" v={String(ops.trading)} sub={`${data.traders.filter((t) => t.mode === "live" && !t.killed).length} live`} />
        <Stat k="Volume" v={money(win.volumeUsd)} sub={`${win.trades} clips`} />
        <Stat
          k={pnlLabel}
          v={`${win.pnlUsd >= 0 ? "+" : "−"}${money(Math.abs(win.pnlUsd))}`}
          sub={p.startedAt ? `session ${age(now - p.startedAt)}` : "session"}
          good={Math.abs(win.pnlUsd) < 0.01 ? undefined : win.pnlUsd >= 0}
        />
        <Stat k="Fees" v={money(win.feesUsd)} sub={pnlWin === "d30" ? "30d" : pnlWin === "d7" ? "7d" : "24h"} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini k="24h fees" v={money(ops.h24.feesUsd)} />
        <Mini k="7d fees" v={money(ops.d7.feesUsd)} />
        <Mini k="24h trades" v={String(ops.h24.trades)} />
        <Mini k="7d trades" v={String(ops.d7.trades)} />
      </div>

      <section className="panel mt-6 rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">PAPER SESSION</div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini k="Equity" v={money(p.equityUsd)} />
          <Mini k="PnL" v={`${p.pnlPct >= 0 ? "+" : ""}${(p.pnlPct * 100).toFixed(2)}%`} />
          <Mini k="Trades" v={String(p.trades)} />
          <Mini k="Cash" v={money(p.cashUsd)} />
        </div>
        <p className="mt-3 text-sm text-mute">{p.lastAction || data.pair?.reason || p.lastSkipReason || "Waiting on prices."}</p>
        <p className="mt-1 font-mono text-[11px] text-mute">
          Login stays password-only.
          {data.durable
            ? ` State is on ${data.durableKind} — treasury and seats survive deploys.`
            : " Vercel /tmp wipes on every cold start. Add Upstash Redis so saves stick."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!confirm("Restart the paper session? Open paper books go back to USDC. Live books are left alone.")) return;
            patch({ resetPaper: true });
          }}
          disabled={busy}
          className="mt-4 rounded-full border border-blood/40 px-4 py-2 text-xs text-blood"
        >
          Reset paper session
        </button>
      </section>
    </div>
  );
}
