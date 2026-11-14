"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyCa } from "@/components/CopyCa";
import { copyText } from "@/lib/copyText";
import { Mini, Panel, Stat, solAmt } from "../ui";

type Snipers = { buys: number; sells: number; volumeSol: number; buySol?: number; snipers: number; curveSol: number };

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
  dumpAt?: number;
  dumped?: boolean;
  dumpSol?: number;
  bagQuoteSol?: number;
  returnedSol?: number;
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
  relayFunded?: boolean;
  dry?: boolean;
  measuredCostSol?: number;
  relayLeftSol?: number;
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
  relayLeftSol: number;
  measuredCostSol: number;
  dry: boolean;
};

type SweepLeg = {
  role: string;
  from: string;
  sol: number;
  keepSol: number;
  sendSol: number;
  hot: boolean;
  skip?: string;
};

type Sweep = {
  owner: string;
  userWalletSol: number;
  protocolSol: number;
  padTvlSol: number;
  launchSol: number;
  liveSol?: number;
  vaultSol?: number;
  liveCount?: number;
  vaultCount?: number;
  movableSol: number;
  keepRelaySol: number;
  lockedSol: number;
  campaignRunning: boolean;
  remainingSends?: number;
  legs: SweepLeg[];
  note: string;
};

type Desk = {
  campaign: Campaign;
  fuel: Fuel;
  summary: {
    total: number;
    live: number;
    failed: number;
    queued: number;
    buys: number;
    sells: number;
    volumeSol: number;
    dry?: boolean;
    measuredCostSol?: number;
    relayLeftSol?: number;
    relayFunded?: boolean;
    returnedSol?: number;
  };
  sweep?: Sweep | null;
  sweepResult?: { ok: boolean; movedSol: number; signatures: string[]; error?: string };
};

