"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SolphiaConstellation } from "@/components/SolphiaConstellation";
import { SparkCandles } from "@/components/SparkCandles";
import { WalletConnect } from "@/components/WalletConnect";
import { useOwner } from "@/lib/hooks";
import {
  ANTI_SNIPE_MS,
  ANTI_SNIPE_SOL,
  DEV_BUY_MAX_SOL,
  MIN_TRADE_SOL,
  TOKEN_IMAGE_PX,
  quoteBuy,
  quoteSell,
} from "@/lib/launch/curve";
import { launchError } from "@/lib/launch/errors";
import { loadOwner } from "@/lib/wallet/trading";

const TOKEN_PX = TOKEN_IMAGE_PX;
const STORE_PX = 512;
const PRESETS = [0.1, 0.25, 0.5, 1];

type Spark = { t: number; o: number; h: number; l: number; c: number };
type Coin = {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  blurb: string;
  links?: { website?: string; x?: string; telegram?: string; discord?: string };
  creator: string;
  createdAt: number;
  status: "curve" | "graduated";
  priceSol: number;
  marketCapSol: number;
  marketCapUsd: number;
  progress: number;
  realSol: number;
  liqSol?: number;
  holders: number;
  myTokens?: number;
  mySpentSol?: number;
  maxBuySol?: number;
  devRewardsSol: number;
  volSol?: number;
  volBuySol?: number;
  volSellSol?: number;
  txns?: number;
  buys?: number;
  sells?: number;
  ageMs?: number;
  change5m?: number;
  change1h?: number;
  change6h?: number;
  change24h?: number;
  spark?: Spark[];
  fills: { at: number; side: "buy" | "sell"; sol: number; tokens: number; priceSol?: number }[];
  curve?: {
    virtualSol: number;
    virtualTokens: number;
    realSol: number;
    tokensSold: number;
    phase: "curve" | "graduated";
  };
};

