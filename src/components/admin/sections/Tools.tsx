"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mini, Panel, Stat, solAmt } from "../ui";

type Snipers = { buys: number; sells: number; volumeSol: number; snipers: number; curveSol: number };

type TokenRow = {
  id: string;
  kind: "narrative" | "random";
  theme: string;
  name: string;
  symbol: string;
  status: "queued" | "funding" | "launching" | "live" | "failed";
  scheduledAt: number;
  launchedAt?: number;
  wallet?: string;
  mint?: string;
  image: string;
  teamBps: number;
  error?: string;
  snipers: Snipers;
};

type Campaign = {
  id: string;
  status: "idle" | "running" | "paused" | "done" | "stopped";
  startedAt?: number;
  endsAt?: number;
  windowMs: number;
  narrative: number;
  random: number;
  fundLamports: number;
  nextAt?: number;
  error?: string;
  tokens: TokenRow[];
};

type Fuel = {
  treasury: string;
  treasurySol: number;
  hot: boolean;
  fundSol: number;
  remaining: number;
  needSol: number;
  keepSol: number;
  enough: boolean;
};

type Desk = {
  campaign: Campaign;
  fuel: Fuel;
  summary: { total: number; live: number; failed: number; queued: number; buys: number; sells: number; volumeSol: number };
};

const emptyFuel: Fuel = {
  treasury: "",
  treasurySol: 0,
  hot: false,
  fundSol: 0.11,
  remaining: 250,
  needSol: 27.5,
  keepSol: 0.002,
  enough: false,
};