const emptyFuel: Fuel = {
  treasury: "",
  treasurySol: 0,
  hot: false,
  fundSol: 0,
  remaining: 250,
  needSol: 0.5,
  keepSol: 0.002,
  enough: false,
  relayLeftSol: 0,
  measuredCostSol: 0,
  dry: false,
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
  const [total, setTotal] = useState(250);
  const [narrativePct, setNarrativePct] = useState(40);
  const [minutes, setMinutes] = useState(180);
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
      const n = j.campaign.narrative || 100;
      const r = j.campaign.random || 150;
      const t = Math.max(1, n + r);
      setTotal(t);
      setNarrativePct(Math.round((n / t) * 100));
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

  function copy(label: string, value?: string) {
    if (!value) return;
    if (!copyText(value, `${label} copied`)) return;
    setCopied(label);
    setTimeout(() => setCopied(""), 1600);
  }

  const campaign = desk?.campaign;
  const fuel = desk?.fuel || emptyFuel;
  const summary = desk?.summary;
  const mixNarrative = Math.min(total, Math.max(0, Math.round((total * narrativePct) / 100)));
  const mixRandom = Math.max(0, total - mixNarrative);
  const planned = Math.max(1, campaign?.tokens.length || total || 1);
  const live = summary?.live || 0;
  const pct = Math.min(100, Math.round((live / planned) * 100));
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
              First R&amp;D tool. Click LAUNCH and Treasury seeds the first wallet with 0.5 SOL. Tokens launch on the
              window you set. 30 seconds after each mint, leftover SOL hops to the next wallet. If sniper buys hit 1 SOL
              it sells the bag at 99% slippage first so leftover tokens do not sit in that wallet, then hops. The last leftover goes to owner. Full 1% swap fees on these tokens go to owner.
            </p>
          </div>
          <div className="tools-ring" style={{ ["--pct" as string]: `${pct}` }}>
            <div className="tools-ring-hole">
              <div className="stat-num text-2xl text-ghost">{live}</div>
              <div className="font-mono text-[10px] text-mute">/ {campaign?.tokens.length || total}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat k="Treasury" v={solAmt(fuel.treasurySol)} sub={fuel.hot ? "hot key ready" : "save treasury key in Wallets"} good={fuel.hot} />
        <Stat k="Relay seed" v="0.500 SOL" sub={campaign?.relayFunded ? "first wallet funded" : "moves once from treasury"} />
        <Stat
          k="Cost / launch"
          v={fuel.measuredCostSol > 0 ? `${fuel.measuredCostSol.toFixed(4)} SOL` : "—"}
          sub={fuel.dry ? "measured until dry" : "measured after each live launch"}
        />
        <Stat
          k="Relay left"
          v={solAmt(fuel.relayLeftSol)}
          sub={`${fuel.remaining} queued${summary?.returnedSol ? ` · ${solAmt(summary.returnedSol)} to owner` : ""}`}
        />
        <Stat k="Sniper volume" v={solAmt(summary?.volumeSol || 0)} sub={`${summary?.buys || 0} buys · ${summary?.sells || 0} sells`} />
        <Stat
          k="Next shot"
          v={running && campaign?.nextAt ? eta(campaign.nextAt, now) : campaign?.status || "idle"}
          sub={running ? "randomized over the window" : fuel.dry ? "stopped dry" : "waiting"}
        />
      </div>

      <Panel kicker="CAMPAIGN CONTROL">
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">TOTAL TOKENS</div>
            <input
              type="number"
              min={1}
              max={400}
              value={total}
              disabled={!idle || busy}
              onChange={(e) => setTotal(Math.max(1, Math.min(400, Math.floor(Number(e.target.value) || 1))))}
              className="mt-1 w-full rounded-xl border border-line bg-void/60 px-3 py-2 text-ghost"
            />
          </label>
          <label className="block">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">WINDOW MINUTES</div>
            <input
              type="number"
              min={1}
              max={1440}
              step={1}
              value={minutes}
              disabled={!idle || busy}
              onChange={(e) => setMinutes(Math.max(1, Math.min(1440, Math.floor(Number(e.target.value) || 1))))}
              className="mt-1 w-full rounded-xl border border-line bg-void/60 px-3 py-2 text-ghost"
            />
            <p className="mt-1 font-mono text-[10px] text-mute">
              1–1440 minutes. 180 is 3 hours. Use 10 for a short test.
            </p>
          </label>
        </div>
        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-acid">NARRATIVE 100%</div>
              <div className="font-display text-2xl text-ghost">{mixNarrative}</div>
              <div className="font-mono text-[11px] text-mute">{narrativePct}%</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] tracking-[0.2em] text-violet">RANDOM WORDS 100%</div>
              <div className="font-display text-2xl text-ghost">{mixRandom}</div>
              <div className="font-mono text-[11px] text-mute">{100 - narrativePct}%</div>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={narrativePct}
            disabled={!idle || busy}
            onChange={(e) => setNarrativePct(Number(e.target.value))}
            className="tools-mix mt-3"
            style={{
              background: `linear-gradient(90deg, #14f195 0%, #14f195 ${narrativePct}%, #9945ff ${narrativePct}%, #9945ff 100%)`,
            }}
            aria-label="Narrative versus random mix"
          />
          <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-mute">DRAG EITHER WAY</p>
        </div>
        <p className="mt-3 text-sm text-mute">
          Same hooked Token-2022 curve as official SPHA, with this tester&apos;s 1% going 100% to the owner wallet.
          Project mint is a random 3–20% into that token&apos;s launch wallet. Shared pad config is never overwritten.
          Seed is 0.5 SOL once. Tickers are unique across batches. After each launch the wallet watches the bag for a 1
          SOL sell quote, dumps at 99% slippage, then hops leftover SOL to the next wallet. Live CAs are copyable for
          Solscan and Dexscreener. Stats pull curve SOL plus Dexscreener buys, sells, and volume.
        </p>
        {(fuel.dry || campaign?.dry) && (
          <div className="mt-3 rounded-xl border border-blood/40 bg-blood/10 px-4 py-3 text-sm text-ghost">
            <div className="font-mono text-[10px] tracking-[0.2em] text-blood">STOPPED · INSUFFICIENT FUNDS</div>
            <p className="mt-1">{campaign?.error || "Relay ran dry. Cost per launch is on the desk above."}</p>
          </div>
        )}
        {err && <p className="mt-3 text-sm text-blood">{err}</p>}
        {campaign?.error && !fuel.dry && !campaign?.dry && <p className="mt-3 text-sm text-blood">{campaign.error}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || running || !idle}
            onClick={() => act("start", { total, narrativePct, windowMinutes: minutes })}
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

      <Panel kicker="EXTRACT LAUNCHED WALLETS">
        <p className="mt-3 max-w-2xl text-sm text-mute">
          Pauses the launcher if it is running, sells bags worth at least 1 SOL at 99% slippage, then sends leftover SOL
          from every Tools launch wallet (this campaign and leftover prior wallets) into owner. Click again if wallets
          remain (80 txs per pass). Protocol, user, and pad SOL stay. Refill treasury 0.5 SOL before the next LAUNCH.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini k="Launch wallets" v={solAmt(desk?.sweep?.launchSol || 0)} />
          <Mini k="Extractable" v={solAmt(desk?.sweep?.legs?.find((l) => l.role === "tools-launch")?.sendSol || desk?.sweep?.launchSol || 0)} />
          <Mini k="This pass" v={String(Math.min(80, desk?.sweep?.remainingSends || 0))} />
          <Mini k="Owner" v={shortPk(desk?.sweep?.owner)} />
        </div>
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="font-mono text-[10px] tracking-[0.2em] text-mute">
              <tr>
                <th className="px-2 py-1">Role</th>
                <th className="px-2 py-1">Wallet</th>
                <th className="px-2 py-1">SOL</th>
                <th className="px-2 py-1">Send</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {(desk?.sweep?.legs || [])
                .filter((leg) => leg.role === "tools-launch")
                .map((leg) => (
                <tr key={`${leg.role}-${leg.from}`} className="border-t border-line/60">
                  <td className="px-2 py-1 font-mono text-[11px] text-ghost">{leg.role}</td>
                  <td className="px-2 py-1 font-mono text-[11px] text-ghost">{shortPk(leg.from)}</td>
                  <td className="px-2 py-1 font-mono text-[11px] text-ghost">{solAmt(leg.sol)}</td>
                  <td className="px-2 py-1 font-mono text-[11px] text-ghost">{solAmt(leg.sendSol)}</td>
                  <td className="px-2 py-1 font-mono text-[11px] text-mute">
                    {leg.skip || (leg.hot ? "ready" : "no key")}
                  </td>
                </tr>
              ))}
              {!(desk?.sweep?.legs || []).some((leg) => leg.role === "tools-launch") && (
                <tr>
                  <td colSpan={5} className="px-2 py-3 text-mute">
                    No Tools launch wallets loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {desk?.sweepResult && (
          <p className={`mt-3 text-sm ${desk.sweepResult.ok ? "text-acid" : "text-blood"}`}>
            {desk.sweepResult.ok
              ? `Moved ${solAmt(desk.sweepResult.movedSol)} to owner${desk.sweepResult.signatures?.length ? ` · ${desk.sweepResult.signatures.length} tx` : ""}.`
              : desk.sweepResult.error || "Sweep failed."}
          </p>
        )}
        <button
          type="button"
          disabled={busy || !(desk?.sweep?.launchSol || 0)}
          onClick={() => {
            const movable = desk?.sweep?.launchSol || 0;
            const owner = desk?.sweep?.owner || "owner";
            if (
              !window.confirm(
                `EXTRACT LAUNCHED WALLETS ${movable.toFixed(4)} SOL into ${owner.slice(0, 4)}…${owner.slice(-4)}? This pauses the launcher, sells bags worth at least 1 SOL at 99% slippage, then sends leftover launch-wallet SOL to owner.`,
              )
            ) {
              return;
            }
            void act("extractLaunched");
          }}
          className="btn-acid mt-4 rounded-full px-8 py-3 text-sm tracking-[0.2em]"
        >
          EXTRACT LAUNCHED WALLETS
        </button>
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini k="Live" v={String(summary?.live || 0)} />
        <Mini k="Queued" v={String(summary?.queued || 0)} />
        <Mini k="Failed" v={String(summary?.failed || 0)} />
        <Mini k="Copied" v={copied || "CA / wallet"} />
      </div>

      <section className="panel overflow-hidden rounded-2xl p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.3em] text-mute">TOKENS</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ticker, CA, wallet"
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
                <th className="px-3 py-2">CA</th>
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
                    {t.mint ? (
                      <div className="flex min-w-[11rem] flex-col items-start gap-1">
                        <CopyCa ca={t.mint} compact />
                        <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                          <a
                            href={`https://solscan.io/token/${t.mint}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-acid hover:underline"
                          >
                            solscan
                          </a>
                          <a
                            href={`https://dexscreener.com/solana/${t.mint}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-acid hover:underline"
                          >
                            dex
                          </a>
                        </div>
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] text-mute">—</span>
                    )}
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
                    {t.status === "live" && !t.dumped ? "live" : t.status}
                    {t.status === "queued" && t.scheduledAt > now ? <div className="text-mute">{eta(t.scheduledAt, now)}</div> : null}
                    {t.status === "live" && !t.dumped ? (
                      <div className="text-mute">
                        bag {solAmt(t.bagQuoteSol || 0)}
                        {(t.bagQuoteSol || 0) >= 1 || (t.snipers.buySol || 0) >= 1 || (t.snipers.volumeSol || 0) >= 1
                          ? " · dump 1 SOL"
                          : t.dumpAt && t.dumpAt > now
                            ? ` · hop ${eta(t.dumpAt, now)}`
                            : " · hop soon"}
                      </div>
                    ) : null}
                    {t.dumped && t.dumpSol ? <div className="text-mute">sold {solAmt(t.dumpSol)}</div> : null}
                    {t.returnedSol ? <div className="text-mute">to owner {solAmt(t.returnedSol)}</div> : null}
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
