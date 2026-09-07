"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  loadOwner,
  saveOwner,
  tradingPubkey,
  buildTransfer,
  withdrawToOwner,
  signAndSendSwap,
  exportSecret,
  importSecret,
} from "@/lib/wallet/trading";
import { unsubscribeSeat } from "@/lib/wallet/seatPay";
import { WalletConnect } from "./WalletConnect";
import { useMarket, useOwner } from "@/lib/hooks";
import { SOL_MINT, USDC_MINT, XSTOCKS, xstockMint } from "@/lib/pair/mints";

function pickProvider() {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.phantom?.solana?.isPhantom ? w.phantom.solana : w.solana?.isPhantom ? w.solana : null;
}

type Auto = {
  armed?: boolean;
  armedAt?: number;
  mode?: "paper" | "live";
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
  const { data, loading, refresh } = useMarket(8000);
  const [auto, setAuto] = useState<Auto | null>(null);
  const [paper, setPaper] = useState<any>(null);
  const [liveTrading, setLiveTrading] = useState(false);
  const [tradePk, setTradePk] = useState("");
  const [bal, setBal] = useState(0);
  const [solAmt, setSolAmt] = useState(0.5);
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
  } | null>(null);
  const [restore, setRestore] = useState("");

  const demoPaper = data?.paper;
  const book = paper || demoPaper;
  const pair = data?.pair;
  const armed = Boolean(auto?.armed);

  async function refreshAuto(pk = owner) {
    if (!pk) return;
    const a = await fetch(`/api/auto?owner=${pk}`).then((r) => r.json());
    setAuto(a.auto);
    setPaper(a.paper);
    setLiveTrading(Boolean(a.liveTrading));
    try {
      const s = await fetch(`/api/access?pubkey=${pk}`).then((r) => r.json());
      setSeat(s);
    } catch {
      /* seat is optional for paper */
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
    const id = setInterval(() => refreshAuto(owner), 8000);
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
    setAuto(j.auto);
    setPaper(j.paper);
  }

  async function kill() {
    if (!owner) return setMsg("Connect Phantom first.");
    setBusy(true);
    try {
      if (liveTrading && auto?.mode === "live") {
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

  async function deposit() {
    const provider = pickProvider();
    if (!provider || !owner) return setMsg("Open this page in Phantom (browser or in-app).");
    setBusy(true);
    try {
      const tpk = tradingPubkey();
      const tx = await buildTransfer(owner, tpk, solAmt);
      const sent = await provider.signAndSendTransaction(tx);
      setMsg(`Added ${solAmt} SOL · ${String(sent.signature || sent).slice(0, 16)}…`);
      setTimeout(() => refreshAuto(owner), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "deposit rejected");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!owner || bal <= 0.001) return;
    setBusy(true);
    try {
      const sig = await withdrawToOwner(owner, Math.max(0, bal - 0.003));
      setMsg(`Withdraw sent · ${sig.slice(0, 16)}…`);
      setTimeout(() => refreshAuto(owner), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  const live = Boolean(data?.lastTickAt) && Date.now() - data.lastTickAt < 45_000;
  const tape = book?.tape || [];
  const fills = book?.fills || [];
  const pnlPct = book ? book.pnlPct : 0;
  const pnlUsd = book ? book.equityUsd - book.startingUsd : 0;
  const uptime = book?.startedAt ? fmtDur(now - book.startedAt) : auto?.armedAt ? fmtDur(now - auto.armedAt) : "on";
  const status = book?.killed ? "STOPPED" : "RUNNING";
  const halted = book?.haltReason && (book.haltedUntil || 0) > Date.now();
  const solQty = book?.pair?.solQty ?? pair?.solQty ?? 0;
  const spyxQty = book?.pair?.spyxQty ?? pair?.spyxQty ?? 0;
  const qqqxQty = book?.pair?.qqqxQty ?? pair?.qqqxQty ?? 0;
  const gldxQty = book?.pair?.gldxQty ?? pair?.gldxQty ?? 0;
  const usdcQty = book?.pair?.usdcQty ?? pair?.usdcQty ?? book?.cashUsd ?? 0;
  const solUsd = pair?.solUsd || 0;
  const spyxUsd = pair?.spyxUsd || 0;
  const qqqxUsd = pair?.qqqxUsd || 0;
  const gldxUsd = pair?.gldxUsd || 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-6 pt-2 md:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOL · S&P 500 · NASDAQ · GOLD</p>
          <h1 className="mt-1 font-display text-3xl leading-none text-ghost sm:text-4xl md:text-6xl">Operate</h1>
          <p className="mt-3 max-w-xl text-base text-mute sm:text-lg">
            Connect Phantom. Add SOL. She sits in USDC and scalps whichever of SOL, S&P 500, Nasdaq, or gold has a 5m/15m setup that agrees with the daily/4H trend, then trails the stop up. PnL is in USDC.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <div className="col-span-2 sm:col-auto [&_button]:w-full sm:[&_button]:w-auto">
            <WalletConnect />
          </div>
          {book?.killed ? (
            <button
              type="button"
              onClick={() => patch({ armed: true })}
              className="btn-acid col-span-1 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-4 py-3 text-sm sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-lg"
            >
              RESUME
            </button>
          ) : (
            <div className="btn-on col-span-1 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-4 py-3 text-sm sm:min-h-[56px] sm:w-auto sm:px-8 sm:text-lg">
              PAPER ON
            </div>
          )}
          <button
            type="button"
            onClick={kill}
            disabled={busy}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border-2 border-blood px-4 py-3 text-sm text-blood sm:min-h-[56px] sm:w-auto sm:px-6 sm:text-base"
          >
            KILL
          </button>
        </div>
      </header>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        <How n="1" t="Connect Phantom" d="Your keys stay in the wallet. We never see them." />
        <How n="2" t="Add SOL" d="Phantom is login. Added SOL sits in a trading wallet on this device until you withdraw." />
        <How n="3" t="Let her work" d="Practice never spends it. Real trades only after a paid 0.1 SOL seat, LIVE ON, and you flip to REAL." />
      </ol>

      <div className="mt-5 rounded-2xl border border-blood/40 bg-blood/10 p-4 text-sm leading-relaxed text-ghost">
        These are official tokenized S&P 500, Nasdaq-100, and gold (xStocks). They are not the same as the New York
        market after hours. You can lose SOL. Spot only — no borrowed money. Keys stay on this device. Adding SOL is a
        real on-chain transfer to the trading wallet on this browser. Backup that key. Clearing the browser without a
        backup can lose the SOL.
      </div>

      {!owner && (
        <div className="panel mt-5 rounded-2xl border-cyan/30 p-4">
          <div className="font-mono text-[11px] tracking-[0.2em] text-cyan">START HERE</div>
          <p className="mt-1 text-base text-mute">
            Connect Phantom to preview her paper book, then add SOL when you want her trading with real size.
          </p>
        </div>
      )}

      <section className="panel mt-5 rounded-3xl p-5 md:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[11px] tracking-[0.22em] text-violet">YOUR BOOK</div>
            <h2 className="mt-1 font-display text-3xl text-ghost md:text-4xl">What she holds</h2>
          </div>
          <div className="font-mono text-[12px] text-mute">
            {status} {armed ? "· watching" : live ? "· prices live" : ""} · {uptime}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Huge k="USDC" v={money(usdcQty)} sub="PnL home · dry powder" />
          <Huge k="SOL" v={solQty ? solQty.toFixed(4) : "0"} sub={solUsd ? money(solQty * solUsd) : "sleeve"} />
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
          {(owner && book?.lastAction) || pair?.reason || book?.lastAction || "Waiting on prices…"}
        </p>
        {book?.pendingIntent && auto?.mode === "live" && (
          <p className="mt-2 font-mono text-sm text-acid">Live trade going out from the trading wallet on this device — no extra Phantom popup.</p>
        )}

        <div className="mt-6 border-t border-violet/20 pt-5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">
            TRADING WALLET · {tradePk ? `${tradePk.slice(0, 4)}…${tradePk.slice(-4)}` : "connect first"} · keys never leave
            this device
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0.1, 0.5, 1, 2].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSolAmt(n)}
                className={`min-h-[40px] rounded-full py-2 font-mono text-[12px] ${solAmt === n ? "btn-on" : "btn-ghost"}`}
              >
                {n} SOL
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={busy || !owner}
              onClick={deposit}
              className="btn-acid min-h-[48px] rounded-full py-3 font-mono text-[12px] disabled:opacity-40"
            >
              Add {solAmt} SOL
            </button>
            <button
              disabled={busy || bal < 0.01 || !book?.killed}
              onClick={withdraw}
              className="btn-ghost min-h-[48px] rounded-full py-3 font-mono text-[12px] disabled:opacity-40"
            >
              {book?.killed ? "Withdraw" : "KILL to withdraw"}
            </button>
          </div>
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

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-violet/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-display text-xl text-ghost">{auto?.mode === "live" ? "Real trades" : "Practice mode"}</div>
            <p className="mt-1 text-sm text-mute">
              {!liveTrading
                ? "Practice only right now. Real swaps are not turned on for this site yet."
                : seat?.treasury && !seat?.liveSeat && !seat?.founder
                  ? "Live is on, but you need a paid 0.1 SOL seat before she can spend the trading wallet."
                  : auto?.mode === "live"
                    ? "Uses the SOL you added. You already connected — she signs from this device."
                    : "Fake fills on live prices. Flip to real trades after you add SOL and pay the seat."}
            </p>
            {seat?.liveSeat && seat.subscribedUntil ? (
              <p className="mt-2 font-mono text-[11px] text-acid">
                Seat through {new Date(seat.subscribedUntil).toLocaleDateString()}
                {seat.autoRenew ? " · auto-renew on" : " · auto-renew off"}
              </p>
            ) : null}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            <button
              type="button"
              disabled={!liveTrading || Boolean(seat?.treasury && !seat?.liveSeat && !seat?.founder)}
              onClick={() => patch({ mode: auto?.mode === "live" ? "paper" : "live" })}
              className={`min-h-[44px] w-full rounded-full px-5 font-mono text-[12px] sm:w-auto ${
                auto?.mode === "live" ? "btn-on" : "btn-ghost"
              } disabled:opacity-40`}
            >
              {liveTrading ? (auto?.mode === "live" ? "REAL" : "PRACTICE") : "PRACTICE"}
            </button>
            {seat?.treasury && !seat?.liveSeat && !seat?.founder && (
              <Link href="/pricing" className="btn-acid inline-flex min-h-[40px] items-center justify-center rounded-full px-4 font-mono text-[11px]">
                Pay 0.1 SOL
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
      </section>

      {halted && <p className="mt-3 font-mono text-sm text-blood">{book.haltReason}</p>}
      {msg && <p className="mt-3 font-mono text-sm text-acid">{msg}</p>}

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <div className="panel space-y-4 rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">HOW SHE TRADES</div>
          <h3 className="font-display text-2xl text-ghost">Every pair. USDC PnL.</h3>
          <p className="text-sm leading-relaxed text-mute">
            She sits in USDC and buys the sleeve — SOL, S&P 500, Nasdaq, or gold — with a 5m/15m scalp that agrees
            with Daily and 4H bias. After fees she only moves the stop up. SOL and gold run around the clock; equities
            sit more on weekends. 0.1% on each clip. An 8% drop sells everything back to USDC and pauses.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Mini k="S&P 500" v={spyxUsd ? `$${Number(spyxUsd).toFixed(0)}` : "—"} />
            <Mini k="Nasdaq" v={qqqxUsd ? `$${Number(qqqxUsd).toFixed(0)}` : "—"} />
            <Mini k="Gold" v={gldxUsd ? `$${Number(gldxUsd).toFixed(0)}` : "—"} />
          </div>
        </div>

        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">ACTIVITY</div>
          <h2 className="mt-1 font-display text-2xl text-ghost">{armed ? "What she’s doing" : "Preview"}</h2>
          <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
            {tape.length === 0 &&
              fills.slice(0, 12).map((f: any) => (
                <TapeRow key={f.id} action={f.side} reason={f.reason} at={f.at} extra={money(f.sizeUsd)} />
              ))}
            {tape.map((row: any) => (
              <TapeRow
                key={row.id}
                action={row.action}
                reason={row.reason}
                at={row.at}
                extra={row.sizeUsd ? money(row.sizeUsd) : row.from && row.to && row.from !== "none" ? `${row.from} → ${row.to}` : ""}
              />
            ))}
            {!tape.length && !fills.length && (
              <p className="text-sm text-mute">{loading ? "Loading…" : "No decisions yet. Paper is already on."}</p>
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
      <div className={`mt-1 font-display text-2xl md:text-3xl ${good === false ? "text-blood" : "text-ghost"}`}>{v}</div>
      <div className="mt-1 font-mono text-[11px] text-mute">{sub}</div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-violet/15 px-3 py-2">
      <div className="font-mono text-[10px] tracking-[0.16em] text-mute">{k}</div>
      <div className="font-display text-lg text-ghost">{v}</div>
    </div>
  );
}
