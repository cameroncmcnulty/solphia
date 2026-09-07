"use client";

import { useEffect, useRef, useState } from "react";
import { loadOwner, saveOwner, tradingPubkey, buildTransfer, withdrawToOwner, signAndSendSwap } from "@/lib/wallet/trading";
import { WalletConnect } from "./WalletConnect";
import { useMarket, useOwner } from "@/lib/hooks";
import { SOL_MINT, USDC_MINT, XSTOCKS, xstockBySymbol, xstockMint } from "@/lib/pair/mints";

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

function mintFor(label: string): string {
  if (label === "SOL") return SOL_MINT;
  if (label === "USDC") return USDC_MINT;
  const row = xstockBySymbol(label);
  return row ? xstockMint(row.id) : xstockMint("spyx");
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
  const liveLock = useRef(false);
  const lastDep = useRef<number | null>(null);

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

  useEffect(() => {
    if (!liveTrading || auto?.mode !== "live" || !armed || !owner) return;
    const intent = paper?.pendingIntent;
    if (!intent || liveLock.current) return;
    const solPx = Number(pair?.solUsd || data?.solUsd || 0);
    if (!(solPx > 0)) return;
    liveLock.current = true;
    (async () => {
      try {
        const tpk = tradingPubkey();
        const slip = 50;
        async function swapOne(inputMint: string, outputMint: string, amount: number) {
          const r = await fetch("/api/pair/swap", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ owner, tradingPubkey: tpk, inputMint, outputMint, amount, slippageBps: slip }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || "swap build failed");
          return signAndSendSwap(j.transaction);
        }
        async function swap(inputMint: string, outputMint: string, amount: number) {
          const from = inputMint === SOL_MINT ? "SOL" : inputMint === USDC_MINT ? "USDC" : xstockBySymbolLabel(inputMint);
          const to = outputMint === SOL_MINT ? "SOL" : outputMint === USDC_MINT ? "USDC" : xstockBySymbolLabel(outputMint);
          const q = await fetch(`/api/pair/quote?from=${from}&to=${to}&amount=${amount}&slippageBps=${slip}`).then((r) => r.json());
          if (!q.ok) throw new Error(q.reason || "quote failed");
          if (q.viaUsdc && q.midAmount > 0) {
            await swapOne(inputMint, USDC_MINT, amount);
            return swapOne(USDC_MINT, outputMint, q.midAmount);
          }
          return swapOne(inputMint, outputMint, amount);
        }
        function pxOf(label: string) {
          if (label === "SOL") return solPx;
          if (label === "QQQx") return Number(pair?.qqqxUsd || 0);
          if (label === "GLDx") return Number(pair?.gldxUsd || 0);
          return Number(pair?.spyxUsd || 0);
        }
        let sig = "";
        if (intent.action === "sell_sol" || (intent.action === "rebalance" && intent.from === "SOL")) {
          const out = mintFor(intent.to);
          const amt = intent.clipUsd / solPx;
          if (amt > 0.002) sig = await swap(SOL_MINT, out, amt);
        } else if (
          intent.action === "sell_xstock" ||
          intent.action === "sell_spyx" ||
          (intent.action === "rebalance" && intent.from !== "SOL")
        ) {
          const inn = mintFor(intent.from);
          const px = pxOf(intent.from);
          const amt = px > 0 ? intent.clipUsd / px : 0;
          if (amt > 0) sig = await swap(inn, SOL_MINT, amt);
        } else if (intent.action === "deploy") {
          if (intent.to && intent.to !== "SOL" && intent.to !== "USDC") {
            const amt = intent.clipUsd / solPx;
            if (amt > 0.002) sig = await swap(SOL_MINT, mintFor(intent.to), amt);
          } else {
            const each = (intent.clipUsd * (1 - (intent.solPct ?? 0.4))) / 3 / solPx;
            for (const x of XSTOCKS) {
              if (each > 0.002) sig = await swap(SOL_MINT, xstockMint(x.id), each);
            }
          }
        } else if (intent.action === "flatten") {
          const h = paper?.pair;
          for (const x of XSTOCKS) {
            const qty = Number(h?.[qtyKey(x.id)] || 0);
            if (qty > 0.0001) sig = await swap(xstockMint(x.id), SOL_MINT, qty);
          }
        }
        if (sig) {
          const r = await fetch("/api/auto", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ owner, liveFill: { signature: sig } }),
          });
          const j = await r.json();
          setPaper(j.paper);
          setMsg(`Trade sent · ${sig.slice(0, 16)}…`);
        }
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "live swap failed");
      } finally {
        liveLock.current = false;
      }
    })();
  }, [liveTrading, auto?.mode, armed, owner, paper?.pendingIntent, pair?.solUsd, pair?.spyxUsd, pair?.qqqxUsd, pair?.gldxUsd, data?.solUsd]);

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
  const uptime = auto?.armedAt ? fmtDur(now - auto.armedAt) : "on";
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
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-2 md:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOL · S&P 500 · NASDAQ · GOLD</p>
          <h1 className="mt-1 font-display text-3xl leading-none text-ghost sm:text-4xl md:text-6xl">Operate</h1>
          <p className="mt-3 max-w-xl text-base text-mute sm:text-lg">
            Connect Phantom. Add SOL. She buys and sells SOL against official S&P 500, Nasdaq-100, and gold tokens.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <WalletConnect />
          {book?.killed ? (
            <button
              type="button"
              onClick={() => patch({ armed: true })}
              className="btn-acid inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-8 py-3 text-base sm:min-h-[56px] sm:w-auto sm:text-lg"
            >
              RESUME
            </button>
          ) : (
            <div className="btn-on inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-8 py-3 text-base sm:min-h-[56px] sm:w-auto sm:text-lg">
              PAPER ON
            </div>
          )}
          <button
            type="button"
            onClick={kill}
            disabled={busy}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-blood px-6 py-3 text-base text-blood sm:min-h-[56px]"
          >
            KILL
          </button>
        </div>
      </header>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        <How n="1" t="Connect Phantom" d="Your keys stay in the wallet. We never see them." />
        <How n="2" t="Add SOL" d="Move SOL into the trading wallet on this device." />
        <How n="3" t="Let her work" d="She trades when SOL looks expensive or cheap vs those three markets. Hit KILL to stop." />
      </ol>

      <div className="mt-5 rounded-2xl border border-blood/40 bg-blood/10 p-4 text-sm leading-relaxed text-ghost">
        These are official tokenized S&P 500, Nasdaq-100, and gold (xStocks). They are not the same as the New York
        market after hours. You can lose SOL. Spot only — no borrowed money. Keys stay on this device.
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
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Huge k="SOL" v={solQty ? solQty.toFixed(4) : "0"} sub={solUsd ? money(solQty * solUsd) : "her home bag"} />
          <Huge k="S&P 500" v={spyxQty ? spyxQty.toFixed(4) : "0"} sub={spyxUsd ? money(spyxQty * spyxUsd) : "SPYx"} />
          <Huge k="Nasdaq" v={qqqxQty ? qqqxQty.toFixed(4) : "0"} sub={qqqxUsd ? money(qqqxQty * qqqxUsd) : "QQQx"} />
          <Huge k="Gold" v={gldxQty ? gldxQty.toFixed(4) : "0"} sub={gldxUsd ? money(gldxQty * gldxUsd) : "GLDx"} />
          <Huge
            k="PnL"
            v={`${pnlPct >= 0 ? "+" : ""}${(pnlPct * 100).toFixed(1)}%`}
            sub={`${pnlUsd >= 0 ? "+" : "−"}$${Math.abs(pnlUsd).toFixed(2)}`}
            good={Math.abs(pnlPct) < 0.0005 ? undefined : pnlPct >= 0}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Mini k="Cash" v={money(usdcQty)} />
          <Mini k="Book value" v={book ? money(book.equityUsd) : "—"} />
          <Mini k="Wallet SOL" v={`${bal.toFixed(3)}`} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-mute">
          {(owner && book?.lastAction) || pair?.reason || book?.lastAction || "Waiting on prices…"}
        </p>
        {book?.pendingIntent && (
          <p className="mt-2 font-mono text-sm text-acid">Approve the swap in Phantom to complete this live trade.</p>
        )}

        <div className="mt-6 border-t border-violet/20 pt-5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">
            TRADING WALLET · {tradePk ? `${tradePk.slice(0, 4)}…${tradePk.slice(-4)}` : "connect first"} · keys never leave
            this device
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
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
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-violet/20 p-4">
          <div>
            <div className="font-display text-xl text-ghost">{auto?.mode === "live" ? "Real trades" : "Practice mode"}</div>
            <p className="mt-1 text-sm text-mute">
              {liveTrading
                ? auto?.mode === "live"
                  ? "Uses the SOL you added. Phantom asks you to approve each swap."
                  : "Fake fills on live prices. Flip to real trades after you add SOL."
                : "Practice only right now. Real swaps are not turned on for this site yet."}
            </p>
          </div>
          <button
            type="button"
            disabled={!liveTrading}
            onClick={() => patch({ mode: auto?.mode === "live" ? "paper" : "live" })}
            className={`min-h-[44px] shrink-0 rounded-full px-5 font-mono text-[12px] ${
              auto?.mode === "live" ? "btn-on" : "btn-ghost"
            } disabled:opacity-40`}
          >
            {liveTrading ? (auto?.mode === "live" ? "REAL" : "PRACTICE") : "PRACTICE"}
          </button>
        </div>
      </section>

      {halted && <p className="mt-3 font-mono text-sm text-blood">{book.haltReason}</p>}
      {msg && <p className="mt-3 font-mono text-sm text-acid">{msg}</p>}

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <div className="panel space-y-4 rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.22em] text-violet">HOW SHE TRADES</div>
          <h3 className="font-display text-2xl text-ghost">No knobs. One job.</h3>
          <p className="text-sm leading-relaxed text-mute">
            When SOL looks expensive versus S&P 500, Nasdaq, or gold, she sells a slice of SOL for that token. When SOL
            looks cheap, she sells the token back for SOL. If nothing has moved enough, she sits. A 8% drop on the book
            sells everything and pauses.
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

function xstockBySymbolLabel(mint: string): string {
  const row = XSTOCKS.find((x) => xstockMint(x.id) === mint);
  return row?.symbol || "SPYx";
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
