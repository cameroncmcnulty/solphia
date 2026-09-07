"use client";

import { useEffect, useState } from "react";
import type { AdminDesk } from "@/lib/admin/types";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<AdminDesk | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

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
    } catch {
      setErr("Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    const dash = await fetch("/api/admin");
    if (!dash.ok) {
      setData(null);
      throw new Error("denied");
    }
    setData((await dash.json()) as AdminDesk);
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setData(null);
    setSecret("");
  }

  async function refreshMarket() {
    setBusy(true);
    try {
      await fetch("/api/feed");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!data) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      reload().catch(() => setData(null));
    }, 8000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [Boolean(data)]);

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
          <button
            type="submit"
            disabled={busy || !secret}
            className="btn-acid w-full rounded-full py-3 text-sm disabled:opacity-40"
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        {err && <p className="mt-3 text-sm text-blood">{err}</p>}
      </main>
    );
  }

  const p = data.paper;
  const pair = data.pair;
  const pnlUsd = p.equityUsd - p.startingUsd;
  const ticking = data.lastTickAt > 0 && now - data.lastTickAt < 60_000;
  const tickAge = data.lastTickAt ? age(now - data.lastTickAt) : "never";
  const session = pair?.session === "cash" ? "cash" : pair?.session === "weekend" ? "weekend" : pair?.session === "after_hours" ? "after hours" : "—";
  const status = p.killed ? "STOPPED" : "PAPER";
  const tape = p.tape || [];

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-2 md:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOL · SPYx · QQQx · GLDx · USDC</p>
          <h1 className="mt-1 font-display text-4xl text-ghost md:text-5xl">Admin</h1>
          <p className="mt-2 max-w-xl text-sm text-mute">
            Public paper book, feeds, and live seats. Spot only. Official xStocks. PnL in USDC.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${p.killed ? "bg-blood/20 text-blood" : "bg-acid/15 text-acid"}`}>
            {status}
          </span>
          <span className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${data.liveTrading ? "bg-cyan/15 text-cyan" : "border border-line text-mute"}`}>
            {data.liveTrading ? "LIVE ON" : "LIVE OFF"}
          </span>
          <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-cyan">
            {ticking ? "tick live" : "tick stale"} · {tickAge}
          </span>
          <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-mute">
            {session}
          </span>
          <button type="button" onClick={refreshMarket} disabled={busy} className="btn-ghost rounded-full px-4 py-2 text-xs">
            {busy ? "…" : "Refresh"}
          </button>
          <button type="button" onClick={logout} className="rounded-full border border-line px-4 py-2 text-xs text-mute">
            Log out
          </button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat k="Book" v={money(p.equityUsd)} sub="USDC mark" />
        <Stat
          k="PnL"
          v={`${pnlUsd >= 0 ? "+" : "−"}${money(Math.abs(pnlUsd))}`}
          sub={`${p.pnlPct >= 0 ? "+" : ""}${(p.pnlPct * 100).toFixed(2)}%`}
          good={Math.abs(p.pnlPct) < 0.0005 ? undefined : p.pnlPct >= 0}
        />
        <Stat k="Trades" v={String(p.trades)} sub={`${p.skipped || 0} skipped`} />
        <Stat k="Bots" v={String(data.traders.length)} sub={`${data.traders.filter((t) => t.mode === "live").length} live`} />
        <Stat k="Seats" v={String(data.seats.length)} sub={`${data.seats.filter((s) => s.paid).length} paid`} />
        <Stat
          k="Fees"
          v={money(p.feesPaidUsd)}
          sub={`${data.protocolFeeBps} bps clip`}
        />
      </div>

      <section className="panel mt-6 rounded-2xl p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">PUBLIC BOOK</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">What she holds</h2>
          </div>
          <p className="max-w-lg text-sm text-mute">
            {p.lastAction || pair?.reason || p.lastSkipReason || "Waiting on prices."}
          </p>
        </div>
        {p.pendingIntent && (
          <p className="mt-3 font-mono text-xs text-acid">
            Pending {p.pendingIntent.from} → {p.pendingIntent.to} · {money(p.pendingIntent.clipUsd)} · {p.pendingIntent.reason}
          </p>
        )}
        {p.haltReason && (p.haltedUntil || 0) > now && (
          <p className="mt-3 text-sm text-blood">{p.haltReason}</p>
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
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">MARKS</div>
          <div className="mt-3 space-y-2">
            {[
              ["SOL", data.prices.solUsd, pair?.oracle?.sol],
              ["SPYx", data.prices.spyxUsd, pair?.oracle?.spyx],
              ["QQQx", data.prices.qqqxUsd, pair?.oracle?.qqqx],
              ["GLDx", data.prices.gldxUsd, pair?.oracle?.gldx],
            ].map(([k, v, src]) => (
              <div key={String(k)} className="flex items-baseline justify-between gap-3 font-mono text-[12px]">
                <span className="text-mute">{k}</span>
                <span className="text-ghost">
                  {typeof v === "number" && v > 0 ? `$${v.toFixed(v >= 100 ? 2 : 4)}` : "—"}
                  <span className="ml-2 text-[10px] text-mute">{String(src || "")}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-mute">
            z7 {num(pair?.z7)} · z24 {num(pair?.z24)} · {pair?.signal || "hold"}
            {pair?.stale ? " · STALE" : ""}
          </div>
          {pair?.knowledge?.note && <p className="mt-2 text-xs leading-relaxed text-mute">{pair.knowledge.note}</p>}
        </div>

        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">FEEDS</div>
          {data.feedHealth.length === 0 && <p className="mt-3 text-sm text-mute">No tick yet.</p>}
          {data.feedHealth.map((f) => (
            <div key={`${f.source}-${f.at}`} className="mt-2 flex justify-between gap-3 font-mono text-[11px]">
              <span className="text-ghost">{f.source}</span>
              <span className={f.ok ? "text-acid" : "text-blood"}>
                {f.ok ? `${f.count} in ${f.ms}ms` : f.error || "down"}
              </span>
            </div>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 font-mono text-[11px] text-mute">
            <span>Helius {data.helius ? "ON" : "OFF"}</span>
            <span>Treasury {data.treasurySet ? "SET" : "OFF"}</span>
            <span>Live flag {data.liveTrading ? "ON" : "OFF"}</span>
            <span>Oracle age {pair?.oracle?.ageMs != null ? `${Math.round(pair.oracle.ageMs / 1000)}s` : "—"}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">TAPE</div>
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
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">PAIRS SHE TRADES</div>
          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {data.pairs.map((row) => (
              <div key={row.id} className="flex justify-between font-mono text-[11px] text-ghost">
                <span>
                  {row.left} / {row.right}
                </span>
                <span className="text-mute">
                  {row.leftName} · {row.rightName}
                </span>
              </div>
            ))}
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
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">SEATS · 0.2 SOL / 30d</div>
          {data.seats.length === 0 && <p className="mt-3 text-sm text-mute">No paid or paper seats yet.</p>}
          <div className="mt-2 max-h-80 space-y-2 overflow-auto">
            {data.seats.map((u) => (
              <div key={u.pubkey} className="flex justify-between gap-3 font-mono text-[11px] text-ghost">
                <span>{shortPk(u.pubkey)}</span>
                <span className="text-mute">
                  {u.plan}
                  {u.paid && u.until ? ` · to ${new Date(u.until).toLocaleDateString()}` : " · unpaid"}
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
            <Row k="Sleeves" v={`${(data.locked.sleeveWeight * 100).toFixed(0)}% each`} />
            <Row k="Allocated" v={`${(data.locked.allocationPct * 100).toFixed(0)}%`} />
            <Row k="Leverage" v="spot only" />
            <Row k="Style" v={data.locked.style.replace("_", " ")} />
            <Row k="Band" v={data.locked.band} />
            <Row k="Seat" v={`${data.seatSol} SOL / 30d`} />
            <Row k="Clip fee" v={`${data.protocolFeeBps} bps`} />
            <Row k="Venue + slip" v={`${data.pairFeeBps}+${data.slipBps} bps`} />
            <Row k="PnL" v="USDC" />
          </div>
        </div>

        <div className="panel rounded-2xl p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">OFFICIAL MINTS</div>
          <div className="mt-3 space-y-2 font-mono text-[11px]">
            <Mint k="SOL" v={data.mints.sol} />
            <Mint k="USDC" v={data.mints.usdc} />
            <Mint k="SPYx" v={data.mints.spyx} />
            <Mint k="QQQx" v={data.mints.qqqx} />
            <Mint k="GLDx" v={data.mints.gldx} />
          </div>
        </div>
      </section>

      <section className="panel mt-6 rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">AUDIT</div>
        {data.audit.length === 0 && <p className="mt-3 text-sm text-mute">Quiet.</p>}
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
      </section>
    </main>
  );
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-mute">{k}</span>
      <span className="text-ghost">{v}</span>
    </div>
  );
}

function Mint({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-mute">{k}</span>
      <span className="truncate text-ghost">{shortPk(v, 6)}</span>
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
