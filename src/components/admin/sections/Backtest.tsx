"use client";

import { EquityCurve } from "@/components/EquityCurve";
import { useAdmin } from "../AdminProvider";
import { Mini, age, money } from "../ui";

export function BacktestSection() {
  const { data, now, busy, patch, btLev, setBtLev } = useAdmin();
  if (!data) return null;
  const shownBt = (btLev === 3 ? data.backtestLev3 : btLev === 2 ? data.backtestLev2 : data.backtest) || data.backtest;

  return (
    <section className="panel rounded-2xl p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ENGINE BACKTEST</div>
          <h2 className="mt-1 font-display text-2xl text-ghost">Does this engine print?</h2>
          <p className="mt-2 max-w-2xl text-sm text-mute">
            Replay spot 1× plus SOL-PERP 2× and 3× on the same ~40d 15m tape. Jupiter Perps fees and liquidation are in the lev marks.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ runBacktest: true })}
          className="btn-acid rounded-full px-5 py-3 text-sm disabled:opacity-40"
        >
          {busy ? "Replaying history…" : "Run backtest"}
        </button>
      </div>
      {shownBt ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setBtLev(n)}
                    disabled={n > 1 && !(n === 2 ? data.backtestLev2 : data.backtestLev3)}
                    className={`rounded-full px-3 py-1 font-mono text-[11px] ${btLev === n ? "btn-on" : "btn-ghost"} disabled:opacity-40`}
                  >
                    {n === 1 ? "Spot 1×" : `SOL ${n}×`}
                  </button>
                ))}
              </div>
              <div className={`font-display text-4xl ${shownBt.pnlPct >= 0 ? "text-acid" : "text-blood"}`}>
                {shownBt.pnlPct >= 0 ? "+" : ""}
                {(shownBt.pnlPct * 100).toFixed(2)}%
              </div>
            </div>
            <p className="font-mono text-[11px] text-mute">
              {shownBt.horizon} · ran {age(now - shownBt.ranAt)} ago
              {shownBt.leverage && shownBt.leverage > 1 ? ` · liq ${shownBt.liquidations || 0}` : ""}
            </p>
          </div>
          {(data.backtestLev2 || data.backtestLev3) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.backtestLev2 && (
                <button
                  type="button"
                  onClick={() => setBtLev(2)}
                  className={`rounded-2xl border p-4 text-left ${btLev === 2 ? "border-acid/50 bg-acid/5" : "border-line/80 bg-void/50"}`}
                >
                  <div className="font-mono text-[10px] text-mute">SOL 2×</div>
                  <div className={`font-display text-2xl ${data.backtestLev2.pnlPct >= 0 ? "text-acid" : "text-blood"}`}>
                    {data.backtestLev2.pnlPct >= 0 ? "+" : ""}
                    {(data.backtestLev2.pnlPct * 100).toFixed(2)}%
                  </div>
                  <div className="font-mono text-[11px] text-mute">
                    {data.backtestLev2.trades} clips · liq {data.backtestLev2.liquidations || 0} · DD −
                    {(data.backtestLev2.maxDdPct * 100).toFixed(1)}%
                  </div>
                </button>
              )}
              {data.backtestLev3 && (
                <button
                  type="button"
                  onClick={() => setBtLev(3)}
                  className={`rounded-2xl border p-4 text-left ${btLev === 3 ? "border-acid/50 bg-acid/5" : "border-line/80 bg-void/50"}`}
                >
                  <div className="font-mono text-[10px] text-mute">SOL 3×</div>
                  <div className={`font-display text-2xl ${data.backtestLev3.pnlPct >= 0 ? "text-acid" : "text-blood"}`}>
                    {data.backtestLev3.pnlPct >= 0 ? "+" : ""}
                    {(data.backtestLev3.pnlPct * 100).toFixed(2)}%
                  </div>
                  <div className="font-mono text-[11px] text-mute">
                    {data.backtestLev3.trades} clips · liq {data.backtestLev3.liquidations || 0} · DD −
                    {(data.backtestLev3.maxDdPct * 100).toFixed(1)}%
                  </div>
                </button>
              )}
            </div>
          )}
          <EquityCurve curve={shownBt.curve} up={shownBt.pnlPct >= 0} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <Mini k="Start" v={money(shownBt.startingUsd)} />
            <Mini k="End" v={money(shownBt.endingUsd)} />
            <Mini k="PnL" v={`${shownBt.pnlUsd >= 0 ? "+" : "−"}${money(Math.abs(shownBt.pnlUsd))}`} />
            <Mini k="Max DD" v={`−${(shownBt.maxDdPct * 100).toFixed(1)}%`} />
            <Mini k="Closed clips" v={String(shownBt.trades)} />
            <Mini k="Win rate" v={`${Math.round(shownBt.winRate * 100)}%`} />
            <Mini k="Wins / losses" v={`${shownBt.wins} / ${shownBt.losses}`} />
            <Mini
              k="Profit factor"
              v={shownBt.profitFactor == null ? (shownBt.wins ? "∞" : "—") : shownBt.profitFactor.toFixed(2)}
            />
            <Mini k="Realized" v={`${(shownBt.realizedUsd || 0) >= 0 ? "+" : "−"}${money(Math.abs(shownBt.realizedUsd || 0))}`} />
            <Mini k="Open mark" v={`${(shownBt.unrealizedUsd || 0) >= 0 ? "+" : "−"}${money(Math.abs(shownBt.unrealizedUsd || 0))}`} />
            <Mini k="Fees" v={money(shownBt.feesUsd)} />
            <Mini k="Slip" v={money(shownBt.slippageUsd)} />
            <Mini k="Avg win" v={`+${money(Math.abs(shownBt.avgWinUsd))}`} />
            <Mini k="Avg loss" v={money(shownBt.avgLossUsd)} />
            <Mini k="Best clip" v={`+${money(Math.abs(shownBt.bestTradeUsd))}`} />
            <Mini k="Worst clip" v={money(shownBt.worstTradeUsd)} />
            <Mini k="Best day" v={`+${money(Math.abs(shownBt.bestDayUsd || 0))}`} />
            <Mini k="Avg day" v={`${(shownBt.avgDayUsd || 0) >= 0 ? "+" : "−"}${money(Math.abs(shownBt.avgDayUsd || 0))}`} />
            <Mini k="Days ≥ $2" v={String(shownBt.daysGe2 || 0)} />
            <Mini k="Bars" v={String(shownBt.bars)} />
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">PER SLEEVE</div>
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
              {shownBt.sleeves.map((s) => (
                <div key={s.id} className="rounded-2xl border border-line/80 bg-void/50 p-4">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{s.id}</div>
                  <div className={`mt-1 font-display text-xl ${s.pnlUsd >= 0 ? "text-acid" : "text-blood"}`}>
                    {s.pnlUsd >= 0 ? "+" : "−"}
                    {money(Math.abs(s.pnlUsd))}
                  </div>
                  <div className="font-mono text-[11px] text-mute">
                    {s.trades} clips · {Math.round(s.winRate * 100)}% win
                  </div>
                </div>
              ))}
            </div>
          </div>
          {(shownBt.daily || []).length > 0 && (
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-mute">DAILY · MARKED BOOK</div>
              <p className="mt-1 text-xs text-mute">
                PnL is the book mark, including an open sleeve. Clips are buys in / sells out. “Held” means the position moved and she
                did not fire a clip that UTC day.
              </p>
              <div className="mt-2 max-h-56 overflow-auto">
                <table className="w-full min-w-[520px] text-left font-mono text-[12px]">
                  <thead className="text-mute">
                    <tr>
                      <th className="py-2 font-normal">Day</th>
                      <th className="py-2 font-normal">Mark</th>
                      <th className="py-2 font-normal">Realized</th>
                      <th className="py-2 font-normal">In / out</th>
                      <th className="py-2 font-normal">Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(shownBt.daily || [])
                      .slice()
                      .reverse()
                      .map((d) => {
                        const inn = d.entries ?? 0;
                        const out = d.exits ?? d.trades ?? 0;
                        const clips = inn + out;
                        const held = clips === 0 && Math.abs(d.pnlUsd) >= 0.01;
                        return (
                          <tr key={d.day} className="border-t border-line/60">
                            <td className="py-2 text-ghost">{d.day}</td>
                            <td className={d.pnlUsd >= 2 ? "text-acid" : d.pnlUsd < 0 ? "text-blood" : "text-mute"}>
                              {d.pnlUsd >= 0 ? "+" : "−"}
                              {money(Math.abs(d.pnlUsd))}
                            </td>
                            <td className="text-mute">
                              {(d.realizedUsd || 0) >= 0 ? "+" : "−"}
                              {money(Math.abs(d.realizedUsd || 0))}
                            </td>
                            <td className={held ? "text-violet" : "text-mute"}>{held ? "held" : `${inn} / ${out}`}</td>
                            <td className="text-mute">{money(d.endEquity)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {shownBt.monthly.length > 0 && (
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-mute">MONTHLY</div>
              <div className="mt-2 overflow-auto">
                <table className="w-full min-w-[420px] text-left font-mono text-[12px]">
                  <thead className="text-mute">
                    <tr>
                      <th className="py-2 font-normal">Month</th>
                      <th className="py-2 font-normal">PnL</th>
                      <th className="py-2 font-normal">In / out</th>
                      <th className="py-2 font-normal">Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownBt.monthly.map((m) => (
                      <tr key={m.ym} className="border-t border-line/60">
                        <td className="py-2 text-ghost">{m.ym}</td>
                        <td className={m.pnlUsd >= 0 ? "text-acid" : "text-blood"}>
                          {m.pnlUsd >= 0 ? "+" : "−"}
                          {money(Math.abs(m.pnlUsd))}
                        </td>
                        <td className="text-mute">
                          {m.entries ?? 0} / {m.exits ?? m.trades ?? 0}
                        </td>
                        <td className="text-mute">{money(m.endEquity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {(shownBt.fills || []).length > 0 && (
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-mute">LAST CLIPS</div>
              <div className="mt-2 max-h-64 space-y-2 overflow-auto">
                {(shownBt.fills || [])
                  .slice()
                  .reverse()
                  .map((f, i) => (
                    <div key={`${f.at}-${i}`} className="flex items-start justify-between gap-3 font-mono text-[11px]">
                      <span className={f.side === "buy" ? "text-acid" : "text-ghost"}>
                        {f.side.toUpperCase()} {f.symbol}
                      </span>
                      <span className="max-w-[70%] text-right text-mute">
                        {money(f.sizeUsd)}
                        {f.pnlUsd != null ? ` · ${f.pnlUsd >= 0 ? "+" : "−"}${money(Math.abs(f.pnlUsd))}` : ""} · {f.reason}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <p className="text-xs text-mute">{shownBt.note}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-mute">No run yet. Hit Run backtest — it takes about a minute.</p>
      )}
    </section>
  );
}
