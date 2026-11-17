"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyCa } from "@/components/CopyCa";
import { SwapWidget } from "@/components/SwapWidget";
import { prepareSiteImage } from "@/lib/image/prepareUpload";
import { copyText } from "@/lib/copyText";
import { LaunchWhenPicker } from "@/components/admin/LaunchWhenPicker";
import {
  countdownLeadOk,
  defaultLaunchAt,
  fromLocalDateTime,
  pad2,
  splitRemaining,
  toLocalDateValue,
  toLocalTimeValue,
} from "@/lib/token/countdown";
import { Mini, Panel, solAmt } from "../ui";

type Slice = { id: string; label: string; pct: string; bps: number; tokens: number; note: string; wallet: string };
type Snipers = { buys: number; sells: number; volumeSol: number; buySol: number; snipers: number; curveSol: number; at?: number };

type Project = {
  id: string;
  idea: string;
  name: string;
  symbol: string;
  handle: string;
  blurb: string;
  website: string;
  x: string;
  telegram: string;
  supply: number;
  slices: Slice[];
  curveTokens: number;
  teamTokens: number;
  launchWallet: string;
  image: string;
  heroImage?: string;
  layout?: string;
  launchAt: number;
  status: string;
  pendingMint?: string;
  mint?: string;
  error?: string;
  snipers: Snipers;
  bagQuoteSol?: number;
  returnedSol?: number;
};

type SiteRow = {
  id: string;
  name: string;
  symbol: string;
  handle: string;
  website: string;
  image: string;
  heroImage?: string;
  status: string;
  launchWallet: string;
  mint?: string;
  launchAt: number;
  layout?: string;
};

type Desk = {
  project: Project;
  fuel: { wallet: string; sol: number; needSol: number; enough: boolean; hot: boolean };
  holdings?: { wallet: string; sol: number; tokens: number; hot: boolean };
  countdown: { launchAt: number; mintAt: number; remainingMs: number; inMintWindow: boolean; timedOut: boolean };
  archive?: { id: string; symbol: string; mint?: string; status: string; snipers: Snipers }[];
  sites?: SiteRow[];
};

function fmtSupply(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  return n.toLocaleString();
}

