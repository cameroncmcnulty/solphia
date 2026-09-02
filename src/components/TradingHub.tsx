"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadOwner, saveOwner, tradingPubkey, buildTransfer, withdrawToOwner } from "@/lib/wallet/trading";
import { ConfigDesk, type ConfigShape } from "./ConfigDesk";
import { WalletConnect } from "./WalletConnect";
import { useMarket, useOwner } from "@/lib/hooks";

function pickProvider() {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.phantom?.solana || w.solflare || w.solana || null;
}

function cfgFrom(a: any): ConfigShape {
  return {
    maxSolPerTrade: a?.maxSolPerTrade ?? 0.25,
    minScore: a?.minScore ?? 70,
    takeProfitPct: a?.takeProfitPct ?? 0.32,
    stopLossPct: a?.stopLossPct ?? 0.16,
    maxDevHoldPct: a?.maxDevHoldPct ?? 15,
    autoSell: a?.autoSell !== false,
    copy: a?.copy !== false,
    picks: Boolean(a?.picks),
    launch: Boolean(a?.launch),
    migrate: a?.migrate !== false,
    solUsd: Boolean(a?.solUsd),
  };
}

function money(n: number) {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
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

function age(createdAt: number) {
  const s = Math.max(0, (Date.now() - createdAt) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function mcap(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export function TradingHub() {
  const connected = useOwner();
  const owner = connected || loadOwner();
  const { data, err, loading, refresh } = useMarket(8000);
  const [auto, setAuto] = useState<any>(null);
  const [paper, setPaper] = useState<any>(null);
  const [lab, setLab] = useState<any>(null);
  const [mind, setMind] = useState<any>(null);
  const [liveTrading, setLiveTrading] = useState(false);
  const [tradePk, setTradePk] = useState("");
  const [bal, setBal] = useState(0);
  const [solAmt, setSolAmt] = useState(0.5);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "likes" | "book">("all");
  const [now, setNow] = useState(Date.now());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demoPaper = data?.paper;
  const book = paper || demoPaper;
  const labData = lab || data?.lab;
  const mindData = mind || data?.mind;
  const sol = data?.sol;
  const armed = Boolean(auto?.armed);

  async function refreshAuto(pk = owner) {
    if (!pk) return;
    const a = await fetch(`/api/auto?owner=${pk}`).then((r) => r.json());
    setAuto(a.auto);
    setPaper(a.paper);
    setLab(a.lab);
    setMind(a.mind);
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
    if (j.lab) setLab(j.lab);
    if (j.mind) setMind(j.mind);
  }

  function patchSoon(partial: Record<string, unknown>) {
    setAuto((prev: any) => ({ ...(prev || cfgFrom(null)), ...partial }));
    if (!owner) {
      setMsg("Connect a wallet to save this.");
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => patch(partial), 350);
  }

  async function deposit() {
    const provider = pickProvider();
    if (!provider || !owner) return setMsg("Open this page inside Phantom.");
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

  async function sell(mint: string) {
    if (!owner) return;
    const r = await fetch("/api/auto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, sellMint: mint }),
    });
    const j = await r.json();
    setPaper(j.paper);
    setAuto(j.auto);
    setMsg("Sold (paper).");
    refresh();
  }

  const tokens = data?.tokens || [];
  const openMints = new Set((book?.positions || []).map((p: any) => p.mint));
  const rows = useMemo(() => {
    if (filter === "book") return [];
    if (filter === "likes") return tokens.filter((r: any) => r.report?.verdict === "trade");
    return tokens;
  }, [tokens, filter]);

  const refused = labData
    ? (labData.copy?.denied || 0) +
      (labData.launch?.denied || 0) +
      (labData.migrate?.denied || 0) +
      (labData.pick?.denied || 0)
    : 0;
  const live = Boolean(data?.lastTickAt) && Date.now() - data.lastTickAt < 45_000;
  const fills = book?.fills || [];
  const volume = fills.reduce((s: number, f: any) => s + (Number(f.sizeUsd) || 0), 0);
  const closed = book?.trades ?? (book?.winCount || 0) + (book?.lossCount || 0);
  const pnlPct = book ? book.pnlPct : 0;
  const pnlUsd = book ? book.equityUsd - book.startingUsd : 0;
  const uptime = armed && auto?.armedAt ? fmtDur(now - auto.armedAt) : "—";
  const status = !owner ? "PREVIEW" : armed ? (live ? "LIVE" : "ARMED") : "IDLE";
  const halted = book?.haltReason && (book.haltedUntil || 0) > Date.now();

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-2 md:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">TRADING HUB · PAPER FIRST</p>
          <h1 className="mt-1 font-display text-3xl leading-none text-ghost sm:text-4xl md:text-6xl">Operate the bot</h1>
          <p className="mt-3 max-w-xl text-base text-mute sm:text-lg">
            Connect. Set the rails. Launch. She still skips more than she buys.
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
            {armed ? "STOP BOT" : "LAUNCH BOT"}
          </button>
        </div>
      </header>

      {!owner && (
        <div className="panel mt-5 rounded-2xl border-cyan/30 p-4">
          <div className="font-mono text-[11px] tracking-[0.2em] text-cyan">PREVIEW MODE</div>
          <p className="mt-1 text-base text-mute">
            Connect Phantom or Solflare to save config, fund the trading wallet, and start paper fills. The tape below
            is live either way.
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
        <Stat k="Status" v={status} sub={armed ? "scanning" : live ? "feeds ticking" : "waiting"} live={armed || live} />
        <Stat k="Closed" v={String(closed)} sub={`${book?.winCount || 0}W / ${book?.lossCount || 0}L`} />
        <Stat k="Volume" v={money(volume)} sub="filled notional" />
        <Stat k="Uptime" v={uptime} sub={armed ? "this session" : "start to run"} />
        <Stat
          k="PnL"
          v={`${pnlPct >= 0 ? "+" : ""}${(pnlPct * 100).toFixed(1)}%`}
          sub={`${pnlUsd >= 0 ? "+" : "−"}$${Math.abs(pnlUsd).toFixed(0)} after fees`}
          good={pnlPct >= 0}
        />
        <Stat k="Refused" v={String(refused)} sub={`${tokens.length} on tape`} />
      </div>

      {halted && <p className="mt-3 font-mono text-sm text-blood">{book.haltReason}</p>}
      {armed && !liveTrading && (
        <p className="mt-3 font-mono text-sm text-acid">Paper running. Live trading is off until a desk stays green.</p>
      )}

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)]">
        <div className="space-y-4">
          <ConfigDesk value={cfgFrom(auto)} onChange={patchSoon} layout="stack" />

          <div className="panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-mute">TRADING WALLET</div>
                <div className="mt-1 break-all font-mono text-xs text-acid">{tradePk || "Connect to mint a key on this device."}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] text-mute">BALANCE</div>
                <div className="font-display text-2xl text-ghost">{bal.toFixed(3)} SOL</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-mute">
              Keys stay in this browser. She never sees a seed. Deposit only what you can lose.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
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
                className="btn-acid rounded-full py-3 font-mono text-[12px] disabled:opacity-40"
              >
                Deposit
              </button>
              <button
                disabled={busy || bal < 0.01}
                onClick={withdraw}
                className="btn-ghost rounded-full py-3 font-mono text-[12px] disabled:opacity-40"
              >
                Withdraw
              </button>
            </div>
          </div>

          {sol && (
            <div className="panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.22em] text-violet">SOL / USDT · SPOT</div>
                  <div className="mt-1 font-display text-3xl text-ghost">${Number(sol.price || 0).toFixed(2)}</div>
                </div>
                <div
                  className={`rounded-full px-3 py-1 font-mono text-[11px] ${
                    sol.signal === "wait" ? "btn-ghost" : "btn-on"
                  }`}
                >
                  {String(sol.signal || "wait").toUpperCase()}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-mute">{sol.reason}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini k="15m RSI" v={sol.rsi15 != null ? Number(sol.rsi15).toFixed(0) : "—"} />
                <Mini k="15m ATR" v={sol.atrPct != null ? `${(Number(sol.atrPct) * 100).toFixed(2)}%` : "—"} />
                <Mini k="1h bias" v={sol.emaBias1h || "—"} />
                <Mini k="Today" v={`${((sol.dailyPnlPct || 0) * 100).toFixed(2)}%`} />
              </div>
              {sol.stopPct != null && sol.tpPct != null && (
                <p className="mt-3 font-mono text-[11px] text-acid">
                  Stop {(Number(sol.stopPct) * 100).toFixed(2)}% · TP {(Number(sol.tpPct) * 100).toFixed(2)}% · R:R{" "}
                  {Number(sol.rrAfterCost || 0).toFixed(1)} after fees
                </p>
              )}
              <p className="mt-2 font-mono text-[11px] text-mute">
                Turn the SOL / USDT desk on to let her paper-trade. Stop ≥ 0.5%. First target 2R after 9 bps a side. Daily
                goal 0.5%. Spot only — no leverage.
              </p>
            </div>
          )}

          {mindData && (
            <div className="panel rounded-2xl p-5">
              <div className="font-mono text-[10px] tracking-[0.22em] text-violet">SOLPHIA MIND</div>
              <p className="mt-2 text-base text-mute">
                Bars only move up after losses. Picks need Telegram, P(grad) ≥ 62%, and learned P(pay) ≥{" "}
                {((mindData.pickThreshold || 0) * 100).toFixed(0)}%.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Mini k="Studied" v={String(mindData.studied || 0)} />
                <Mini k="Closed" v={String(mindData.closed || 0)} />
                <Mini k="Pick bar" v={`${Math.round((mindData.pickThreshold || 0) * 100)}%`} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel rounded-2xl p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-violet">LIVE MONITORING</div>
                <h2 className="mt-1 font-display text-2xl text-ghost md:text-3xl">
                  {armed ? "Scanning the tape" : "Waiting to launch"}
                </h2>
                <p className="mt-1 text-base text-mute">
                  {loading
                    ? "Loading the tape…"
                    : armed
                      ? "Scout finds a setup. Risk has to agree. Most names she skips."
                      : "Preview of what she sees. Launch the bot to let her paper-trade takes."}
                </p>
              </div>
              <Link href="/terminal" className="font-mono text-[12px] text-violet">
                Full tape →
              </Link>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(
                [
                  ["all", "All"],
                  ["likes", "She likes"],
                  ["book", "Positions"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`shrink-0 rounded-full px-4 py-2 font-mono text-[12px] ${
                    filter === id ? "btn-on" : "btn-ghost"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {filter === "book" ? (
                <Book positions={book?.positions || []} onSell={owner ? sell : undefined} />
              ) : rows.length === 0 ? (
                <div className="rounded-xl border border-violet/20 px-4 py-10 text-center">
                  <p className="font-display text-xl text-ghost">
                    {armed ? "Searching for names…" : "Waiting on the market"}
                  </p>
                  <p className="mt-2 text-base text-mute">
                    {filter === "likes" ? "Empty likes is the point. She is picky." : "Pump.fun / LaunchLab / copy flow."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.slice(0, 24).map((row: any) => (
                    <MonitorRow key={row.token?.mint || row.mint} row={row} held={openMints.has(row.token?.mint)} armed={armed} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {filter !== "book" && (book?.positions || []).length > 0 && (
            <div className="panel rounded-2xl p-5">
              <div className="mb-3 font-mono text-[10px] tracking-[0.2em] text-mute">OPEN POSITIONS</div>
              <Book positions={book.positions} onSell={owner ? sell : undefined} />
            </div>
          )}

          {(book?.fills || []).length > 0 && (
            <div className="panel rounded-2xl p-5">
              <div className="mb-3 font-mono text-[10px] tracking-[0.2em] text-mute">RECENT FILLS</div>
              <div className="space-y-2">
                {fills.slice(0, 14).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 text-base">
                    <span className={f.side === "buy" ? "text-acid" : "text-blood"}>
                      {f.side === "buy" ? "Buy" : "Sell"}
                    </span>
                    <span className="min-w-0 truncate text-ghost">{f.symbol}</span>
                    <span className="font-mono text-[12px] text-mute">{age(f.at)}</span>
                    <span className={f.pnlUsd == null ? "text-mute" : f.pnlUsd >= 0 ? "text-acid" : "text-blood"}>
                      {f.pnlUsd == null ? money(f.sizeUsd) : `${f.pnlUsd >= 0 ? "+" : ""}${Number(f.pnlUsd).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {err && <p className="mt-4 text-base text-blood">Couldn’t load the tape. Pull to refresh.</p>}
      {msg && <p className="mt-4 font-mono text-sm text-acid">{msg}</p>}
    </main>
  );
}

function Stat({
  k,
  v,
  sub,
  live,
  good,
}: {
  k: string;
  v: string;
  sub: string;
  live?: boolean;
  good?: boolean;
}) {
  return (
    <div className="panel min-w-[46%] shrink-0 rounded-2xl p-4 sm:min-w-0">
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-mute">
        {live != null && (
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-acid shadow-[0_0_10px_#14F195]" : "bg-mute"}`} />
        )}
        {k}
      </div>
      <div className={`mt-1 truncate font-display text-2xl ${good === false ? "text-blood" : "text-acid"}`}>{v}</div>
      <div className="truncate font-mono text-[11px] text-mute">{sub}</div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-violet/15 p-3">
      <div className="font-mono text-[9px] tracking-[0.18em] text-mute">{k}</div>
      <div className="font-display text-xl text-acid">{v}</div>
    </div>
  );
}

function MonitorRow({ row, held, armed }: { row: any; held: boolean; armed: boolean }) {
  const t = row.token || row;
  const r = row.report || { score: 0, verdict: "skip", why: "" };
  const take = r.verdict === "trade" && !r.vetoed;
  const why = String(r.why || r.summary || "").replace(/^Skip — |^Wait — |^Take it — /, "");
  return (
    <div className="rounded-xl border border-violet/15 p-3">
      <div className="flex items-start gap-3">
        {t.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-full bg-line" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg text-ghost">{t.symbol}</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] ${
                take ? "bg-acid/15 text-acid" : r.verdict === "wait" ? "text-cyan" : "text-blood"
              }`}
            >
              {take ? "TAKE" : r.verdict === "wait" ? "WAIT" : "SKIP"}
            </span>
            <span className="font-mono text-[11px] text-mute">
              {age(t.createdAt)} · {mcap(t.marketCapUsd)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-mute">{why || "No read yet."}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg text-ghost">{r.score}</div>
          {r.pGrad != null && <div className="font-mono text-[11px] text-mute">{Math.round(r.pGrad * 100)}%</div>}
        </div>
      </div>
      <div className="mt-2 font-mono text-[11px] text-mute">
        {held ? "In the book" : take && armed ? "Queued if Scout + Risk agree" : take ? "Launch the bot to take this" : "She passed"}
      </div>
    </div>
  );
}

function Book({ positions, onSell }: { positions: any[]; onSell?: (mint: string) => void }) {
  if (!positions.length) {
    return <p className="py-6 text-center text-base text-mute">No open coins. That’s fine.</p>;
  }
  return (
    <div className="space-y-2">
      {positions.map((p: any) => (
        <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-violet/15 p-3">
          <div>
            <div className="font-display text-lg text-ghost">{p.symbol}</div>
            <div className={`font-mono text-[12px] ${p.unrealizedUsd >= 0 ? "text-acid" : "text-blood"}`}>
              {p.unrealizedUsd >= 0 ? "+" : ""}
              ${Number(p.unrealizedUsd || 0).toFixed(2)}
            </div>
          </div>
          {onSell && (
            <button
              type="button"
              onClick={() => onSell(p.mint)}
              className="btn-ghost min-h-[44px] rounded-full px-4 font-mono text-[11px]"
            >
              Sell
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
