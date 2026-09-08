"use client";

import { useEffect, useState } from "react";
import type { AdminDesk } from "@/lib/admin/types";
import { WalletConnect } from "@/components/WalletConnect";
import { EquityCurve } from "@/components/EquityCurve";
import { useOwner } from "@/lib/hooks";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<AdminDesk | null>(null);
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [streamOn, setStreamOn] = useState(false);
  const [note, setNote] = useState("");
  const [adminPk, setAdminPk] = useState("");
  const [treasuryPk, setTreasuryPk] = useState("");
  const [ownerPk, setOwnerPk] = useState("");
  const [copied, setCopied] = useState("");
  const [saved, setSaved] = useState("");
  const [hint, setHint] = useState("");
  const [pnlWin, setPnlWin] = useState<"h24" | "d7" | "d30">("h24");
  const [btLev, setBtLev] = useState<1 | 2 | 3>(1);
  const owner = useOwner();

  async function login() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!r.ok) {
        setErr("Wrong password.");
        return;
      }
      await reload();
      setAuthed(true);
    } catch {
      setErr("Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    const dash = await fetch("/api/admin");
    if (!dash.ok) {
      setAuthed(false);
      setData(null);
      throw new Error("denied");
    }
    const next = (await dash.json()) as AdminDesk;
    setData((prev) => mergeDesk(prev, next));
    setTreasuryPk(next.treasury || "");
    setOwnerPk(next.ownerWallet || "");
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setData(null);
    setSecret("");
  }

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setNote(j.error || "failed");
        if (j.desk) setData(j.desk);
        return;
      }
      if (j.desk) setData(j.desk as AdminDesk);
      if (j.note) setNote(j.note);
      else if (j.made != null) setNote(j.made ? `Made ${j.made} new post${j.made === 1 ? "" : "s"}.` : "Pack already ran today.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    let live = false;
    const es = new EventSource("/api/admin/stream");
    es.onmessage = (e) => {
      try {
        const next = JSON.parse(e.data) as AdminDesk;
        setData((prev) => mergeDesk(prev, next));
        live = true;
        setStreamOn(true);
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      live = false;
      setStreamOn(false);
    };
    const poll = setInterval(() => {
      if (live) return;
      reload().catch(() => setAuthed(false));
    }, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      es.close();
    };
  }, [authed]);

  useEffect(() => {
    if (owner && !adminPk) setAdminPk(owner);
  }, [owner, adminPk]);

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-5 py-20">
        <h1 className="font-display text-4xl text-ghost">Login</h1>
        <p className="mt-2 text-sm text-mute">Admin only.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-sm outline-none"
          />
          <button type="submit" disabled={busy || !secret} className="btn-acid w-full rounded-full py-3 text-sm disabled:opacity-40">
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        {err && <p className="mt-3 text-sm text-blood">{err}</p>}
      </main>
    );
  }

  const p = data.paper;
  const pair = data.pair;
  const ops = data.ops;
  const ticking = data.lastTickAt > 0 && now - data.lastTickAt < 60_000;
  const tickAge = data.lastTickAt ? age(now - data.lastTickAt) : "never";
  const session =
    pair?.session === "cash" ? "cash" : pair?.session === "weekend" ? "weekend" : pair?.session === "after_hours" ? "after hours" : "—";
  const tape = p.tape || [];
  const shownBt =
    (btLev === 3 ? data.backtestLev3 : btLev === 2 ? data.backtestLev2 : data.backtest) || data.backtest;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-2 md:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">OPS · STREAM {streamOn ? "ON" : "POLL"}</p>
          <h1 className="mt-1 font-display text-4xl text-ghost md:text-5xl">Admin</h1>
          <p className="mt-2 max-w-xl text-sm text-mute">
            Holdings, wallets, volume, rails, and a daily post pack. Login stays password-only.
            {data.durable
              ? " State is on a durable store — treasury and seats survive deploys."
              : " Vercel /tmp wipes on every cold start. Add Upstash Redis (Storage tab) so saves stick."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${streamOn || ticking ? "bg-acid shadow-[0_0_10px_#14F195]" : "bg-mute"}`} />
          <span className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${p.killed ? "bg-blood/20 text-blood" : "bg-acid/15 text-acid"}`}>
            {p.killed ? "STOPPED" : "PAPER"}
          </span>
          <button
            type="button"
            onClick={() => patch({ liveTrading: !data.liveTrading })}
            disabled={busy}
            className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${data.liveTrading ? "bg-cyan/15 text-cyan" : "border border-line text-mute"}`}
          >
            {data.liveTrading ? "LIVE ON" : "LIVE OFF"}
          </button>
          <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-cyan">
            {ticking ? "tick live" : "tick stale"} · {tickAge}
          </span>
          <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-mute">{session}</span>
          <button
            type="button"
            onClick={() => {
              if (!confirm("Restart the paper session? Open paper books go back to USDC. Live books are left alone.")) return;
              patch({ resetPaper: true });
            }}
            disabled={busy}
            className="rounded-full border border-blood/40 px-4 py-2 text-xs text-blood"
          >
            Reset paper session
          </button>
          <button type="button" onClick={() => reload()} disabled={busy} className="btn-ghost rounded-full px-4 py-2 text-xs">
            Refresh
          </button>
          <button type="button" onClick={logout} className="rounded-full border border-line px-4 py-2 text-xs text-mute">
            Log out
          </button>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
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
        <Stat k="Volume" v={money((pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24).volumeUsd)} sub={`${(pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24).trades} clips`} />
        <Stat
          k={pnlWin === "d30" ? "Month PnL" : pnlWin === "d7" ? "7d PnL" : "24h PnL"}
          v={`${(pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24).pnlUsd >= 0 ? "+" : "−"}${money(Math.abs((pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24).pnlUsd))}`}
          sub={p.startedAt ? `session ${age(now - p.startedAt)}` : "session"}
          good={Math.abs((pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24).pnlUsd) < 0.01 ? undefined : (pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24).pnlUsd >= 0}
        />
        <Stat k="Fees" v={money((pnlWin === "d30" ? ops.d30 : pnlWin === "d7" ? ops.d7 : ops.h24).feesUsd)} sub={pnlWin === "d30" ? "30d" : pnlWin === "d7" ? "7d" : "24h"} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini k="24h fees" v={money(ops.h24.feesUsd)} />
        <Mini k="7d fees" v={money(ops.d7.feesUsd)} />
        <Mini k="24h trades" v={String(ops.h24.trades)} />
        <Mini k="7d trades" v={String(ops.d7.trades)} />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ADMIN WALLET · FREE SEAT</div>
          <p className="mt-2 text-sm text-mute">Connect the Phantom you trade with. That address skips the {data.seatSol} / {data.seatSolLev} SOL seat. Keys stay in the wallet.</p>
          <div className="mt-3">
            <WalletConnect />
          </div>
          <input
            value={adminPk}
            onChange={(e) => setAdminPk(e.target.value.trim())}
            placeholder="Solana address"
            className="mt-3 w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-xs outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !adminPk} onClick={() => patch({ adminWallet: adminPk })} className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40">
              Save admin wallet
            </button>
            {owner && (
              <button type="button" disabled={busy} onClick={() => patch({ adminWallet: owner })} className="btn-ghost rounded-full px-5 py-2 text-sm">
                Use connected
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {(data.adminWallets || []).length === 0 && <p className="font-mono text-[11px] text-mute">None set.</p>}
            {(data.adminWallets || []).map((w) => (
              <div key={w} className="flex items-center justify-between gap-2 font-mono text-[11px]">
                <span className="text-ghost">{shortPk(w, 6)}</span>
                <button type="button" className="text-blood" onClick={() => patch({ removeAdminWallet: w })}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">TREASURY · PAYMENTS IN</div>
          <p className="mt-2 text-sm text-mute">
            {data.seatSol} SOL (spot) and {data.seatSolLev} SOL (2×/3×) seats plus 0.1% clip fees land here. Default is
            the founder treasury. Save another address to override it.
          </p>
          <input
            value={treasuryPk}
            onChange={(e) => setTreasuryPk(e.target.value.trim())}
            placeholder="Treasury Solana address"
            className="mt-3 w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-xs outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => patch({ treasuryWallet: treasuryPk || null })}
              className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
            >
              Save treasury
            </button>
            <button type="button" disabled={busy} onClick={() => patch({ treasuryWallet: null })} className="btn-ghost rounded-full px-5 py-2 text-sm">
              Clear to env
            </button>
          </div>
          <p className="mt-3 font-mono text-[11px] text-mute">
            {data.treasurySet ? `Active ${shortPk(data.treasury, 6)}` : "No treasury — seats stay paper."}
            {data.durable
              ? ` · saves on ${data.durableKind}`
              : " · ephemeral disk — add Upstash Redis on Vercel or saves reset"}
          </p>
        </div>
      </section>

      <section className="panel mt-6 rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">OWNER EARNINGS · 25% OF LAUNCH SWAPS</div>
        <p className="mt-2 text-sm text-mute">
          Your pay bubble. 25% of every launch-curve swap lands here so you do not dip into project treasury. Creator
          keeps 50%. Treasury keeps 25%. {data.launchCount} coins on the pad.
        </p>
        <div className="mt-3 font-display text-3xl text-acid">{data.ownerEarningsSol.toFixed(4)} SOL</div>
        <input
          value={ownerPk}
          onChange={(e) => setOwnerPk(e.target.value.trim())}
          placeholder="Owner Solana address"
          className="mt-3 w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-xs outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ ownerWallet: ownerPk || null })}
            className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
          >
            Save owner wallet
          </button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-mute">
          {data.ownerWallet ? `Pays to ${shortPk(data.ownerWallet, 6)}` : "No owner wallet set."}
        </p>
      </section>

      <section className="panel mt-6 rounded-2xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">CONTENT BOT · IN HOUSE · MAX 24</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">She writes and paints the posts</h2>
            <p className="mt-2 max-w-2xl text-sm text-mute">
              She writes the caption and paints the frame: her face, candlestick tapes, sleeve mix, how-to steps, session warnings, kill switch, pair list. Aesthetic PnL — for the post, not the live book. Oldest drop at 24.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ generatePromo: true, contentHint: hint || undefined })}
            className="btn-acid rounded-full px-5 py-3 text-sm disabled:opacity-40"
          >
            {busy ? "She’s painting…" : "Run the content bot"}
          </button>
        </div>
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Optional angle — gold, weekend, paper first…"
          className="mt-4 w-full rounded-full border border-violet/30 bg-void px-4 py-3 font-mono text-xs outline-none"
        />
        {note && <p className="mt-3 text-sm text-acid">{note}</p>}
        <p className="mt-2 font-mono text-[11px] text-mute">
          {data.promos.length}/24 · last auto {data.lastPromoDay || "never"} · in-house renderer
        </p>
        {data.promos.length === 0 && <p className="mt-4 text-sm text-mute">Empty. Run the content bot, or wait for the daily cron.</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.promos.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-line bg-void/60">
              {item.kind === "video" ? (
                <video src={item.url} controls className="aspect-[9/16] w-full bg-black object-cover sm:aspect-video" />
              ) : (
                <img
                  src={item.dataUrl || item.url}
                  alt={item.headline}
                  className={`w-full object-cover ${item.aspect === "9:16" ? "aspect-[9/16]" : item.aspect === "16:9" ? "aspect-video" : "aspect-square"}`}
                />
              )}
              <div className="space-y-2 p-4">
                <div className="font-mono text-[10px] tracking-[0.2em] text-violet">
                  {item.kind.toUpperCase()} · {item.aspect} · {item.pnlLabel}
                </div>
                <h3 className="font-display text-xl text-ghost">{item.headline}</h3>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-mute">{item.caption}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="btn-ghost rounded-full px-4 py-1.5 text-xs"
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.caption);
                      setCopied(item.id);
                      setTimeout(() => setCopied(""), 1500);
                    }}
                  >
                    {copied === item.id ? "Copied" : "Copy caption"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-line px-4 py-1.5 text-xs text-mute"
                    onClick={async () => {
                      const src = item.dataUrl || item.url;
                      const blob = await fetch(src).then((r) => r.blob());
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `solphia-${item.aspect.replace(":", "x")}-${item.id}.png`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                      setSaved(item.id);
                      setTimeout(() => setSaved(""), 1500);
                    }}
                  >
                    {saved === item.id ? "Saved" : "Save image"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel mt-6 rounded-2xl p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ENGINE BACKTEST</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">Does this engine print?</h2>
            <p className="mt-2 max-w-2xl text-sm text-mute">
              Replay spot 1× plus SOL-PERP 2× and 3× on the same ~40d 15m tape. Jupiter Perps fees and liquidation are
              in the lev marks.
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
                  <button type="button" onClick={() => setBtLev(2)} className={`rounded-2xl border p-4 text-left ${btLev === 2 ? "border-acid/50 bg-acid/5" : "border-line/80 bg-void/50"}`}>
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
                  <button type="button" onClick={() => setBtLev(3)} className={`rounded-2xl border p-4 text-left ${btLev === 3 ? "border-acid/50 bg-acid/5" : "border-line/80 bg-void/50"}`}>
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
                v={
                  shownBt.profitFactor == null
                    ? shownBt.wins
                      ? "∞"
                      : "—"
                    : shownBt.profitFactor.toFixed(2)
                }
              />
              <Mini
                k="Realized"
                v={`${(shownBt.realizedUsd || 0) >= 0 ? "+" : "−"}${money(Math.abs(shownBt.realizedUsd || 0))}`}
              />
              <Mini
                k="Open mark"
                v={`${(shownBt.unrealizedUsd || 0) >= 0 ? "+" : "−"}${money(Math.abs(shownBt.unrealizedUsd || 0))}`}
              />
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
                  PnL is the book mark, including an open sleeve. Clips are buys in / sells out. “Held” means the
                  position moved and she did not fire a clip that UTC day.
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
                              <td className={held ? "text-violet" : "text-mute"}>
                                {held ? "held" : `${inn} / ${out}`}
                              </td>
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

      <section className="panel mt-6 rounded-2xl p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">PUBLIC BOOK</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">What she holds</h2>
          </div>
          <p className="max-w-lg text-sm text-mute">{p.lastAction || pair?.reason || p.lastSkipReason || "Waiting on prices."}</p>
        </div>
        {p.pendingIntent && (
          <p className="mt-3 font-mono text-xs text-acid">
            Pending {p.pendingIntent.from} → {p.pendingIntent.to} · {money(p.pendingIntent.clipUsd)} · {p.pendingIntent.reason}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {data.sleeves.map((s) => (
            <div key={s.id} className="rounded-2xl border border-line/80 bg-void/50 p-4">
              <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{s.name}</div>
              <div className="mt-1 truncate font-display text-2xl text-ghost">{fmtQty(s.qty, s.id)}</div>
              <div className="font-mono text-[11px] text-mute">{money(s.valueUsd)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">LIVE TAPE</div>
          {tape.length === 0 && <p className="mt-3 text-sm text-mute">No clips yet.</p>}
          <div className="mt-2 max-h-80 space-y-2 overflow-auto">
            {tape.slice(0, 24).map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 font-mono text-[11px]">
                <span className={row.action === "trade" || row.action === "deploy" ? "text-acid" : "text-mute"}>
                  {tapeLabel(row.action)}
                  {row.from && row.to ? ` ${row.from}→${row.to}` : ""}
                </span>
                <span className="max-w-[65%] text-right text-mute">
                  {row.sizeUsd ? money(row.sizeUsd) + " · " : ""}
                  {row.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">FEEDS</div>
          {data.feedHealth.length === 0 && <p className="mt-3 text-sm text-mute">No tick yet.</p>}
          {data.feedHealth.map((f) => (
            <div key={`${f.source}-${f.at}`} className="mt-2 flex justify-between gap-3 font-mono text-[11px]">
              <span className="text-ghost">{f.source}</span>
              <span className={f.ok ? "text-acid" : "text-blood"}>{f.ok ? `${f.count} in ${f.ms}ms` : f.error || "down"}</span>
            </div>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 font-mono text-[11px] text-mute">
            <span>Helius {data.helius ? "ON" : "OFF"}</span>
            <span>Treasury {data.treasurySet ? "SET" : "OFF"}</span>
            <span>z7 {num(pair?.z7)} · z24 {num(pair?.z24)}</span>
            <span>{pair?.signal || "hold"}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">BOTS</div>
          {data.traders.length === 0 && <p className="mt-3 text-sm text-mute">No personal books yet.</p>}
          <div className="mt-2 max-h-80 space-y-3 overflow-auto">
            {data.traders.map((t) => (
              <div key={t.owner} className="border-b border-line/60 pb-2 font-mono text-[11px] last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-ghost">
                  <span>{shortPk(t.owner)}</span>
                  <span className={t.killed ? "text-blood" : t.mode === "live" ? "text-acid" : "text-cyan"}>
                    {t.killed ? "KILL" : t.mode.toUpperCase()}
                    {t.leverage > 1 ? ` · SOL ${t.leverage}×` : ""}
                    {t.pending ? " · CLIP" : ""}
                  </span>
                </div>
                <div className="mt-1 text-mute">
                  {money(t.equityUsd)} · {t.pnlPct >= 0 ? "+" : ""}
                  {(t.pnlPct * 100).toFixed(2)}% · {t.depositedSol.toFixed(3)} SOL in · {t.trades} trades
                </div>
                {t.lastAction && <div className="mt-1 text-mute">{t.lastAction}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">
            SEATS · {data.seatSol} / {data.seatSolLev} SOL / 30d
          </div>
          {data.seats.length === 0 && <p className="mt-3 text-sm text-mute">No seats yet.</p>}
          <div className="mt-2 max-h-80 space-y-2 overflow-auto">
            {data.seats.map((u) => (
              <div key={u.pubkey} className="flex justify-between gap-3 font-mono text-[11px] text-ghost">
                <span>{shortPk(u.pubkey)}</span>
                <span className="text-mute">
                  {u.admin ? "admin" : u.plan}
                  {u.autoRenew ? " · auto" : ""}
                  {u.paid && u.until ? ` · to ${new Date(u.until).toLocaleDateString()}` : u.admin ? "" : " · unpaid"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">LOCKED DEFAULTS</div>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <Row k="Wait" v={`${data.locked.cooldownMin} min`} />
            <Row k="Clip" v={`${(data.locked.clipPct * 100).toFixed(0)}%`} />
            <Row k="Stop" v={`${(data.locked.stopPct * 100).toFixed(0)}%`} />
            <Row k="Home" v="USDC" />
            <Row k="Leverage" v="spot · opt SOL 2×/3×" />
            <Row k="Seat" v={`${data.seatSol} / ${data.seatSolLev} SOL`} />
            <Row k="Clip fee" v={`${data.protocolFeeBps} bps`} />
            <Row k="PnL" v="USDC" />
          </div>
        </div>
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">AUDIT</div>
          <div className="mt-2 max-h-64 space-y-2 overflow-auto">
            {data.audit.slice(0, 20).map((a) => (
              <div key={a.id} className="flex justify-between gap-3 font-mono text-[11px] text-mute">
                <span className="text-ghost">
                  {a.action} · {a.detail}
                </span>
                <span>{new Date(a.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function mergeDesk(prev: AdminDesk | null, next: AdminDesk): AdminDesk {
  if (!prev) return next;
  const prevMax = prev.promos.reduce((m, p) => Math.max(m, p.at), 0);
  const nextMax = next.promos.reduce((m, p) => Math.max(m, p.at), 0);
  const promos = (prevMax > nextMax ? prev.promos : next.promos).map((p) => {
    const older = prev.promos.find((x) => x.id === p.id);
    return { ...p, dataUrl: p.dataUrl || older?.dataUrl };
  });
  return {
    ...next,
    promos,
    backtest: next.backtest || prev.backtest,
    backtestLev2: next.backtestLev2 || prev.backtestLev2,
    backtestLev3: next.backtestLev3 || prev.backtestLev3,
  };
}

function Stat({ k, v, sub, good }: { k: string; v: string; sub: string; good?: boolean }) {
  return (
    <div className="panel rounded-2xl p-4">
      <div className="font-mono text-[10px] tracking-[0.3em] text-mute">{k}</div>
      <div className={`mt-1 font-display text-2xl md:text-3xl ${good === false ? "text-blood" : "text-ghost"}`}>{v}</div>
      <div className="font-mono text-[10px] text-mute">{sub}</div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-line bg-void/40 px-4 py-3">
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{k}</div>
      <div className="mt-1 font-display text-xl text-ghost">{v}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-mute">{k}</span>
      <span className="text-ghost">{v}</span>
    </div>
  );
}

function money(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
  return `$${abs.toFixed(2)}`;
}

function fmtQty(n: number, id: string) {
  if (!n) return "0";
  if (id === "USDC") return money(n);
  if (n >= 100) return n.toFixed(2);
  return n.toFixed(4);
}

function num(n?: number) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function age(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function shortPk(pk: string, n = 4) {
  if (!pk || pk.length < n * 2) return pk || "—";
  return `${pk.slice(0, n)}…${pk.slice(-n)}`;
}

function tapeLabel(action: string) {
  if (action === "trade" || action === "buy" || action === "sell") return "TRADED";
  if (action === "deploy") return "BOUGHT";
  if (action === "flatten" || action === "kill") return "STOPPED";
  if (action === "skip") return "WAITING";
  if (action === "hold") return "HOLD";
  return action.toUpperCase();
}
