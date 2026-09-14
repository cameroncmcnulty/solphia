"use client";

import { useAdmin } from "../AdminProvider";
import { Mini, Stat, money } from "../ui";

export function OverviewSection() {
  const { data, pnlWin, setPnlWin, patch, busy } = useAdmin();
  if (!data) return null;
  const ops = data.ops;
  const win = pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24;
  const pnlLabel = pnlWin === "d30" ? "Month PnL" : pnlWin === "d7" ? "7d PnL" : "24h PnL";
  const live = data.traders.filter((t) => t.mode === "live" && !t.killed);
  const shown = live[0] || data.traders.find((t) => t.leverage > 1) || data.traders[0];

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
        <Stat k="Trading now" v={String(ops.trading)} sub={`${live.length} live`} />
        <Stat k="Volume" v={money(win.volumeUsd)} sub={`${win.trades} clips`} />
        <Stat
          k={pnlLabel}
          v={`${win.pnlUsd >= 0 ? "+" : "−"}${money(Math.abs(win.pnlUsd))}`}
          sub={shown ? `${shown.mode} ${shown.leverage}×` : "live desk"}
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">HER LIVE WALLET</div>
            <p className="mt-1 max-w-xl text-sm text-mute">
              Real trading-wallet marks, not a paper session. Arm live 3× from the desk with a founder Phantom. Toggle
              whether this book shows on the public site.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ publishLiveWallet: !data.publishLiveWallet })}
            className={`rounded-full px-4 py-2 font-mono text-[11px] ${data.publishLiveWallet ? "bg-acid/20 text-acid" : "border border-violet/30 text-mute"}`}
          >
            {data.publishLiveWallet ? "Public stats ON" : "Public stats OFF"}
          </button>
        </div>
        {shown ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini k="Equity" v={money(shown.equityUsd)} />
            <Mini k="PnL" v={`${shown.pnlPct >= 0 ? "+" : ""}${(shown.pnlPct * 100).toFixed(2)}%`} />
            <Mini k="Trades" v={String(shown.trades)} />
            <Mini k="Sleeve" v={shown.leverage > 1 ? `SOL ${shown.leverage}×` : "Spot 1×"} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-mute">No live book yet. Connect the trading wallet, set SOL 3×, and arm live.</p>
        )}
        {shown?.lastAction && <p className="mt-3 text-sm text-mute">{shown.lastAction}</p>}
        <p className="mt-1 font-mono text-[11px] text-mute">
          Login stays password-only.
          {data.durable
            ? ` State is on ${data.durableKind} — treasury and seats survive deploys.`
            : " Vercel /tmp wipes on every cold start. Add Upstash Redis so saves stick."}
        </p>
      </section>
    </div>
  );
}