export function DataLauncherV3() {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [idea, setIdea] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dest, setDest] = useState("");
  const [sendAmt, setSendAmt] = useState("");
  const [walletTab, setWalletTab] = useState<"swap" | "receive" | "send">("swap");
  const [walletDesk, setWalletDesk] = useState<"launch" | "holdings">("launch");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/tools/launcher-v3", { cache: "no-store" });
    const j = (await r.json()) as Desk & { error?: string; message?: string };
    if (!r.ok) throw new Error(j.message || j.error || "Could not load V3.");
    setDesk(j);
  }, []);

  useEffect(() => {
    let inflight = false;
    let stopped = false;
    const run = (report: boolean) => {
      if (inflight || stopped) return;
      inflight = true;
      load()
        .catch((e) => {
          if (report && !stopped) setErr(e instanceof Error ? e.message : "Could not load V3.");
        })
        .finally(() => {
          inflight = false;
        });
    };
    run(true);
    const id = window.setInterval(() => {
      if (document.hidden) return;
      run(false);
    }, 2_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!desk?.project?.id || desk.project.status === "deleted") {
      setName("");
      setSymbol("");
      setX("");
      setTelegram("");
      setDate("");
      setTime("");
      return;
    }
    setName(desk.project.name || "");
    setSymbol(desk.project.symbol || "");
    setX(desk.project.x || "");
    setTelegram(desk.project.telegram || "");
  }, [desk?.project?.id, desk?.project?.status]);

  useEffect(() => {
    const launchAt = desk?.countdown?.launchAt || 0;
    const ms = launchAt > 0 ? launchAt : defaultLaunchAt();
    setDate(toLocalDateValue(ms));
    setTime(toLocalTimeValue(ms));
  }, [desk?.countdown?.launchAt, desk?.project?.id]);

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    const deleteId = action === "delete" ? String(extra?.id || "") : "";
    if (deleteId) {
      const gone = desk?.project?.id === deleteId;
      setDesk((prev) => {
        if (!prev) return prev;
        const nextSites = (prev.sites || []).filter((s) => s.id !== deleteId);
        return {
          ...prev,
          sites: nextSites,
          project: gone
            ? { ...prev.project, id: "", name: "", symbol: "", handle: "", website: "", image: "", heroImage: "", status: "idle", launchWallet: "", slices: [] }
            : prev.project,
        };
      });
      if (gone) {
        setName("");
        setSymbol("");
        setX("");
        setTelegram("");
        setDate("");
        setTime("");
      }
    }
    try {
      const r = await fetch("/api/admin/tools/launcher-v3", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = await r.json();
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

  const sites = (desk?.sites || []).filter((s) => s.id && s.status !== "deleted");
  const p =
    desk?.project?.id && desk.project.status !== "deleted" && sites.some((s) => s.id === desk.project.id)
      ? desk.project
      : undefined;
  const fuel = desk?.fuel;
  const cd = desk?.countdown;
  const parts = splitRemaining(cd?.remainingMs || 0);
  const ca = p?.mint || p?.pendingMint || "";
  const live = p?.status === "live";
  const armed = Boolean(p?.launchAt && p.status !== "live" && p.status !== "stopped" && p.status !== "idle");
  const launched = Boolean(p?.id && p.launchWallet);

  async function signLaunchSwap(transaction: string) {
    const r = await fetch("/api/admin/tools/launcher-v3", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sign", transaction }),
    });
    const j = (await r.json()) as { signature?: string; message?: string; error?: string };
    if (!r.ok || !j.signature) throw new Error(j.message || j.error || "Sign failed.");
    load().catch(() => {});
    return j.signature;
  }

  return (
    <div className="tools-desk space-y-6">
      <section className="panel relative overflow-hidden rounded-2xl p-6">
        <div className="tools-scan" aria-hidden />
        <div className="font-mono text-[10px] tracking-[0.3em] text-acid">DATA LAUNCHER V3 · 8–11% PROJECT BAG</div>
        <h2 className="mt-1 font-display text-3xl text-ghost">Idea → unique site → isolated launch</h2>
        <p className="mt-2 max-w-3xl text-sm text-mute">
          Enter a token idea. Grok Imagine generates a niche mascot and cinematic hero, then V3 builds a unique
          high-tech memecoin website at ticker.solphia.io. One isolated project wallet holds a random 8–11%. The rest
          sits on the curve. Fresh wallets and a unique DBC config per site. STOP sells the launch wallet, ends the bot,
          and sends leftover SOL to the owner. The 8–11% project bag stays. Keys stay saved.
        </p>
      </section>

      <Panel kicker="SITES · OPEN DASHBOARD OR DELETE">
        <p className="mt-3 text-sm text-mute">
          Every drafted website lives here. OPEN DASHBOARD loads its launch wallet, project holdings, countdown, and
          swap widget. DELETE unpublishes the public site. Launch wallet keys stay saved.
        </p>
        {sites.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sites.map((s) => {
              const on = s.id === p?.id;
              return (
                <div
                  key={s.id}
                  className={`rounded-2xl border px-4 py-3 ${on ? "border-acid/60 bg-acid/5" : "border-line bg-void/40"}`}
                >
                  <div className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-lg text-ghost">
                        {s.name} <span className="text-acid">${s.symbol}</span>
                      </div>
                      <div className="font-mono text-[11px] text-mute">
                        {s.status} · {s.layout || "site"} · {s.handle}.solphia.io
                      </div>
                      <a href={s.website} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-acid">
                        {s.website}
                      </a>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || on}
                      onClick={() => void act("open", { id: s.id })}
                      className="btn-acid rounded-full px-4 py-1.5 text-[11px] tracking-[0.14em] disabled:opacity-40"
                    >
                      {on ? "DASHBOARD OPEN" : "OPEN DASHBOARD"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Unpublish ${s.name} ($${s.symbol})? The public site 404s. Launch wallet keys stay saved.`)) return;
                        void act("delete", { id: s.id });
                      }}
                      className="btn-ghost rounded-full px-4 py-1.5 text-[11px]"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 font-mono text-[12px] text-mute">No sites yet. Build one below.</p>
        )}
      </Panel>

      <Panel kicker="NEW SITE · GROK IMAGINE + UNIQUE UI">
        <p className="mt-3 text-sm text-mute">
          Does not stop a live site. Imagine paints the mascot and hero for this niche, then a random professional
          layout is generated from scratch.
        </p>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="A dog in a hat that only barks at snipers"
          className="mt-3 w-full rounded-2xl border border-line bg-void/50 px-4 py-3 text-sm text-ghost outline-none"
        />
        <button
          type="button"
          disabled={busy || idea.trim().length < 2}
          onClick={() => void act("draft", { idea: idea.trim() })}
          className="btn-acid mt-3 rounded-full px-8 py-3 text-sm tracking-[0.2em] disabled:opacity-40"
        >
          {busy ? "Imagine is painting the mascot…" : "BUILD SITE + WALLET"}
        </button>
      </Panel>

      {p?.id && sites.some((s) => s.id === p.id) ? (
        <>
          <Panel kicker="2 · WEBSITE · IDENTITY + METADATA">
            <p className="mt-3 text-sm text-mute">
              Name, ticker, logo, and socials write through the live site, the tab title, and the token metadata JSON
              the mint uses. Same fields as the $SPHA launcher.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/m/${encodeURIComponent(p.handle)}/art?v=${encodeURIComponent((p.image || "").slice(-32))}`} alt="" className="h-20 w-20 rounded-2xl object-cover" />
              {p.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/m/${encodeURIComponent(p.handle)}/art?kind=hero&v=${encodeURIComponent((p.heroImage || "").slice(-32))}`} alt="" className="h-20 w-32 rounded-2xl object-cover" />
              ) : null}
              <label className="btn-ghost cursor-pointer rounded-full px-4 py-2 text-sm">
                {busy ? "Saving logo…" : "Replace logo"}
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.webp,.avif,.gif,.bmp,.tif,.tiff,.svg,.ico,.jpg,.jpeg,.png"
                  hidden
                  disabled={busy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setBusy(true);
                    setErr("");
                    try {
                      const ready = await prepareSiteImage(f);
                      const fd = new FormData();
                      fd.append("file", ready, ready.name);
                      const r = await fetch("/api/admin/tools/launcher-v3/art", { method: "POST", body: fd });
                      const j = await r.json();
                      if (!r.ok) throw new Error(j.message || j.error || "Logo failed.");
                      await load();
                    } catch (er) {
                      setErr(er instanceof Error ? er.message : "Logo failed.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="font-mono text-[10px] tracking-[0.16em] text-mute">NAME</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 32))}
                  placeholder="VICE"
                  className="mt-1 w-full rounded-full border border-line bg-void px-4 py-2 text-sm text-ghost outline-none"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] tracking-[0.16em] text-mute">TICKER</span>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.replace(/^\$/, "").slice(0, 10).toUpperCase())}
                  placeholder="VICE"
                  disabled={Boolean(p.mint || p.pendingMint)}
                  className="mt-1 w-full rounded-full border border-line bg-void px-4 py-2 text-sm text-ghost outline-none disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] tracking-[0.16em] text-mute">X URL</span>
                <input
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  placeholder="https://x.com/yourhandle"
                  className="mt-1 w-full rounded-full border border-line bg-void px-4 py-2 text-sm text-ghost outline-none"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] tracking-[0.16em] text-mute">TELEGRAM URL</span>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="https://t.me/yourchannel"
                  className="mt-1 w-full rounded-full border border-line bg-void px-4 py-2 text-sm text-ghost outline-none"
                />
              </label>
            </div>
            <a href={p.website} target="_blank" rel="noreferrer" className="mt-3 inline-block font-mono text-[12px] text-acid">
              {p.website}
            </a>
            <span className="ml-3 font-mono text-[11px] text-mute">/m/{p.handle}</span>
            <div>
              <button
                type="button"
                disabled={busy || name.trim().length < 2 || symbol.trim().length < 2}
                onClick={() => void act("brand", { name: name.trim(), symbol: symbol.trim(), x, telegram })}
                className="btn-acid mt-3 rounded-full px-5 py-2 text-sm tracking-[0.16em] disabled:opacity-40"
              >
                Save identity
              </button>
            </div>
          </Panel>

          <Panel kicker="TOKENOMICS · MATCHES THE MINT">
            <p className="mt-3 text-sm text-mute">
              Total supply {fmtSupply(p.supply)}. Project bag {fmtSupply(p.teamTokens)} (8–11%) · curve{" "}
              {fmtSupply(p.curveTokens)}. T-30 mints the project slice into one isolated holdings wallet. STOP does not
              sell that bag.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {p.slices.map((s) => (
                <div key={s.id} className="rounded-2xl border border-line bg-void/40 px-4 py-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-ghost">{s.label}</span>
                    <span className="font-mono text-acid">{s.pct}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-mute">{fmtSupply(s.tokens)} tokens</div>
                  {s.wallet ? (
                    <button type="button" className="mt-1 font-mono text-[11px] text-ghost" onClick={() => copy(s.id, s.wallet)}>
                      {s.wallet.slice(0, 4)}…{s.wallet.slice(-4)}
                    </button>
                  ) : (
                    <div className="mt-1 font-mono text-[11px] text-mute">curve</div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel kicker="3 · ISOLATED LAUNCH WALLET · FUND FROM A CEX">
            <p className="mt-3 max-w-3xl text-sm text-mute">
              Fresh keypair. No hop from treasury, owner, V1, or V2. Load at least {fuel?.needSol ?? 0.2} SOL from a CEX
              for rent. No opening buy — the pool stays empty for snipers, same as $SPHA. Secrets stay on the server.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Mini k="Launch SOL" v={solAmt(fuel?.sol || 0)} />
              <Mini k="Need" v={solAmt(fuel?.needSol || 0.2)} />
              <Mini k="Hot key" v={fuel?.hot ? "yes" : "no"} />
              <Mini k="Ready" v={fuel?.enough ? "yes" : "fund it"} />
            </div>
            <div className="mt-4 rounded-2xl border border-acid/30 bg-acid/5 px-4 py-3">
              <div className="font-mono text-[10px] tracking-[0.2em] text-acid">CEX DEPOSIT ADDRESS</div>
              <button
                type="button"
                className="mt-2 break-all text-left font-mono text-sm text-ghost"
                onClick={() => copy("launch wallet", p.launchWallet)}
              >
                {p.launchWallet || "—"}
              </button>
            </div>
            {copied ? <p className="mt-2 font-mono text-[11px] text-acid">{copied} copied</p> : null}
          </Panel>

          {desk?.holdings?.wallet ? (
            <Panel kicker="3B · PROJECT HOLDINGS · 8–11% · DASHBOARD CONTROL">
              <p className="mt-3 max-w-3xl text-sm text-mute">
                Isolated project bag. Lands at T-30. Swap and send from panel 7. STOP leaves this wallet alone. Fund a
                little SOL here if you want to swap the bag.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Mini k="Holdings SOL" v={solAmt(desk.holdings.sol || 0)} />
                <Mini k="Token bag" v={fmtSupply(desk.holdings.tokens || 0)} />
                <Mini k="Hot key" v={desk.holdings.hot ? "yes" : "no"} />
                <Mini k="Share" v={p.slices.find((s) => s.id !== "lp")?.pct || "8–11%"} />
              </div>
              <div className="mt-4 rounded-2xl border border-acid/30 bg-acid/5 px-4 py-3">
                <div className="font-mono text-[10px] tracking-[0.2em] text-acid">HOLDINGS WALLET</div>
                <button
                  type="button"
                  className="mt-2 break-all text-left font-mono text-sm text-ghost"
                  onClick={() => copy("holdings wallet", desk.holdings?.wallet)}
                >
                  {desk.holdings.wallet}
                </button>
              </div>
            </Panel>
          ) : null}

          <Panel kicker="4 · COUNTDOWN · T-30 MINT · T-0 PUBLIC CA">
            {armed ? (
              <div className="mt-4 rounded-2xl border border-acid/30 bg-acid/5 p-4">
                <div className="font-mono text-[11px] tracking-[0.18em] text-acid">
                  {cd?.inMintWindow ? (p.pendingMint ? "CA READY · WAITING FOR T-0" : "MINT WINDOW") : p.status.toUpperCase()}
                </div>
                <div className="mt-2 font-mono text-2xl text-ghost">
                  {pad2(parts.d)}d {pad2(parts.h)}h {pad2(parts.m)}m {pad2(parts.s)}s
                </div>
                <p className="mt-1 font-mono text-[11px] text-mute">
                  T-0 {p.launchAt ? new Date(p.launchAt).toLocaleString() : "—"} · T-30 mint{" "}
                  {cd?.mintAt ? new Date(cd.mintAt).toLocaleString() : "—"}
                </p>
                {p.pendingMint ? (
                  <div className="mt-3">
                    <CopyCa ca={p.pendingMint} full />
                    <p className="mt-2 font-mono text-[11px] text-mute">Admin-only until the public clock hits zero.</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-mute">Cron and this desk mint at T-30 with the isolated launch wallet.</p>
                )}
                {p.error === "owner_sol" ? (
                  <p className="mt-2 text-sm text-acid">Launch wallet needs SOL for rent before T-30.</p>
                ) : null}
                {!p.pendingMint ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act("clearCountdown")}
                    className="btn-ghost mt-3 rounded-full px-4 py-1.5 text-sm"
                  >
                    Clear countdown
                  </button>
                ) : null}
              </div>
            ) : live && p.mint ? (
              <div className="mt-4">
                <p className="font-mono text-sm text-acid">Live. Public site shows the CA.</p>
                <div className="mt-3">
                  <CopyCa ca={p.mint} full />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-mute">
                  Pick T-0 in your local time. Mint fires 30 minutes earlier. Same T-30 window as $SPHA.
                </p>
                <div className="mt-3">
                  <LaunchWhenPicker date={date} time={time} onChange={(nextDate, nextTime) => {
                    setDate(nextDate);
                    setTime(nextTime);
                  }} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={busy || !countdownLeadOk(fromLocalDateTime(date, time)) || !fuel?.enough}
                    onClick={() => {
                      const launchAt = fromLocalDateTime(date, time);
                      if (!countdownLeadOk(launchAt)) return;
                      void act("arm", { launchAt });
                    }}
                    className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
                  >
                    {busy ? "Arming…" : "Arm countdown"}
                  </button>
                  {!fuel?.enough ? (
                    <span className="font-mono text-[11px] text-mute">Fund the launch wallet above, then Arm. You can still pick T-0 now.</span>
                  ) : null}
                </div>
              </div>
            )}
          </Panel>

          <Panel kicker="5 · SNIPER TAPE · ON-CHAIN LIVE">
            <p className="mt-3 text-sm text-mute">
              Unique wallets and SOL from the DBC pool tape, not Dexscreener. Curve SOL is the live quote vault.
              {p.snipers?.at ? ` Updated ${Math.max(0, Math.round((now - p.snipers.at) / 1000))}s ago.` : ""}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              <Mini k="Snipers" v={String(p.snipers?.snipers || 0)} />
              <Mini k="Buys" v={String(p.snipers?.buys || 0)} />
              <Mini k="Sells" v={String(p.snipers?.sells || 0)} />
              <Mini k="Buy SOL" v={solAmt(p.snipers?.buySol || 0)} />
              <Mini k="Curve SOL" v={solAmt(p.snipers?.curveSol || 0)} />
            </div>
            <Mini k="Bag quote" v={solAmt(p.bagQuoteSol || 0)} />
          </Panel>

          <Panel kicker="6 · STOP">
            <p className="mt-3 max-w-3xl text-sm text-mute">
              STOP sells every token on the launch wallet at 99% slippage, ends this bot so it cannot buy again, and
              sends leftover SOL to the owner wallet. The 8–11% project holdings stay.
            </p>
            {p.status === "stopped" ? (
              <p className="mt-2 font-mono text-[12px] text-acid">
                Bot ended.{p.returnedSol ? ` ${solAmt(p.returnedSol)} to owner.` : ""}
              </p>
            ) : p.returnedSol ? (
              <p className="mt-2 font-mono text-[12px] text-acid">Sold {solAmt(p.returnedSol)}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || !ca}
                onClick={() => {
                  if (!window.confirm("STOP? This sells the launch-wallet bag, ends this bot, and sends leftover SOL to the owner. Project holdings stay.")) return;
                  void act("stop");
                }}
                className="btn-acid rounded-full px-8 py-3 text-sm tracking-[0.2em] disabled:opacity-40"
              >
                {p.status === "stopped" ? "STOPPED · DRAIN AGAIN" : "STOP"}
              </button>
            </div>
          </Panel>

          {launched ? (
            <Panel kicker="7 · SWAP + SEND">
              <p className="mt-3 max-w-3xl text-sm text-mute">
                Launch wallet is for CEX fuel. STOP sells it and sends leftover SOL to the owner. Project holdings is the
                8–11% bag.
              </p>
              <div className="mt-4 flex flex-wrap gap-1">
                {(["launch", "holdings"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWalletDesk(w)}
                    className={`rounded-full px-3 py-1.5 font-mono text-[10px] ${walletDesk === w ? "bg-acid text-void" : "bg-white/8 text-white/50"}`}
                  >
                    {w === "launch" ? "launch wallet" : "project holdings"}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(["swap", "receive", "send"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setWalletTab(t)}
                    className={`rounded-full px-3 py-1.5 font-mono text-[10px] ${walletTab === t ? "bg-acid text-void" : "bg-white/8 text-white/50"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {walletTab === "swap" && walletDesk === "launch" && p.status === "stopped" ? (
                <p className="mt-3 text-sm text-mute">
                  This bot is ended. Launch-wallet tokens sold. Leftover SOL sent to the owner wallet.
                </p>
              ) : walletTab === "swap" && (walletDesk === "launch" ? p.launchWallet : desk?.holdings?.wallet) ? (
                <div className="mt-3">
                  <SwapWidget
                    key={`${walletDesk === "launch" ? p.launchWallet : desk?.holdings?.wallet}-${ca}`}
                    owner={(walletDesk === "launch" ? p.launchWallet : desk?.holdings?.wallet) || p.launchWallet}
                    defaultMint={ca}
                    defaultSymbol={p.symbol}
                    defaultName={p.name}
                    defaultImage={p.image}
                    defaultSide={walletDesk === "holdings" || p.status === "live" || p.status === "stopped" ? "sell" : "buy"}
                    widgetId={`v3-swap-${walletDesk === "launch" ? p.launchWallet : desk?.holdings?.wallet}`}
                    tokens={ca ? [{ mint: ca, symbol: p.symbol, name: p.name, image: p.image }] : undefined}
                    note={
                      walletDesk === "holdings"
                        ? "Project holdings. STOP leaves this bag. Fund a little SOL to swap."
                        : "Isolated launch wallet. STOP sells this bag and sends leftover SOL to the owner."
                    }
                    signTx={signLaunchSwap}
                    onDone={() => load().catch(() => {})}
                  />
                </div>
              ) : null}
              {walletTab === "receive" ? (
                <div className="mt-4 rounded-2xl border border-acid/30 bg-acid/5 px-4 py-3">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-acid">
                    {walletDesk === "holdings" ? "HOLDINGS WALLET" : "LAUNCH WALLET"}
                  </div>
                  <button
                    type="button"
                    className="mt-2 break-all text-left font-mono text-sm text-ghost"
                    onClick={() =>
                      copy(
                        walletDesk === "holdings" ? "holdings wallet" : "launch wallet",
                        walletDesk === "holdings" ? desk?.holdings?.wallet : p.launchWallet,
                      )
                    }
                  >
                    {walletDesk === "holdings" ? desk?.holdings?.wallet : p.launchWallet}
                  </button>
                  <p className="mt-2 font-mono text-[11px] text-mute">
                    {walletDesk === "holdings"
                      ? "8–11% bag lands here at T-30. Fund a little SOL to swap."
                      : p.status === "stopped"
                        ? "Bot ended. Leftover SOL went to the owner wallet."
                        : "Fund from a CEX. STOP sends leftover SOL to the owner."}
                  </p>
                </div>
              ) : null}
              {walletTab === "send" ? (
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <label className="block min-w-[280px] flex-1">
                    <span className="font-mono text-[10px] tracking-[0.16em] text-mute">CEX / DEST ADDRESS</span>
                    <input
                      value={dest}
                      onChange={(e) => setDest(e.target.value.trim())}
                      placeholder="Paste the address to receive SOL"
                      className="mt-1 w-full rounded-full border border-line bg-void px-4 py-2 font-mono text-sm text-ghost outline-none"
                    />
                  </label>
                  <label className="block w-36">
                    <span className="font-mono text-[10px] tracking-[0.16em] text-mute">SOL (blank = all)</span>
                    <input
                      value={sendAmt}
                      onChange={(e) => setSendAmt(e.target.value)}
                      placeholder="all leftover"
                      className="mt-1 w-full rounded-full border border-line bg-void px-4 py-2 font-mono text-sm text-ghost outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || dest.length < 32}
                    onClick={() => {
                      const n = Number(sendAmt);
                      const from = walletDesk === "holdings" ? desk?.holdings?.wallet : p.launchWallet;
                      void act("send", Number.isFinite(n) && n > 0 ? { dest, sol: n, from } : { dest, from });
                    }}
                    className="btn-ghost rounded-full px-5 py-2 text-sm disabled:opacity-40"
                  >
                    SEND SOL
                  </button>
                </div>
              ) : null}
            </Panel>
          ) : null}
        </>
      ) : null}

      {err ? <p className="text-sm text-blood">{err}</p> : null}
    </div>
  );
}