function shortPk(pk?: string) {
  if (!pk) return "—";
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function fmtPct(bps: number) {
  return `${(bps / 100).toFixed(1)}%`;
}

function eta(ms: number, now: number) {
  const d = Math.max(0, ms - now);
  const s = Math.floor(d / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function statusTone(s: TokenRow["status"]) {
  if (s === "live") return "text-acid";
  if (s === "failed") return "text-blood";
  if (s === "launching" || s === "funding") return "text-violet";
  return "text-mute";
}

export function ToolsSection() {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [narrative, setNarrative] = useState(100);
  const [random, setRandom] = useState(150);
  const [hours, setHours] = useState(3);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "queued" | "failed" | "narrative" | "random">("all");
  const [copied, setCopied] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/tools/launcher", { cache: "no-store" });
    const j = (await r.json()) as Desk & { error?: string };
    if (!r.ok) throw new Error(j.error || "Could not load the launcher.");
    setDesk(j);
    if (j.campaign?.status === "idle") {
      setNarrative(j.campaign.narrative || 100);
      setRandom(j.campaign.random || 150);
    }
  }, []);

  useEffect(() => {
    load().catch((e) => setErr(e instanceof Error ? e.message : "Load failed."));
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const running = desk?.campaign.status === "running";
    if (!running) return;
    const t = setInterval(() => {
      load().catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [desk?.campaign.status, load]);

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/tools/launcher", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = (await r.json()) as Desk & { error?: string; message?: string };
      if (!r.ok) throw new Error(j.message || j.error || "Request failed.");
      setDesk(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(label: string, value?: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1200);
  }

  const campaign = desk?.campaign;
  const fuel = desk?.fuel || emptyFuel;
  const summary = desk?.summary;
  const total = Math.max(1, (campaign?.tokens.length || narrative + random) || 1);
  const live = summary?.live || 0;
  const pct = Math.min(100, Math.round((live / total) * 100));
  const rows = useMemo(() => {
    const tokens = campaign?.tokens || [];
    const needle = q.trim().toLowerCase();
    return tokens.filter((t) => {
      if (filter === "live" && t.status !== "live") return false;
      if (filter === "queued" && t.status !== "queued" && t.status !== "funding" && t.status !== "launching") return false;
      if (filter === "failed" && t.status !== "failed") return false;
      if (filter === "narrative" && t.kind !== "narrative") return false;
      if (filter === "random" && t.kind !== "random") return false;
      if (!needle) return true;
      return `${t.symbol} ${t.name} ${t.mint || ""} ${t.wallet || ""} ${t.theme}`.toLowerCase().includes(needle);
    });
  }, [campaign?.tokens, filter, q]);

  const running = campaign?.status === "running";
  const idle = !campaign || campaign.status === "idle";

  return (
    <div className="tools-desk space-y-6">
      <section className="panel relative overflow-hidden rounded-2xl p-5">
        <div className="tools-scan" aria-hidden />
        <div className="font-mono text-[10px] tracking-[0.3em] text-acid">LAB · TOOLS</div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-ghost">Data launcher</h2>
            <p className="mt-2 max-w-2xl text-sm text-mute">
              First R&amp;D tool. Click LAUNCH and the desk fires tokens on the Solphia curve over a 3 hour window with
              randomized gaps. Each token gets a fresh wallet funded from Treasury, its own art, and matching socials.
              100 ride current meme narratives. 150 are random word names like Cat or The World.
            </p>
          </div>
          <div className="tools-ring" style={{ ["--pct" as string]: `${pct}` }}>
            <div className="tools-ring-hole">
              <div className="stat-num text-2xl text-ghost">{live}</div>
              <div className="font-mono text-[10px] text-mute">/ {campaign?.tokens.length || narrative + random}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat k="Treasury" v={solAmt(fuel.treasurySol)} sub={fuel.hot ? "hot key ready" : "hot key missing"} good={fuel.hot} />
        <Stat k="Per launch" v={`${fuel.fundSol.toFixed(3)} SOL`} sub="exact fund into a new wallet" />
        <Stat k="Still needed" v={solAmt(fuel.needSol)} sub={`${fuel.remaining} wallets · keep ${fuel.keepSol.toFixed(3)}`} good={fuel.enough} />
        <Stat k="Sniper volume" v={solAmt(summary?.volumeSol || 0)} sub={`${summary?.buys || 0} buys · ${summary?.sells || 0} sells`} />
        <Stat
          k="Next shot"
          v={running && campaign?.nextAt ? eta(campaign.nextAt, now) : campaign?.status || "idle"}
          sub={running ? "randomized over the window" : "waiting"}
        />
      </div>

      <Panel kicker="CAMPAIGN CONTROL">
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">NARRATIVE</div>
            <input
              type="number"
              min={0}
              max={400}
              value={narrative}
              disabled={!idle || busy}
              onChange={(e) => setNarrative(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-line bg-void/60 px-3 py-2 text-ghost"
            />
          </label>
          <label className="block">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">RANDOM WORDS</div>
            <input
              type="number"
              min={0}
              max={400}
              value={random}
              disabled={!idle || busy}
              onChange={(e) => setRandom(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-line bg-void/60 px-3 py-2 text-ghost"
            />
          </label>
          <label className="block">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">WINDOW HOURS</div>
            <input
              type="number"
              min={0.05}
              max={24}
              step={0.25}
              value={hours}
              disabled={!idle || busy}
              onChange={(e) => setHours(Number(e.target.value) || 3)}
              className="mt-1 w-full rounded-xl border border-line bg-void/60 px-3 py-2 text-ghost"
            />
          </label>
        </div>
        <p className="mt-3 text-sm text-mute">
          Same hooked Token-2022 curve as official SPHA. Project mint is a random 3–20% into that token&apos;s launch
          wallet. Shared pad config is never overwritten. Fund is {fuel.fundSol.toFixed(3)} SOL each — config, pool,
          mint, metadata, slice, and fees.
        </p>
        {err && <p className="mt-3 text-sm text-blood">{err}</p>}
        {campaign?.error && <p className="mt-3 text-sm text-blood">{campaign.error}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || running || !idle}
            onClick={() => act("start", { narrative, random, windowHours: hours })}
            className="btn-acid rounded-full px-8 py-3 text-sm tracking-[0.2em]"
          >
            LAUNCH
          </button>
          {running && (
            <button type="button" disabled={busy} onClick={() => act("pause")} className="btn-ghost rounded-full px-5 py-3 text-sm">
              Pause
            </button>
          )}
          {campaign?.status === "paused" && (
            <button type="button" disabled={busy} onClick={() => act("resume")} className="btn-acid rounded-full px-5 py-3 text-sm">
              Resume
            </button>
          )}
          {(running || campaign?.status === "paused") && (
            <button type="button" disabled={busy} onClick={() => act("stop")} className="btn-ghost rounded-full px-5 py-3 text-sm">
              Stop
            </button>
          )}
          {campaign && campaign.status !== "running" && campaign.status !== "idle" && (
            <button type="button" disabled={busy} onClick={() => act("reset")} className="btn-ghost rounded-full px-5 py-3 text-sm">
              Clear table
            </button>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini k="Live" v={String(summary?.live || 0)} />
        <Mini k="Queued" v={String(summary?.queued || 0)} />
        <Mini k="Failed" v={String(summary?.failed || 0)} />
        <Mini k="Copied" v={copied || "mint / wallet"} />
      </div>

      <section className="panel overflow-hidden rounded-2xl p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">TOKENS</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ticker, mint, wallet"
            className="min-w-[12rem] flex-1 rounded-full border border-line bg-void/50 px-3 py-1.5 text-sm text-ghost"
          />
          {(["all", "live", "queued", "failed", "narrative", "random"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 font-mono text-[11px] ${filter === k ? "bg-acid/15 text-acid" : "border border-line text-mute"}`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sticky top-0 bg-void/95 font-mono text-[10px] tracking-[0.2em] text-mute">
              <tr>
                <th className="px-3 py-2">Token</th>
                <th className="px-3 py-2">Wallet</th>
                <th className="px-3 py-2">Mint</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Snipers</th>
                <th className="px-3 py-2">Volume</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-mute">
                    No tokens yet. Set the mix and hit LAUNCH.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-line/60 hover:bg-acid/5">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <div className="font-display text-ghost">${t.symbol}</div>
                        <div className="truncate font-mono text-[10px] text-mute">
                          {t.name} · {t.kind} · {t.theme}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" className="font-mono text-[11px] text-ghost" onClick={() => copy("wallet", t.wallet)}>
                      {shortPk(t.wallet)}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" className="font-mono text-[11px] text-ghost" onClick={() => copy("mint", t.mint)}>
                      {shortPk(t.mint)}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ghost">{fmtPct(t.teamBps)}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ghost">
                    {t.snipers.buys}/{t.snipers.sells}
                    <div className="text-[10px] text-mute">{t.snipers.snipers} wallets</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ghost">
                    {solAmt(t.snipers.volumeSol)}
                    <div className="text-[10px] text-mute">curve {solAmt(t.snipers.curveSol)}</div>
                  </td>
                  <td className={`px-3 py-2 font-mono text-[11px] ${statusTone(t.status)}`}>
                    {t.status}
                    {t.status === "queued" && t.scheduledAt > now ? <div className="text-mute">{eta(t.scheduledAt, now)}</div> : null}
                    {t.error ? <div className="max-w-[12rem] truncate text-blood">{t.error}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