function fmtAge(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function fmtPct(n?: number) {
  if (n == null || !Number.isFinite(n)) return "0.00%";
  const s = `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
  return s;
}

function fmtUsd(n: number) {
  if (!(n > 0)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtSol(n: number, d = 3) {
  if (!(n > 0)) return "0";
  if (n >= 1000) return n.toFixed(1);
  if (n >= 1) return n.toFixed(Math.min(d, 2));
  return n.toFixed(d);
}

function fmtTok(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function tick(symbol?: string) {
  const s = (symbol || "").replace(/^\$+/, "").trim();
  return s ? `$${s}` : "";
}

function pctClass(n?: number) {
  if (n == null || Math.abs(n) < 1e-8) return "text-mute";
  return n >= 0 ? "text-acid" : "text-blood";
}

async function squareTokenImage(file: File): Promise<string> {
  if (file.size > 4_000_000) throw new Error("Image must be under 4 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (side < 512) {
      throw new Error("Use a square-ish image at least 512×512. We crop 1000×1000 for X, Telegram, Discord, and Dexscreener.");
    }
    const full = document.createElement("canvas");
    full.width = TOKEN_PX;
    full.height = TOKEN_PX;
    const fctx = full.getContext("2d");
    if (!fctx) throw new Error("Could not crop image.");
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    fctx.drawImage(img, sx, sy, side, side, 0, 0, TOKEN_PX, TOKEN_PX);
    const store = document.createElement("canvas");
    store.width = STORE_PX;
    store.height = STORE_PX;
    const sctx = store.getContext("2d");
    if (!sctx) throw new Error("Could not compress image.");
    sctx.drawImage(full, 0, 0, STORE_PX, STORE_PX);
    return store.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function mergeCoins(remote: Coin[], prev: Coin[]): Coin[] {
  if (!remote.length) return prev;
  const seen = new Set(remote.map((c) => c.id));
  const extras = prev.filter((c) => !seen.has(c.id));
  return [...remote, ...extras];
}

export default function LaunchPage() {
  const connected = useOwner();
  const owner = connected || (typeof window !== "undefined" ? loadOwner() : null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [open, setOpen] = useState<Coin | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [blurb, setBlurb] = useState("");
  const [image, setImage] = useState("");
  const [website, setWebsite] = useState("");
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");
  const [devBuy, setDevBuy] = useState(0);
  const [sol, setSol] = useState(0.25);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [solUsd, setSolUsd] = useState(0);
  const [tab, setTab] = useState<"tape" | "mine">("tape");
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const q = owner ? `pubkey=${encodeURIComponent(owner)}` : "";
    const r = await fetch(`/api/launch?${q}`, { cache: "no-store" });
    const j = await r.json();
    if (j.solUsd) setSolUsd(j.solUsd);
    if (Array.isArray(j.coins)) {
      setCoins((prev) => mergeCoins(j.coins, prev));
      setOpen((cur) => {
        if (!cur) return cur;
        const fresh = j.coins.find((c: Coin) => c.id === cur.id);
        return fresh || cur;
      });
    }
  }

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 8_000);
    return () => clearInterval(t);
  }, [owner]);

  async function act(body: Record<string, unknown>) {
    if (!owner) {
      setErr("Connect Phantom to launch or trade. That wallet is your login.");
      return;
    }
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const r = await fetch("/api/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, pubkey: owner }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || launchError(j.error) || "failed");
      if (j.coin) {
        setOpen(j.coin);
        setCoins((prev) => {
          const rest = prev.filter((c) => c.id !== j.coin.id);
          return [j.coin, ...rest];
        });
      }
      await refresh();
      if (body.action === "create") {
        setName("");
        setSymbol("");
        setBlurb("");
        setImage("");
        setWebsite("");
        setX("");
        setTelegram("");
        setDiscord("");
        setDevBuy(0);
        setTab("tape");
        setMsg("Live on the curve. Mint and freeze authority are locked.");
      } else if (body.action === "withdraw_dev") setMsg("Dev rewards sent to your book.");
      else setMsg("Filled.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const mine = owner ? coins.filter((c) => c.creator === owner) : [];
  const rows = owner && tab === "mine" ? mine : coins;

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-x-hidden pb-24">
      <SolphiaConstellation />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">FAIR LAUNCH · 1B SUPPLY · 1% SWAP · 50% TO DEV</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl leading-tight text-ghost sm:text-6xl">
          Launch a coin. She keeps the curve honest.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-mute sm:text-lg">
          Total supply is 1,000,000,000 tokens — fixed at mint, never inflated. 800 million sit in a constant-product
          bonding curve (a virtual AMM): virtual reserves start at 30 SOL and ~1.073 billion tokens, and their product
          k stays fixed, so every buy lifts the price and every sell eases it. When 85 SOL of real buys have filled the
          curve, the remaining 200 million plus curve SOL lock into LP and the coin graduates. Mint authority and freeze
          authority are revoked at launch. 1% on each swap; 50% of that fee is paid to the dev.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="panel panel-glass rounded-3xl border-acid/20 p-5">
            <div className="font-mono text-[10px] tracking-[0.22em] text-violet">CREATE · FAIR</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">Name it. She’s live.</h2>
            {!owner ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-mute">
                  Phantom is the login. Connect to launch, track your coins, and withdraw dev rewards.
                </p>
                <WalletConnect />
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-violet/40 bg-void"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center px-2 text-center font-mono text-[10px] text-mute">
                        1000×1000
                      </span>
                    )}
                  </button>
                  <div className="min-w-0 text-sm text-mute">
                    Square token art. We crop to <span className="text-ghost">1000×1000</span> so it holds on the site,
                    X, Telegram, Discord, and Dexscreener, then compress for the tape. PNG/JPG, at least 512px.
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        setImage(await squareTokenImage(f));
                        setErr("");
                      } catch (er) {
                        setErr(er instanceof Error ? er.message : "image failed");
                      }
                    }}
                  />
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="name"
                  className="mt-4 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 text-ghost"
                />
                <label className="mt-3 flex w-full items-center rounded-2xl border border-violet/30 bg-void px-4 py-3 font-mono text-ghost">
                  <span className="pr-1 text-acid">$</span>
                  <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.replace(/^\$+/, "").toUpperCase())}
                    placeholder="TICKER"
                    maxLength={10}
                    className="w-full bg-transparent outline-none"
                  />
                </label>
                <textarea
                  value={blurb}
                  onChange={(e) => setBlurb(e.target.value)}
                  placeholder="one line (optional)"
                  className="mt-3 h-20 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 text-ghost"
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="website (optional)" className="rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost" />
                  <input value={x} onChange={(e) => setX(e.target.value)} placeholder="X / twitter (optional)" className="rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost" />
                  <input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="telegram (optional)" className="rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost" />
                  <input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="discord (optional)" className="rounded-2xl border border-violet/30 bg-void px-4 py-2 text-sm text-ghost" />
                </div>
                <label className="mt-4 block">
                  <div className="flex justify-between font-mono text-[11px] text-mute">
                    <span>Dev buy at launch</span>
                    <span className="text-acid">{devBuy.toFixed(2)} SOL</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={DEV_BUY_MAX_SOL}
                    step={0.05}
                    value={devBuy}
                    onChange={(e) => setDevBuy(Number(e.target.value))}
                    className="mt-2 w-full accent-[#14f195]"
                  />
                  <p className="mt-1 text-xs text-mute">
                    Optional first buy in the same launch, up to {DEV_BUY_MAX_SOL} SOL. Still capped at 2% of supply
                    (~0.58 SOL at open).
                  </p>
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <WalletConnect />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      act({
                        action: "create",
                        name,
                        symbol,
                        blurb,
                        image,
                        website,
                        x,
                        telegram,
                        discord,
                        launchBuySol: devBuy,
                      })
                    }
                    className="btn-acid min-h-[48px] rounded-full px-6 disabled:opacity-40"
                  >
                    Launch free
                  </button>
                </div>
                <p className="mt-3 font-mono text-[11px] text-mute">
                  Mint authority locked. Freeze authority locked. 800M on the curve, 200M into LP at 85 SOL.
                </p>
              </>
            )}
          </section>

          <section className="panel panel-glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[10px] tracking-[0.22em] text-violet">
                {tab === "mine" ? "YOUR COINS" : "TAPE"}
              </div>
              {owner && (
                <div className="flex gap-1 rounded-full border border-violet/30 p-0.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTab("tape")}
                    className={`rounded-full px-3 py-1 ${tab === "tape" ? "bg-acid/20 text-acid" : "text-mute"}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("mine")}
                    className={`rounded-full px-3 py-1 ${tab === "mine" ? "bg-acid/20 text-acid" : "text-mute"}`}
                  >
                    Mine
                  </button>
                </div>
              )}
            </div>
            <h2 className="mt-1 font-display text-2xl text-ghost">{tab === "mine" ? "Track & rewards" : "On the curve"}</h2>
            {owner && (
              <p className="mt-2 text-sm text-mute">
                Connected as {owner.slice(0, 4)}…{owner.slice(-4)}. Phantom is the login. Manage launches and pull 50%
                swap fees as dev rewards.
              </p>
            )}
            <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
              {rows.length === 0 && (
                <p className="text-sm text-mute">{tab === "mine" ? "You have not launched yet." : "No coins yet. Be first."}</p>
              )}
              {rows.map((c) => (
                <CoinCard key={c.id} c={c} solUsd={solUsd} active={open?.id === c.id} onOpen={() => setOpen(c)} />
              ))}
            </div>
          </section>
        </div>

        {open && (
          <CoinDesk
            open={open}
            owner={owner}
            sol={sol}
            setSol={setSol}
            solUsd={solUsd}
            busy={busy}
            onClose={() => setOpen(null)}
            onAct={act}
          />
        )}

        {err && (
          <p className="relative z-10 mt-4 rounded-2xl border border-blood/50 bg-blood/10 px-4 py-3 font-mono text-sm text-blood">
            {err}
          </p>
        )}
        {msg && !err && <p className="relative z-10 mt-4 font-mono text-sm text-acid">{msg}</p>}
      </div>
    </main>
  );
}

