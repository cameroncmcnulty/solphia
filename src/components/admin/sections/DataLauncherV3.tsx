"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyCa } from "@/components/CopyCa";
import { SwapWidget } from "@/components/SwapWidget";
import { copyText } from "@/lib/copyText";
import { pad2, splitRemaining, toDatetimeLocalValue } from "@/lib/token/countdown";
import { Mini, Panel, solAmt } from "../ui";

type Slice = { id: string; label: string; pct: string; bps: number; tokens: number; note: string; wallet: string };
type Snipers = { buys: number; sells: number; volumeSol: number; buySol: number; snipers: number; curveSol: number };

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
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [when, setWhen] = useState("");
  const [dest, setDest] = useState("");
  const [sendAmt, setSendAmt] = useState("");
  const [walletTab, setWalletTab] = useState<"swap" | "receive" | "send">("swap");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/tools/launcher-v3", { cache: "no-store" });
    const j = (await r.json()) as Desk & { error?: string; message?: string };
    if (!r.ok) throw new Error(j.message || j.error || "Could not load V3.");
    setDesk(j);
  }, []);

  useEffect(() => {
    load().catch((e) => setErr(e instanceof Error ? e.message : "Could not load V3."));
    const id = window.setInterval(() => {
      if (document.hidden) return;
      load().catch(() => {});
    }, 4_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!desk?.project?.id) return;
    setX(desk.project.x || "");
    setTelegram(desk.project.telegram || "");
    setWhen(desk.countdown?.launchAt ? toDatetimeLocalValue(desk.countdown.launchAt) : "");
  }, [desk?.project?.id, desk?.countdown?.launchAt, desk?.project?.x, desk?.project?.telegram]);

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setErr("");
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

  const p = desk?.project;
  const fuel = desk?.fuel;
  const cd = desk?.countdown;
  const sites = desk?.sites || [];
  const parts = splitRemaining(cd?.remainingMs || 0);
  const ca = p?.mint || p?.pendingMint || "";
  const live = p?.status === "live";
  const armed = Boolean(p?.launchAt && p.status !== "live" && p.status !== "stopped" && p.status !== "idle" && p.status !== "deleted");
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
        <div className="font-mono text-[10px] tracking-[0.3em] text-acid">DATA LAUNCHER V3 · SPHA REPLICA</div>
        <h2 className="mt-1 font-display text-3xl text-ghost">Idea → unique site → isolated $SPHA-path launch</h2>
        <p className="mt-2 max-w-3xl text-sm text-mute">
          Enter a token idea. Grok Imagine generates a niche mascot and cinematic hero, then V3 builds a unique
          high-tech memecoin website (randomized layout, type, motion, copy) at ticker.solphia.io. Tokenomics match the
          mint. Launch path is the official $SPHA T-30 replica on an isolated wallet. Open any site dashboard or
          unpublish it. Keys stay saved.
        </p>
      </section>

      <Panel kicker="SITES · OPEN DASHBOARD OR DELETE">
        <p className="mt-3 text-sm text-mute">
          Every drafted website lives here. OPEN DASHBOARD loads its wallet, countdown, and swap widget. DELETE
          unpublishes the public site. Launch wallet keys are never wiped.
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

      {p?.id ? (
        <>
          <Panel kicker="2 · WEBSITE">
            <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr]">
              <div className="flex gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                {p.heroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.heroImage} alt="" className="h-20 w-32 rounded-2xl object-cover" />
                ) : null}
              </div>
              <div>
                <div className="font-display text-2xl text-ghost">
                  {p.name} <span className="text-acid">${p.symbol}</span>
                </div>
                <p className="mt-1 text-sm text-mute">{p.blurb}</p>
                <div className="mt-1 font-mono text-[11px] text-mute">layout {p.layout || "glass"} · Imagine mascot + hero</div>
                <a href={p.website} target="_blank" rel="noreferrer" className="mt-2 inline-block font-mono text-[12px] text-acid">
                  {p.website}
                </a>
                <span className="ml-3 font-mono text-[11px] text-mute">also /m/{p.handle}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-mute">
              Add a wildcard DNS record for *.solphia.io on Vercel so ticker.solphia.io serves this site. Path /m/{p.handle}{" "}
              already works on solphia.io.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="font-mono text-[10px] tracking-[0.16em] text-mute">X URL (live 200)</span>
                <input
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  placeholder="https://x.com/yourhandle"
                  className="mt-1 w-full rounded-full border border-line bg-void px-4 py-2 text-sm text-ghost outline-none"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] tracking-[0.16em] text-mute">TELEGRAM URL (live 200)</span>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="https://t.me/yourchannel"
                  className="mt-1 w-full rounded-full border border-line bg-void px-4 py-2 text-sm text-ghost outline-none"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void act("socials", { x, telegram })}
              className="btn-ghost mt-3 rounded-full px-5 py-2 text-sm"
            >
              Save socials
            </button>
          </Panel>

          <Panel kicker="TOKENOMICS · MATCHES THE MINT">
            <p className="mt-3 text-sm text-mute">
              Total supply {fmtSupply(p.supply)}. Team {fmtSupply(p.teamTokens)} · curve {fmtSupply(p.curveTokens)}. These
              numbers are what T-30 mints.
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
              for rent plus the 0.05 opening buy. Secrets stay on the server.
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
                  <p className="mt-2 text-sm text-acid">Launch wallet needs SOL for rent plus 0.05 SOL for the opening buy before T-30.</p>
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
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] tracking-[0.16em] text-mute">T-0 LAUNCH TIME</span>
                  <input
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className="mt-1 block rounded-full border border-violet/30 bg-void px-4 py-2 text-sm text-ghost outline-none"
                  />
                  <span className="mt-1 block font-mono text-[10px] text-mute">Mint 30 minutes earlier. Same T-30 window as $SPHA.</span>
                </label>
                <button
                  type="button"
                  disabled={busy || !when || !fuel?.enough}
                  onClick={() => {
                    const launchAt = new Date(when).getTime();
                    void act("arm", { launchAt });
                  }}
                  className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
                >
                  {busy ? "Arming…" : "Arm countdown"}
                </button>
              </div>
            )}
          </Panel>

          <Panel kicker="5 · SNIPER TAPE">
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
              STOP sells every bag on the launch wallet and isolated team wallets at 99% slippage. SOL stays in that
              launch wallet until you send it from the swap widget to a CEX.
            </p>
            {p.returnedSol ? <p className="mt-2 font-mono text-[12px] text-acid">Sold {solAmt(p.returnedSol)}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || !ca}
                onClick={() => {
                  if (!window.confirm("STOP? This sells every V3 bag and leaves SOL in the isolated launch wallet.")) return;
                  void act("stop");
                }}
                className="btn-acid rounded-full px-8 py-3 text-sm tracking-[0.2em] disabled:opacity-40"
              >
                STOP
              </button>
            </div>
          </Panel>

          {launched ? (
            <Panel kicker="7 · LAUNCH WALLET · SWAP + SEND">
              <p className="mt-3 max-w-3xl text-sm text-mute">
                This widget is preloaded with the isolated launch wallet for this site. Swap and send from here. After
                STOP, SOL stays in this wallet until you send it to a CEX so you can fund the next launch.
              </p>
              <div className="mt-4 flex flex-wrap gap-1">
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
              {walletTab === "swap" ? (
                <div className="mt-3">
                  <SwapWidget
                    key={`${p.launchWallet}-${ca}`}
                    owner={p.launchWallet}
                    defaultMint={ca}
                    defaultSymbol={p.symbol}
                    defaultName={p.name}
                    defaultImage={p.image}
                    defaultSide={p.status === "live" || p.status === "stopped" ? "sell" : "buy"}
                    widgetId={`v3-swap-${p.launchWallet}`}
                    tokens={ca ? [{ mint: ca, symbol: p.symbol, name: p.name, image: p.image }] : undefined}
                    note="Isolated launch wallet. Liquidation stays here until you send it to a CEX."
                    signTx={signLaunchSwap}
                    onDone={() => load().catch(() => {})}
                  />
                </div>
              ) : null}
              {walletTab === "receive" ? (
                <div className="mt-4 rounded-2xl border border-acid/30 bg-acid/5 px-4 py-3">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-acid">LAUNCH WALLET</div>
                  <button
                    type="button"
                    className="mt-2 break-all text-left font-mono text-sm text-ghost"
                    onClick={() => copy("launch wallet", p.launchWallet)}
                  >
                    {p.launchWallet}
                  </button>
                  <p className="mt-2 font-mono text-[11px] text-mute">Fund from a CEX. SOL after STOP sits here.</p>
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
                      void act("send", Number.isFinite(n) && n > 0 ? { dest, sol: n } : { dest });
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
