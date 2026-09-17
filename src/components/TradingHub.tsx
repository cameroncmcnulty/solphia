"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  loadOwner,
  saveOwner,
  tradingPubkey,
  signAndSendSwap,
  exportSecret,
  importSecret,
} from "@/lib/wallet/trading";
import { unsubscribeSeat } from "@/lib/wallet/seatPay";
import { WalletConnect } from "./WalletConnect";
import { WalletMove } from "./WalletMove";
import { FieldError, FormAlert, useConfirmErrors } from "./form/confirm";
import { useMarket, useOwner } from "@/lib/hooks";
import { SOL_MINT, USDC_MINT, XSTOCKS, xstockMint } from "@/lib/pair/mints";

type Auto = {
  armed?: boolean;
  armedAt?: number;
  mode?: "paper" | "live";
  leverage?: 1 | 2 | 3;
  liveDelegate?: boolean;
};

function money(n: number) {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtDur(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function qtyKey(id: string): "spyxQty" | "qqqxQty" | "gldxQty" {
  if (id === "qqqx") return "qqqxQty";
  if (id === "gldx") return "gldxQty";
  return "spyxQty";
}

function tapeLabel(action: string) {
  if (action === "trade" || action === "buy" || action === "sell") return "TRADED";
  if (action === "deploy") return "BOUGHT";
  if (action === "flatten" || action === "kill") return "STOPPED";
  if (action === "skip") return "WAITING";
  return "WATCHING";
}

export function TradingHub() {
  const connected = useOwner();
  const owner = connected || loadOwner();
  const { data, loading, refresh } = useMarket(12_000);
  const [auto, setAuto] = useState<Auto | null>(null);
  const [paper, setPaper] = useState<any>(null);
  const [delegated, setDelegated] = useState(false);
  const [tradePk, setTradePk] = useState("");
  const [bal, setBal] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lastDep = useRef<number | null>(null);
  const [seat, setSeat] = useState<{
    liveSeat?: boolean;
    autoRenew?: boolean;
    subscribedUntil?: number | null;
    founder?: boolean;
    due?: boolean;
    treasury?: string | null;
    levSeat?: boolean;
  } | null>(null);
  const [restore, setRestore] = useState("");
  const fundErr = useConfirmErrors<"wallet" | "amount" | "restore">();

  const book = paper;
  const pair = data?.pair;
  const armed = Boolean(auto?.armed);

  async function refreshAuto(pk = owner) {
    if (!pk) return;
    const a = await fetch(`/api/auto?owner=${pk}`).then((r) => r.json());
    setAuto(a.auto);
    setPaper(a.paper);
    setDelegated(Boolean(a.liveDelegate || a.auto?.liveDelegate));
    try {
      const s = await fetch(`/api/access?pubkey=${pk}`).then((r) => r.json());
      setSeat(s);
    } catch {
      /* seat is optional until they pay */
    }
    const tpk = a.tradingPubkey || tradingPubkey();
    setTradePk(tpk);
    const b = await fetch(`/api/sol/balance?pubkey=${tpk}`).then((r) => r.json());
    if (typeof b.sol === "number") {
      setBal(b.sol);
      if (lastDep.current == null || Math.abs(lastDep.current - b.sol) > 0.0005) {
        lastDep.current = b.sol;
        await fetch("/api/auto", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner: pk, tradingPubkey: tpk, depositedSol: b.sol }),
        });
      }
    }
  }

  useEffect(() => {
    if (owner) {
      saveOwner(owner);
      try {
        const tpk = tradingPubkey();
        fetch("/api/auto", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner, tradingPubkey: tpk }),
        }).then(() => refreshAuto(owner));
      } catch {
        refreshAuto(owner);
      }
    }
  }, [owner]);

  useEffect(() => {
    if (!owner) return;
    const id = setInterval(() => refreshAuto(owner), 12_000);
    return () => clearInterval(id);
  }, [owner]);

  useEffect(() => {
    if (!armed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [armed]);

  async function patch(partial: Record<string, unknown>) {
    if (!owner) return setMsg("Connect Phantom first.");
    const r = await fetch("/api/auto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, auto: partial }),
    });
    const j = await r.json();
    if (j.auto) setAuto(j.auto);
    if (j.paper) setPaper(j.paper);
    setDelegated(Boolean(j.liveDelegate || j.auto?.liveDelegate));
    if (!r.ok) {
      const err = String(j.error || "");
      if (err === "need_seat") setMsg("Pay the SOL seat first. She stays off until then.");
      else if (err === "need_sol") setMsg("Fund the trading wallet with SOL, then press Start.");
      else if (err === "live_paused") setMsg("Live desk is paused.");
      else setMsg(j.error || "Could not arm.");
      return false;
    }
    return true;
  }

  async function ensureLive() {
    if (!owner || delegated) return;
    try {
      const r = await fetch("/api/live/delegate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, secret: exportSecret() }),
      });
      if (!r.ok) return;
      setDelegated(true);
      await refreshAuto(owner);
    } catch {
      /* seat or live flag may still be off */
    }
  }

  async function kill() {
    if (!owner) return setMsg("Connect Phantom first.");
    setBusy(true);
    try {
      if (delegated || auto?.mode === "live") {
        const tpk = tradingPubkey();
        const h = paper?.pair;
        for (const x of XSTOCKS) {
          const qty = Number(h?.[qtyKey(x.id)] || 0);
          if (qty <= 0.0001) continue;
          const r0 = await fetch("/api/pair/swap", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              owner,
              tradingPubkey: tpk,
              inputMint: xstockMint(x.id),
              outputMint: SOL_MINT,
              amount: qty,
              slippageBps: 50,
            }),
          });
          const j0 = await r0.json();
          if (r0.ok && j0.transaction) await signAndSendSwap(j0.transaction);
        }
        const usdc = Number(h?.usdcQty || 0);
        if (usdc > 1) {
          const r1 = await fetch("/api/pair/swap", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              owner,
              tradingPubkey: tpk,
              inputMint: USDC_MINT,
              outputMint: SOL_MINT,
              amount: usdc,
              slippageBps: 50,
            }),
          });
          const j1 = await r1.json();
          if (r1.ok && j1.transaction) await signAndSendSwap(j1.transaction);
        }
      }
      const r = await fetch("/api/auto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, kill: true }),
      });
      const j = await r.json();
      setAuto(j.auto);
      setPaper(j.paper);
      setMsg("Stopped. Holdings sold back. You can withdraw.");
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "kill failed");
    } finally {
      setBusy(false);
    }
  }

  const live = Boolean(data?.lastTickAt) && Date.now() - data.lastTickAt < 45_000;
  const tape = book?.tape || [];
  const fills = book?.fills || [];
  const pnlPct = book ? book.pnlPct : 0;
  const pnlUsd = book ? book.equityUsd - book.startingUsd : 0;
  const uptime = armed && auto?.armedAt ? fmtDur(now - auto.armedAt) : "off";
  const status = book?.killed ? "STOPPED" : armed ? "RUNNING" : "OFF";
  const canStart = Boolean(seat?.liveSeat || seat?.founder) && bal > 0.001;
  const halted = book?.haltReason && (book.haltedUntil || 0) > Date.now();
  const spyxQty = book?.pair?.spyxQty ?? pair?.spyxQty ?? 0;
  const qqqxQty = book?.pair?.qqqxQty ?? pair?.qqqxQty ?? 0;
  const gldxQty = book?.pair?.gldxQty ?? pair?.gldxQty ?? 0;
  const usdcQty = book?.pair?.usdcQty ?? pair?.usdcQty ?? book?.cashUsd ?? 0;
  const spyxUsd = pair?.spyxUsd || 0;
  const qqqxUsd = pair?.qqqxUsd || 0;
  const gldxUsd = pair?.gldxUsd || 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-6 pt-2 md:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">USDC · S&P 500 · NASDAQ · GOLD</p>
          <h1 className="mt-1 font-display text-3xl leading-none text-ghost sm:text-4xl md:text-6xl">Automate</h1>
          <p className="mt-3 max-w-xl text-base text-mute sm:text-lg">
            She stays off until you pay the SOL seat, fund the trading wallet, and press Start. No paper book. The
            backtest on the home page is the proof.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <div
            data-field="wallet"
            className={`col-span-2 sm:col-auto [&_button]:w-full sm:[&_button]:w-auto ${fundErr.errors.wallet ? "rounded-full ring-1 ring-blood/70" : ""}`}
          >
            <WalletConnect />
          </div>
          {!armed || book?.killed ? (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!owner) return setMsg("Connect Phantom first.");
                if (!canStart) {
                  setMsg(
                    seat?.liveSeat || seat?.founder
                      ? "Fund the trading wallet with SOL, then press Start."
                      : "Pay the SOL seat first. She stays off until then.",
                  );
                  return;
                }
                const ok = await patch({ armed: true, mode: "live" });
                if (ok) await ensureLive();
              }}
              className="btn-acid col-span-1 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-4 py-3 text-sm sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-lg disabled:opacity-40"
            >
              START
            </button>
          ) : (
            <div className="btn-on col-span-1 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-4 py-3 text-sm sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-lg">
              {delegated ? "RUNNING" : "STARTING"}
            </div>
          )}
          <button
            type="button"
            onClick={kill}
            disabled={busy}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border-2 border-blood px-4 py-3 text-sm text-blood sm:min-h-[56px] sm:w-auto sm:px-6 sm:text-base"
          >
            STOP
          </button>
        </div>
      </header>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        <How n="1" t="Pay SOL" d="0.1 SOL seat (0.15 for 2×/3×). That is the on-switch." />
        <How n="2" t="Fund her" d="Move SOL into the trading wallet. Back up that key." />
        <How n="3" t="Press Start" d="She stays off until you do. Stop flattens and pauses." />
      </ol>

      <div className="mt-5 rounded-2xl border border-blood/40 bg-blood/10 px-4 py-3 text-sm text-ghost">
        Trading carries risk and has the potential of losing. Make sure to back up your trading key.
      </div>

      <section className="panel mt-5 rounded-3xl p-5 md:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[11px] tracking-[0.22em] text-violet">YOUR BOOK</div>
            <h2 className="mt-1 font-display text-3xl text-ghost md:text-4xl">What she holds</h2>
          </div>
          <div className="font-mono text-[12px] text-mute">
            {status}
            {armed ? (delegated ? " · live desk" : " · starting") : live ? " · prices live" : ""} · {uptime}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Huge k="USDC" v={money(usdcQty)} sub="PnL home · dry powder" />
          <Huge
            k="PnL (USDC)"
            v={`${pnlPct >= 0 ? "+" : ""}${(pnlPct * 100).toFixed(1)}%`}
            sub={`${pnlUsd >= 0 ? "+" : "−"}$${Math.abs(pnlUsd).toFixed(2)}`}
            good={Math.abs(pnlPct) < 0.0005 ? undefined : pnlPct >= 0}
          />
          <Huge k="S&P 500" v={spyxQty ? spyxQty.toFixed(4) : "0"} sub={spyxUsd ? money(spyxQty * spyxUsd) : "SPYx"} />
          <Huge k="Nasdaq" v={qqqxQty ? qqqxQty.toFixed(4) : "0"} sub={qqqxUsd ? money(qqqxQty * qqqxUsd) : "QQQx"} />
          <Huge k="Gold" v={gldxQty ? gldxQty.toFixed(4) : "0"} sub={gldxUsd ? money(gldxQty * gldxUsd) : "GLDx"} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Mini k="Book (USDC)" v={book ? money(book.equityUsd) : "—"} />
          <Mini k="Wallet SOL" v={`${bal.toFixed(3)}`} />
          <Mini k="Trades" v={String(book?.trades ?? 0)} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-mute">
          {armed
            ? (owner && book?.lastAction) || pair?.reason || book?.lastAction || "Waiting on prices…"
            : "Off. Pay the SOL seat, fund the trading wallet, then press Start."}
        </p>
        {delegated && (
          <p className="mt-2 font-mono text-sm text-acid">Live desk is on. Server signs. Close the tab or switch wallets.</p>
        )}
        {book?.pendingIntent && (
          <p className="mt-2 font-mono text-sm text-acid">Clip going out. You can close the tab.</p>
        )}

        <div className="mt-6 border-t border-violet/20 pt-5">
          {owner && tradePk ? (
            <WalletMove
              owner={owner}
              tradePk={tradePk}
              tradeBal={bal}
              onDone={() => {
                refreshAuto(owner);
              }}
            />
          ) : (
            <p className="text-sm text-mute">Connect Phantom to move SOL between your wallet and the trading wallet.</p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportSecret());
                  setMsg("Trading key copied. Store it offline. Anyone with it can spend this wallet.");
                } catch {
                  setMsg("Could not copy the trading key.");
                }
              }}
              className="btn-ghost min-h-[40px] rounded-full px-4 font-mono text-[11px]"
            >
              Backup trading key
            </button>
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const pk = importSecret(restore);
                  setTradePk(pk);
                  setRestore("");
                  setMsg(`Restored trading wallet ${pk.slice(0, 4)}…${pk.slice(-4)}`);
                  if (owner) refreshAuto(owner);
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "restore failed");
                }
              }}
            >
              <input
                value={restore}
                onChange={(e) => setRestore(e.target.value)}
                placeholder="paste backup to restore"
                className="min-h-[40px] min-w-0 flex-1 rounded-full border border-violet/30 bg-void px-4 font-mono text-[11px] text-ghost"
              />
              <button type="submit" className="btn-ghost min-h-[40px] rounded-full px-4 font-mono text-[11px]">
                Restore
              </button>
            </form>
          </div>
        </div>

        {(seat?.treasury && !seat?.liveSeat && !seat?.founder) || (seat?.liveSeat && seat.subscribedUntil) || (seat?.autoRenew && !seat?.founder) ? (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-violet/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {seat?.treasury && !seat?.liveSeat && !seat?.founder ? (
                <p className="text-sm text-mute">Pay the 0.1 SOL seat (0.15 SOL for SOL 2×/3×) and she spends the trading wallet.</p>
              ) : seat?.liveSeat && seat.subscribedUntil ? (
                <p className="font-mono text-[11px] text-acid">
                  Seat through {new Date(seat.subscribedUntil).toLocaleDateString()}
                  {seat.autoRenew ? " · auto-renew on" : ""}
                </p>
              ) : null}
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
              {seat?.treasury && !seat?.liveSeat && !seat?.founder && (
                <Link href="/pricing" className="btn-acid inline-flex min-h-[40px] items-center justify-center rounded-full px-4 font-mono text-[11px]">
                  Pay the seat
                </Link>
              )}
              {seat?.autoRenew && !seat?.founder && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!owner) return;
                    setBusy(true);
                    try {
                      await unsubscribeSeat(owner);
                      setMsg("Auto-renew off. Seat stays until the paid-through date.");
                      await refreshAuto(owner);
                    } catch (e) {
                      setMsg(e instanceof Error ? e.message : "unsubscribe failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="min-h-[40px] rounded-full border border-blood/40 px-4 font-mono text-[11px] text-blood"
                >
                  Unsubscribe
                </button>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {halted && <p className="mt-3 font-mono text-sm text-blood">{book.haltReason}</p>}
      {fundErr.banner && (
        <div className="mt-3">
          <FormAlert error={fundErr.banner} />
        </div>
      )}
      {msg && !fundErr.banner && <p className="mt-3 font-mono text-sm text-acid">{msg}</p>}
      <FieldError error={fundErr.errors.wallet} />

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <div className="panel space-y-4 rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">HOW SHE TRADES</div>
          <h3 className="font-display text-2xl text-ghost">0.5% clips. 40% of a sleeve.</h3>
          <p className="text-sm leading-relaxed text-mute">
            She keeps PnL in USDC and scalps tokenized S&P, Nasdaq, and gold. SOL stays in the trading wallet for
            gas and fees — it is not a sleeve. A 12% drawdown flattens to USDC and pauses.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Mini k="S&P 500" v={spyxUsd ? `$${Number(spyxUsd).toFixed(0)}` : "—"} />
            <Mini k="Nasdaq" v={qqqxUsd ? `$${Number(qqqxUsd).toFixed(0)}` : "—"} />
            <Mini k="Gold" v={gldxUsd ? `$${Number(gldxUsd).toFixed(0)}` : "—"} />
          </div>
        </div>

        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">ACTIVITY</div>
          <h2 className="mt-1 font-display text-2xl text-ghost">{armed ? "What she’s doing" : "Activity"}</h2>
          <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
            {armed &&
              tape.length === 0 &&
              fills.slice(0, 12).map((f: any) => (
                <TapeRow key={f.id} action={f.side} reason={f.reason} at={f.at} extra={money(f.sizeUsd)} />
              ))}
            {armed &&
              tape.map((row: any) => (
                <TapeRow
                  key={row.id}
                  action={row.action}
                  reason={row.reason}
                  at={row.at}
                  extra={row.sizeUsd ? money(row.sizeUsd) : row.from && row.to && row.from !== "none" ? `${row.from} → ${row.to}` : ""}
                />
              ))}
            {(!armed || (!tape.length && !fills.length)) && (
              <p className="text-sm text-mute">
                {loading
                  ? "Loading…"
                  : armed
                    ? "No clips yet."
                    : "No live clips. The backtest on the home page is the proof."}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function How({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <li className="panel rounded-2xl p-4">
      <div className="font-mono text-[11px] text-acid">{n}</div>
      <div className="mt-1 font-display text-xl text-ghost">{t}</div>
      <p className="mt-1 text-sm text-mute">{d}</p>
    </li>
  );
}

function TapeRow({ action, reason, at, extra }: { action: string; reason: string; at: number; extra?: string }) {
  const tone =
    action === "skip" || action === "kill" || action === "flatten"
      ? "text-blood"
      : action === "trade" || action === "deploy" || action === "buy" || action === "sell"
        ? "text-acid"
        : "text-mute";
  return (
    <div className="rounded-xl border border-violet/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${tone}`}>{tapeLabel(action)}</span>
        <span className="font-mono text-[11px] text-mute">
          {new Date(at).toLocaleTimeString()} {extra}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ghost">{reason}</p>
    </div>
  );
}

function Huge({ k, v, sub, good }: { k: string; v: string; sub: string; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-violet/20 bg-void/40 p-4">
      <div className="font-mono text-[10px] tracking-[0.18em] text-mute">{k}</div>
      <div className={`stat-num mt-1 text-2xl md:text-3xl ${good === false ? "text-blood" : "text-ghost"}`}>{v}</div>
      <div className="mt-1 font-mono text-[11px] text-mute">{sub}</div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-violet/15 px-3 py-2">
      <div className="font-mono text-[10px] tracking-[0.16em] text-mute">{k}</div>
      <div className="stat-num text-lg text-ghost">{v}</div>
    </div>
  );
}