function CoinCard({ c, solUsd, active, onOpen }: { c: Coin; solUsd: number; active: boolean; onOpen: () => void }) {
  const age = fmtAge(Date.now() - c.createdAt);
  const up = (c.change5m || 0) >= 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
        active ? "border-acid/50 bg-void/50" : "border-violet/20 hover:border-acid/40"
      }`}
    >
      <div className="flex items-start gap-3">
        {c.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image} alt="" className="h-11 w-11 rounded-xl object-cover" />
        ) : (
          <span className="h-11 w-11 rounded-xl bg-violet/20" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-lg text-ghost">{tick(c.symbol)}</span>
            <span className="truncate font-mono text-[11px] text-mute">{c.name}</span>
            <span className="ml-auto font-mono text-[10px] text-mute">{age}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px]">
            <span className="text-ghost">
              {c.marketCapUsd ? fmtUsd(c.marketCapUsd) : `${fmtSol(c.marketCapSol, 1)} SOL`} MC
            </span>
            <span className={pctClass(c.change5m)}>5m {fmtPct(c.change5m)}</span>
            <span className={pctClass(c.change1h)}>1h {fmtPct(c.change1h)}</span>
            <span className="text-mute">Vol {fmtSol(c.volSol || 0, 2)} SOL</span>
          </div>
        </div>
        <SparkCandles candles={c.spark || []} up={up} />
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 font-mono text-[10px] text-mute">
        <span>Liq {fmtSol(c.liqSol || c.realSol, 2)}</span>
        <span>{c.holders} mkrs</span>
        <span>
          {c.txns || 0} tx · {c.buys || 0}/{c.sells || 0}
        </span>
        <span className={pctClass(c.change6h)}>6h {fmtPct(c.change6h)}</span>
        <span>{c.status === "graduated" ? "grad" : `${Math.round(c.progress * 100)}% LP`}</span>
      </div>
      {solUsd > 0 && (
        <div className="mt-1 font-mono text-[10px] text-mute">
          {c.priceSol.toExponential(2)} SOL · ${((c.priceSol || 0) * solUsd).toExponential(2)}
        </div>
      )}
    </button>
  );
}

function CoinDesk({
  open,
  owner,
  sol,
  setSol,
  solUsd,
  busy,
  onClose,
  onAct,
}: {
  open: Coin;
  owner: string | null;
  sol: number;
  setSol: (n: number) => void;
  solUsd: number;
  busy: boolean;
  onClose: () => void;
  onAct: (body: Record<string, unknown>) => void;
}) {
  const age = fmtAge(Date.now() - open.createdAt);
  const snipeLeft = Math.max(0, ANTI_SNIPE_MS - (Date.now() - open.createdAt));
  const creator = Boolean(owner && open.creator === owner);
  const cap = open.maxBuySol ?? 0;
  const snipeCap = !creator && snipeLeft > 0 ? ANTI_SNIPE_SOL : Infinity;
  const maxOk = Math.min(cap || 40, snipeCap, 40);
  const quote = useMemo(() => {
    if (!open.curve || open.status !== "curve") return null;
    return quoteBuy(open.curve, sol);
  }, [open.curve, open.status, sol]);
  const sellQ = useMemo(() => {
    if (!open.curve || !(open.myTokens || 0)) return null;
    return quoteSell(open.curve, open.myTokens || 0);
  }, [open.curve, open.myTokens]);
  const blocked =
    open.status !== "curve"
      ? "This coin already graduated."
      : sol < MIN_TRADE_SOL
        ? `Minimum trade is ${MIN_TRADE_SOL} SOL.`
        : sol > maxOk + 1e-9
          ? snipeLeft > 0 && !creator && sol > ANTI_SNIPE_SOL
            ? `First 60 seconds: max ${ANTI_SNIPE_SOL} SOL per buy (${Math.ceil(snipeLeft / 1000)}s left).`
            : `2% wallet cap. You can buy up to ${fmtSol(maxOk, 3)} SOL at this price.`
          : "";

  return (
    <section className="panel panel-glass mt-6 rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {open.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={open.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          ) : null}
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-acid">{tick(open.symbol)}</div>
            <h2 className="font-display text-3xl text-ghost">{open.name}</h2>
            <p className="mt-1 text-sm text-mute">{open.blurb || "Fair launch. Mint and freeze locked."}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost rounded-full px-4 py-2 text-sm">
          Close
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[11px] text-mute">
        {open.links?.website && (
          <a href={open.links.website} target="_blank" rel="noreferrer" className="text-acid">
            web
          </a>
        )}
        {open.links?.x && (
          <a href={open.links.x} target="_blank" rel="noreferrer" className="text-acid">
            X
          </a>
        )}
        {open.links?.telegram && (
          <a href={open.links.telegram} target="_blank" rel="noreferrer" className="text-acid">
            telegram
          </a>
        )}
        {open.links?.discord && (
          <a href={open.links.discord} target="_blank" rel="noreferrer" className="text-acid">
            discord
          </a>
        )}
        <span>age {age}</span>
        <span>mint locked · freeze locked</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-violet/20 bg-void/40 p-3">
        <SparkCandles
          candles={open.spark || []}
          up={(open.change5m || 0) >= 0}
          width={640}
          height={160}
          className="h-40 w-full"
        />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-void">
        <div className="h-full bg-acid" style={{ width: `${Math.round(open.progress * 100)}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Mini k="MC" v={open.marketCapUsd ? fmtUsd(open.marketCapUsd) : `${fmtSol(open.marketCapSol, 1)} SOL`} />
        <Mini k="Price" v={`${open.priceSol.toExponential(2)} SOL`} />
        <Mini k="Liq" v={`${fmtSol(open.liqSol || open.realSol, 2)} SOL`} />
        <Mini k="Vol" v={`${fmtSol(open.volSol || 0, 2)} SOL`} />
        <Mini k="5m" v={fmtPct(open.change5m)} c={pctClass(open.change5m)} />
        <Mini k="1h" v={fmtPct(open.change1h)} c={pctClass(open.change1h)} />
        <Mini k="6h" v={fmtPct(open.change6h)} c={pctClass(open.change6h)} />
        <Mini k="Txns" v={`${open.txns || 0} · ${open.buys || 0}/${open.sells || 0}`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini k="Holders" v={String(open.holders)} />
        <Mini k="Curve SOL" v={fmtSol(open.realSol, 2)} />
        <Mini k="To LP" v={`${Math.round(open.progress * 100)}%`} />
        <Mini k="Dev rewards" v={`${fmtSol(open.devRewardsSol, 4)} SOL`} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!owner ? (
          <WalletConnect />
        ) : (
          <>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSol(p)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[11px] ${
                  Math.abs(sol - p) < 1e-9 ? "border-acid text-acid" : "border-violet/30 text-mute"
                }`}
              >
                {p} SOL
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSol(Math.max(MIN_TRADE_SOL, Math.floor(maxOk * 1000) / 1000))}
              className="rounded-full border border-violet/30 px-3 py-1.5 font-mono text-[11px] text-mute"
            >
              MAX {fmtSol(maxOk, 3)}
            </button>
            <label className="flex items-center gap-2 rounded-full border border-violet/30 bg-void px-3 py-1.5">
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={sol}
                onChange={(e) => setSol(Number(e.target.value))}
                className="w-24 bg-transparent font-mono text-ghost outline-none"
              />
              <span className="font-mono text-[11px] text-mute">SOL</span>
            </label>
            <button
              type="button"
              disabled={busy || open.status !== "curve" || Boolean(blocked)}
              onClick={() => onAct({ action: "buy", id: open.id, sol })}
              className="btn-acid min-h-[44px] rounded-full px-5 disabled:opacity-40"
            >
              Buy {fmtSol(sol, 3)} SOL
            </button>
            <button
              type="button"
              disabled={busy || open.status !== "curve" || !(open.myTokens || 0)}
              onClick={() => onAct({ action: "sell", id: open.id, tokens: open.myTokens || 0 })}
              className="btn-ghost min-h-[44px] rounded-full px-5 disabled:opacity-40"
            >
              Sell all
            </button>
            {creator && (
              <button
                type="button"
                disabled={busy || !(open.devRewardsSol > 0)}
                onClick={() => onAct({ action: "withdraw_dev", id: open.id })}
                className="min-h-[44px] rounded-full border border-acid/40 px-5 text-sm text-acid disabled:opacity-40"
              >
                Withdraw dev rewards
              </button>
            )}
          </>
        )}
      </div>
      {blocked && owner && <p className="mt-3 font-mono text-sm text-blood">{blocked}</p>}
      {quote && quote.ok && !blocked && (
        <p className="mt-3 font-mono text-[11px] text-mute">
          You get ~{fmtTok(quote.tokensOut || 0)} {tick(open.symbol)} · impact {fmtPct(quote.impactPct)} · fee{" "}
          {fmtSol(quote.feeSol, 4)} SOL · 50% of that fee is paid to the dev
          {solUsd ? ` · ~${fmtUsd((sol || 0) * solUsd)}` : ""}
        </p>
      )}
      {sellQ && sellQ.ok && (open.myTokens || 0) > 0 && (
        <p className="mt-1 font-mono text-[11px] text-mute">
          Your bag {fmtTok(open.myTokens || 0)} {tick(open.symbol)} → ~{fmtSol(sellQ.solOut || 0, 4)} SOL if you sell all.
        </p>
      )}
      <p className="mt-2 font-mono text-[11px] text-mute">
        Wallet cap 2% of 1B (~{fmtSol(cap, 3)} SOL at this price). First minute max 1 SOL for everyone except the
        creator. 1% swap.
      </p>
      <div className="mt-4 max-h-40 space-y-1 overflow-auto font-mono text-[11px] text-mute">
        {open.fills.map((f, i) => (
          <div key={`${f.at}-${i}`} className={f.side === "buy" ? "text-acid" : "text-ghost"}>
            {f.side.toUpperCase()} {fmtSol(f.sol, 3)} SOL · {fmtTok(f.tokens)} {tick(open.symbol)}
          </div>
        ))}
      </div>
    </section>
  );
}

function Mini({ k, v, c }: { k: string; v: string; c?: string }) {
  return (
    <div className="rounded-2xl border border-violet/20 px-3 py-2">
      <div className="font-mono text-[10px] tracking-[0.16em] text-mute">{k}</div>
      <div className={`font-display text-lg ${c || "text-ghost"}`}>{v}</div>
    </div>
  );
}
