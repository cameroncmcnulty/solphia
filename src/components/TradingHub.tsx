"use client";

import { useEffect, useRef, useState } from "react";
import { loadOwner, saveOwner, tradingPubkey, buildTransfer, withdrawToOwner, signAndSendSwap } from "@/lib/wallet/trading";
import { WalletConnect } from "./WalletConnect";
import { useMarket, useOwner } from "@/lib/hooks";
import { SOL_MINT, USDC_MINT, spyxMint } from "@/lib/pair/mints";

function pickProvider() {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.phantom?.solana || w.solflare || w.solana || null;
}

type Auto = {
  armed?: boolean;
  armedAt?: number;
  mode?: "paper" | "live";
  allocationPct?: number;
  style?: "mean_revert" | "hold_mix";
  band?: "tight" | "normal" | "wide";
  clipPct?: number;
  cooldownMin?: number;
  stopPct?: number;
  takeProfitPct?: number;
  targetSolPct?: number;
  slippageBps?: number;
  maxImpactPct?: number;
  leverage?: number;
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
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveLock = useRef(false);

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
    setBal(b.sol || 0);
    if (typeof b.sol === "number") {
      await fetch("/api/auto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: pk, tradingPubkey: tpk, depositedSol: b.sol }),
      });
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
    const spyPx = Number(pair?.spyxUsd || data?.spyxUsd || 0);
    if (!(solPx > 0 && spyPx > 0)) return;
    liveLock.current = true;
    const outMint = spyxMint();
    (async () => {
      try {
        const tpk = tradingPubkey();
        const slip = auto?.slippageBps || 50;
        async function swap(inputMint: string, outputMint: string, amount: number) {
          const r = await fetch("/api/pair/swap", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ owner, tradingPubkey: tpk, inputMint, outputMint, amount, slippageBps: slip }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || "swap build failed");
          return signAndSendSwap(j.transaction);
        }
        let sig = "";
        if (intent.action === "sell_sol" || (intent.action === "rebalance" && intent.from === "SOL")) {
          sig = await swap(SOL_MINT, outMint, intent.clipUsd / solPx);
        } else if (intent.action === "sell_spyx" || (intent.action === "rebalance" && intent.from === "SPYx")) {
          sig = await swap(outMint, SOL_MINT, intent.clipUsd / spyPx);
        } else if (intent.action === "deploy") {
          const solPct = intent.solPct ?? 0.5;
          const usdcSol = intent.clipUsd * solPct;
          const usdcSpy = intent.clipUsd - usdcSol;
          sig = await swap(USDC_MINT, SOL_MINT, usdcSol);
          if (usdcSpy > 1) await swap(USDC_MINT, outMint, usdcSpy);
        } else if (intent.action === "flatten") {
          const h = paper?.pair;
          if (h?.solQty > 0.001) sig = await swap(SOL_MINT, USDC_MINT, h.solQty);
          if (h?.spyxQty > 0.0001) sig = await swap(outMint, USDC_MINT, h.spyxQty);
        }
        if (sig) {
          const r = await fetch("/api/auto", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ owner, liveFill: { signature: sig } }),
          });
          const j = await r.json();
          setPaper(j.paper);
          setMsg(`Live fill · ${sig.slice(0, 16)}…`);
        }
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "live swap failed");
      } finally {
        liveLock.current = false;
      }
    })();
  }, [liveTrading, auto?.mode, auto?.slippageBps, armed, owner, paper?.pendingIntent, pair?.solUsd, pair?.spyxUsd, data?.solUsd, data?.spyxUsd]);

  async function patch(partial: Record<string, unknown>) {
    if (!owner) return setMsg("Connect Phantom or Solflare first.");
    const r = await fetch("/api/auto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, auto: partial }),
    });
    const j = await r.json();
    setAuto(j.auto);
    setPaper(j.paper);
  }

  function patchSoon(partial: Record<string, unknown>) {
    setAuto((prev) => ({ ...(prev || {}), ...partial }));
    if (!owner) {
      setMsg("Connect a wallet to save this.");
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => patch(partial), 350);
  }

  async function kill() {
    if (!owner) return setMsg("Connect first.");
    setBusy(true);
    try {
      const r = await fetch("/api/auto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, kill: true }),
      });
      const j = await r.json();
      setAuto(j.auto);
      setPaper(j.paper);
      setMsg("Kill switch. Flattened to USDC. Halted.");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deposit() {
    const provider = pickProvider();
    if (!provider || !owner) return setMsg("Open this page inside Phantom or Solflare.");
    setBusy(true);
    try {
      const tpk = tradingPubkey();
      const tx = await buildTransfer(owner, tpk, solAmt);
      const sent = await provider.signAndSendTransaction(tx);
      setMsg(`Deposited ${solAmt} SOL · ${String(sent.signature || sent).slice(0, 16)}…`);
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
  const fills = book?.fills || [];
  const tape = book?.tape || [];
  const pnlPct = book ? book.pnlPct : 0;
  const pnlUsd = book ? book.equityUsd - book.startingUsd : 0;
  const uptime = armed && auto?.armedAt ? fmtDur(now - auto.armedAt) : "—";
  const status = !owner ? "PREVIEW" : book?.killed ? "KILLED" : armed ? (live ? "RUNNING" : "ARMED") : "IDLE";
  const halted = book?.haltReason && (book.haltedUntil || 0) > Date.now();
  const solQty = book?.pair?.solQty ?? pair?.solQty ?? 0;
  const spyxQty = book?.pair?.spyxQty ?? pair?.spyxQty ?? 0;
  const usdcQty = book?.pair?.usdcQty ?? pair?.usdcQty ?? book?.cashUsd ?? 0;
  const solUsd = pair?.solUsd || 0;
  const spyxUsd = pair?.spyxUsd || 0;
  const ratio = pair?.ratio || (spyxUsd ? solUsd / spyxUsd : 0);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-2 md:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOL ↔ SPYx · PAPER FIRST · SPOT ONLY</p>
          <h1 className="mt-1 font-display text-3xl leading-none text-ghost sm:text-4xl md:text-6xl">Operate</h1>
          <p className="mt-3 max-w-xl text-base text-mute sm:text-lg">
            Connect. Fund SOL. Set a few knobs. She trades official tokenized S&P 500 against SOL — or she sits.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <WalletConnect />
          <button
            type="button"
            onClick={() => patch({ armed: !armed })}
            className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-8 py-3 text-base sm:min-h-[56px] sm:w-auto sm:text-lg ${
              armed ? "btn-ghost" : "btn-acid"
            }`}
          >
            {armed ? "STOP" : "RUN"}
          </button>
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

      <div className="mt-5 rounded-2xl border border-blood/40 bg-blood/10 p-4 text-sm leading-relaxed text-ghost">
        Tokenized SPY (xStocks / Backed). Issuer and custody risk. Not 1:1 with the NYSE print after hours or on
        weekends. You can lose SOL. Spot only — no leverage. Keys stay on this device.
      </div>

      {!owner && (
        <div className="panel mt-5 rounded-2xl border-cyan/30 p-4">
          <div className="font-mono text-[11px] tracking-[0.2em] text-cyan">PREVIEW MODE</div>
          <p className="mt-1 text-base text-mute">
            Connect Phantom or Solflare. Optional dedicated trading wallet you own. Deposit SOL. Paper is the default.
          </p>
        </div>
      )}

      <section className="panel mt-5 rounded-3xl p-5 md:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[11px] tracking-[0.22em] text-violet">DASHBOARD</div>
            <h2 className="mt-1 font-display text-3xl text-ghost md:text-4xl">Balances · ratio · PnL</h2>
          </div>
          <div className="font-mono text-[12px] text-mute">
            {status} {armed ? "· scanning" : live ? "· oracles ticking" : ""} · {uptime}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Huge k="SOL" v={solQty ? solQty.toFixed(4) : "0"} sub={solUsd ? money(solQty * solUsd) : "sleeve"} />
          <Huge k="SPYx" v={spyxQty ? spyxQty.toFixed(4) : "0"} sub={spyxUsd ? money(spyxQty * spyxUsd) : "official mint"} />
          <Huge
            k="Ratio"
            v={ratio ? ratio.toFixed(4) : "—"}
            sub={pair ? `z7 ${Number(pair.z7 || 0).toFixed(2)} · ${pair.session}` : "P_SOL / P_SPYx"}
          />
          <Huge
            k="PnL"
            v={`${pnlPct >= 0 ? "+" : ""}${(pnlPct * 100).toFixed(1)}%`}
            sub={`${pnlUsd >= 0 ? "+" : "−"}$${Math.abs(pnlUsd).toFixed(2)} in USDC`}
            good={Math.abs(pnlPct) < 0.0005 ? undefined : pnlPct >= 0}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini k="USDC cash" v={money(usdcQty)} />
          <Mini k="Equity" v={book ? money(book.equityUsd) : "—"} />
          <Mini k="Skipped" v={String(book?.skipped ?? pair?.skipped ?? 0)} />
          <Mini k="Wallet SOL" v={`${bal.toFixed(3)}`} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-mute">
          {(owner && book?.lastAction) || pair?.reason || book?.lastAction || "Waiting on oracles…"}
        </p>
        {book?.pendingIntent && (
          <p className="mt-2 font-mono text-sm text-acid">Live intent waiting for your trading wallet to sign.</p>
        )}
        {pair && (
          <p className="mt-1 font-mono text-[11px] text-mute">
            SOL ${Number(solUsd).toFixed(2)} ({pair.oracle?.sol}) · SPYx ${Number(spyxUsd).toFixed(2)} ({pair.oracle?.spyx})
            · liq ${Math.round(pair.liquidityUsd || 0).toLocaleString()} · band ±{Number(pair.bandK || 0).toFixed(2)}σ
          </p>
        )}

        <div className="mt-6 border-t border-violet/20 pt-5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">
            TRADING WALLET · {tradePk ? `${tradePk.slice(0, 4)}…${tradePk.slice(-4)}` : "connect first"} · keys never with
            us
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
              Deposit {solAmt} SOL
            </button>
            <button
              disabled={busy || bal < 0.01 || armed}
              onClick={withdraw}
              className="btn-ghost min-h-[48px] rounded-full py-3 font-mono text-[12px] disabled:opacity-40"
            >
              {armed ? "Stop to withdraw" : "Withdraw"}
            </button>
          </div>
          <p className="mt-3 text-sm text-mute">
            Keep gas in SOL. Working capital marks in USDC. On stop or kill she flattens both sleeves to USDC.
          </p>
        </div>
      </section>

      {halted && <p className="mt-3 font-mono text-sm text-blood">{book.haltReason}</p>}
      {msg && <p className="mt-3 font-mono text-sm text-acid">{msg}</p>}

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div className="panel space-y-5 rounded-2xl p-5">
            <div>
              <div className="font-mono text-[10px] tracking-[0.22em] text-violet">PARAMETERS</div>
              <h3 className="mt-1 font-display text-2xl text-ghost">Few knobs. Spot only.</h3>
            </div>
            <Slider
              label="Allocation"
              hint="Max share of the trading wallet she may use. Rest sits as gas / reserve."
              min={0.2}
              max={0.8}
              step={0.05}
              value={auto?.allocationPct ?? 0.5}
              format={(n) => `${Math.round(n * 100)}%`}
              onChange={(n) => patchSoon({ allocationPct: n })}
            />
            <div>
              <div className="mb-2 font-mono text-[11px] text-mute">Style</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["mean_revert", "Mean-revert"],
                    ["hold_mix", "Hold mix"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patchSoon({ style: id })}
                    className={`min-h-[44px] rounded-full font-mono text-[12px] ${(auto?.style || "mean_revert") === id ? "btn-on" : "btn-ghost"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-mono text-[11px] text-mute">Band</div>
              <div className="grid grid-cols-3 gap-2">
                {(["tight", "normal", "wide"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patchSoon({ band: id })}
                    className={`min-h-[44px] rounded-full font-mono text-[12px] ${(auto?.band || "normal") === id ? "btn-on" : "btn-ghost"}`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
            {(auto?.style || "mean_revert") === "hold_mix" && (
              <Slider
                label="Target SOL mix"
                hint="The rest is SPYx. She clips back when drift exceeds the band."
                min={0.2}
                max={0.8}
                step={0.05}
                value={auto?.targetSolPct ?? 0.5}
                format={(n) => `${Math.round(n * 100)}% SOL`}
                onChange={(n) => patchSoon({ targetSolPct: n })}
              />
            )}
            <Slider
              label="Clip size"
              hint="Percent of allocated stack per trade."
              min={0.05}
              max={0.3}
              step={0.01}
              value={auto?.clipPct ?? 0.15}
              format={(n) => `${Math.round(n * 100)}%`}
              onChange={(n) => patchSoon({ clipPct: n })}
            />
            <Slider
              label="Cooldown"
              hint="Minimum minutes between live clips. Paper respects it too."
              min={0}
              max={120}
              step={5}
              value={auto?.cooldownMin ?? 15}
              format={(n) => `${Math.round(n)}m`}
              onChange={(n) => patchSoon({ cooldownMin: n })}
            />
            <Slider
              label="Stop"
              hint="Max drawdown on allocated stack. Then flatten to USDC."
              min={0.03}
              max={0.2}
              step={0.01}
              value={auto?.stopPct ?? 0.08}
              format={(n) => `−${Math.round(n * 100)}%`}
              onChange={(n) => patchSoon({ stopPct: n })}
            />
            <Slider
              label="Take-profit / rebalance"
              hint="Lock gains back toward a 50/50 mix."
              min={0.04}
              max={0.3}
              step={0.01}
              value={auto?.takeProfitPct ?? 0.12}
              format={(n) => `+${Math.round(n * 100)}%`}
              onChange={(n) => patchSoon({ takeProfitPct: n })}
            />
            <Slider
              label="Slippage cap"
              hint="Jupiter quote over this is skipped."
              min={10}
              max={100}
              step={5}
              value={auto?.slippageBps ?? 50}
              format={(n) => `${n} bps`}
              onChange={(n) => patchSoon({ slippageBps: n })}
            />
            <Slider
              label="Max price impact"
              hint="If the route moves the book more than this, she skips."
              min={0.001}
              max={0.015}
              step={0.001}
              value={auto?.maxImpactPct ?? 0.004}
              format={(n) => `${(n * 100).toFixed(2)}%`}
              onChange={(n) => patchSoon({ maxImpactPct: n })}
            />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] text-mute">Paper / Live</div>
                <p className="text-sm text-mute">Live stays off until the flag is on. You sign every live swap.</p>
              </div>
              <button
                type="button"
                disabled={!liveTrading}
                onClick={() => patchSoon({ mode: auto?.mode === "live" ? "paper" : "live" })}
                className={`min-h-[44px] rounded-full px-5 font-mono text-[12px] ${
                  auto?.mode === "live" ? "btn-on" : "btn-ghost"
                } disabled:opacity-40`}
              >
                {liveTrading ? (auto?.mode === "live" ? "LIVE" : "PAPER") : "PAPER"}
              </button>
            </div>
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-mute">Leverage</span>
              <span className="text-mute">spot only — perps later</span>
            </div>
          </div>

          {pair?.knowledge && (
            <div className="panel rounded-2xl p-5">
              <div className="font-mono text-[10px] tracking-[0.22em] text-violet">WHAT SHE STUDIED</div>
              <p className="mt-2 text-sm leading-relaxed text-mute">{pair.knowledge.note}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Mini k="SOL range" v={`${(pair.knowledge.solMedianDailyRangePct * 100).toFixed(1)}%`} />
                <Mini k="SPY range" v={`${(pair.knowledge.spyMedianDailyRangePct * 100).toFixed(1)}%`} />
                <Mini k="15m ATR" v={`${(pair.knowledge.solAtr15mPct * 100).toFixed(2)}%`} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel rounded-2xl p-5">
            <div className="font-mono text-[10px] tracking-[0.22em] text-violet">TAPE · TRADE / SKIP / REASON</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">{armed ? "Watching the ratio" : "Preview tape"}</h2>
            <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {tape.length === 0 &&
                fills.slice(0, 12).map((f: any) => (
                  <TapeRow
                    key={f.id}
                    action={f.side}
                    reason={f.reason}
                    at={f.at}
                    extra={money(f.sizeUsd)}
                  />
                ))}
              {tape.map((row: any) => (
                <TapeRow
                  key={row.id}
                  action={row.action}
                  reason={row.reason}
                  at={row.at}
                  extra={row.sizeUsd ? money(row.sizeUsd) : row.z != null ? `z ${Number(row.z).toFixed(2)}` : ""}
                />
              ))}
              {!tape.length && !fills.length && (
                <p className="text-sm text-mute">{loading ? "Loading…" : "No decisions yet. Run her in paper."}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
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
        <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${tone}`}>{action}</span>
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

function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-end justify-between gap-3">
        <span className="font-mono text-[11px] text-mute">{label}</span>
        <span className="font-display text-xl text-acid">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[#14f195]"
      />
      <p className="mt-1 text-sm text-mute">{hint}</p>
    </label>
  );
}
