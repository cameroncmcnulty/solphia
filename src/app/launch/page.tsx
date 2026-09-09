"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CopyCa } from "@/components/CopyCa";
import { SolphiaConstellation } from "@/components/SolphiaConstellation";
import { SparkCandles } from "@/components/SparkCandles";
import { SocialInput, TokenSocials } from "@/components/TokenSocials";
import { WalletConnect } from "@/components/WalletConnect";
import { useOwner } from "@/lib/hooks";
import {
  ANTI_SNIPE_MS,
  ANTI_SNIPE_SOL,
  MIN_TRADE_SOL,
  TOKEN_IMAGE_PX,
  buySupplyPct,
  emptyCurve,
  launchDevBuyCap,
  quoteBuy,
  quoteSell,
} from "@/lib/launch/curve";
import { launchError } from "@/lib/launch/errors";
import { loadOwner } from "@/lib/wallet/trading";

const TOKEN_PX = TOKEN_IMAGE_PX;
const STORE_PX = 512;
const PRESETS = [0.1, 0.25, 0.5, 1];
const DEV_CAP = launchDevBuyCap();

type Spark = { t: number; o: number; h: number; l: number; c: number };
type Coin = {
  id: string;
  mint?: string;
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
  maxBuySol?: number;
  devRewardsSol: number;
  volSol?: number;
  txns?: number;
  spark?: Spark[];
  fills: { at: number; side: "buy" | "sell"; sol: number; tokens: number }[];
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

function fmtUsd(n: number) {
  if (!(n > 0)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtSol(n: number, d = 3) {
  if (!(n > 0)) return "0";
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
  const s = (symbol || "").replace(/^\$+/, "").replace(/\*+$/, "").trim();
  return s ? `$${s}*` : "";
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
    if (side < 512) throw new Error("Use a square image at least 512×512.");
    const full = document.createElement("canvas");
    full.width = TOKEN_PX;
    full.height = TOKEN_PX;
    const fctx = full.getContext("2d");
    if (!fctx) throw new Error("Could not crop image.");
    fctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, TOKEN_PX, TOKEN_PX);
    const store = document.createElement("canvas");
    store.width = STORE_PX;
    store.height = STORE_PX;
    store.getContext("2d")?.drawImage(full, 0, 0, STORE_PX, STORE_PX);
    return store.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function mergeCoins(remote: Coin[], prev: Coin[]): Coin[] {
  if (!remote.length) return prev;
  const seen = new Set(remote.map((c) => c.id));
  return [...remote, ...prev.filter((c) => !seen.has(c.id))];
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
  const devPct = buySupplyPct(emptyCurve(), devBuy);

  async function refresh() {
    const q = owner ? `pubkey=${encodeURIComponent(owner)}` : "";
    const r = await fetch(`/api/launch?${q}`, { cache: "no-store" });
    const j = await r.json();
    if (j.solUsd) setSolUsd(j.solUsd);
    if (Array.isArray(j.coins)) {
      setCoins((prev) => mergeCoins(j.coins, prev));
      setOpen((cur) => (cur ? j.coins.find((c: Coin) => c.id === cur.id) || cur : cur));
    }
  }

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 8_000);
    return () => clearInterval(t);
  }, [owner]);

  async function act(body: Record<string, unknown>) {
    if (!owner) {
      setErr("Connect Phantom to launch or swap.");
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
        setCoins((prev) => [j.coin, ...prev.filter((c) => c.id !== j.coin.id)]);
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
        setMsg("Live. Mint and freeze are locked.");
      } else if (body.action === "withdraw_dev") setMsg("Dev rewards booked.");
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
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">LAUNCH · 1B · 1% SWAP · 50% TO DEV</p>
        <h1 className="mt-2 font-display text-4xl text-ghost sm:text-5xl">Fair launch. Swap like Phantom.</h1>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="panel-bubble rounded-3xl p-5">
            <h2 className="font-display text-2xl text-ghost">Create</h2>
            {!owner ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-mute">Phantom is the login.</p>
                <WalletConnect />
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-violet/40 bg-void"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center font-mono text-[10px] text-mute">art</span>
                    )}
                  </button>
                  <p className="text-sm text-mute">Square art, 512px min. We crop 1000×1000 for X, Telegram, Discord.</p>
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
                  placeholder="Name"
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
                  <span className="text-mute">*</span>
                </label>
                <input
                  value={blurb}
                  onChange={(e) => setBlurb(e.target.value)}
                  placeholder="One line (optional)"
                  className="mt-3 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 text-ghost"
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <SocialInput kind="website" value={website} onChange={setWebsite} placeholder="website.com" />
                  <SocialInput kind="x" value={x} onChange={setX} placeholder="@handle or x.com/…" />
                  <SocialInput kind="telegram" value={telegram} onChange={setTelegram} placeholder="t.me/…" />
                  <SocialInput kind="discord" value={discord} onChange={setDiscord} placeholder="discord.gg/…" />
                </div>
                <label className="mt-4 block">
                  <div className="flex justify-between text-sm">
                    <span className="text-mute">Dev buy</span>
                    <span className="font-mono text-acid">
                      {devBuy.toFixed(2)} SOL · {(devPct * 100).toFixed(2)}% of supply
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={DEV_CAP}
                    step={0.05}
                    value={Math.min(devBuy, DEV_CAP)}
                    onChange={(e) => setDevBuy(Number(e.target.value))}
                    className="mt-2 w-full accent-[#14f195]"
                  />
                  <p className="mt-1 text-xs text-mute">
                    Optional first buy. Capped at 5% of supply ({fmtSol(DEV_CAP, 2)} SOL at open) so a 2 SOL slide cannot
                    overbuy.
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
                    Launch
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="panel-bubble rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-ghost">{tab === "mine" ? "Yours" : "Tape"}</h2>
              {owner && (
                <div className="flex gap-1 rounded-full border border-violet/30 p-0.5 font-mono text-[10px]">
                  <button type="button" onClick={() => setTab("tape")} className={`rounded-full px-3 py-1 ${tab === "tape" ? "bg-acid/20 text-acid" : "text-mute"}`}>
                    All
                  </button>
                  <button type="button" onClick={() => setTab("mine")} className={`rounded-full px-3 py-1 ${tab === "mine" ? "bg-acid/20 text-acid" : "text-mute"}`}>
                    Mine
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
              {rows.length === 0 && <p className="text-sm text-mute">{tab === "mine" ? "Nothing launched yet." : "No coins yet."}</p>}
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
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left ${
        active ? "border-acid/50 bg-void/40" : "border-violet/20 hover:border-acid/40"
      }`}
    >
      {c.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
      ) : (
        <span className="h-12 w-12 rounded-xl bg-violet/20" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-lg text-ghost">{tick(c.symbol)}</span>
          <span className="truncate text-sm text-mute">{c.name}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-ghost">
            {c.marketCapUsd ? fmtUsd(c.marketCapUsd) : `${fmtSol(c.marketCapSol, 1)} SOL`}
          </span>
          <span className="font-mono text-[11px] text-mute">{fmtAge(Date.now() - c.createdAt)}</span>
          <TokenSocials links={c.links} />
          {c.mint ? <CopyCa ca={c.mint} compact /> : null}
        </div>
      </div>
      <SparkCandles candles={c.spark || []} up={(c.spark?.at(-1)?.c || 0) >= (c.spark?.[0]?.c || 0)} />
    </div>
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
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const creator = Boolean(owner && open.creator === owner);
  const snipeLeft = Math.max(0, ANTI_SNIPE_MS - (Date.now() - open.createdAt));
  const cap = open.maxBuySol ?? 0;
  const snipeCap = !creator && snipeLeft > 0 ? ANTI_SNIPE_SOL : Infinity;
  const maxOk = Math.min(cap || 40, snipeCap, 40);
  const quote = useMemo(() => {
    if (!open.curve || open.status !== "curve") return null;
    if (side === "buy") return quoteBuy(open.curve, sol);
    if (!(open.myTokens || 0)) return null;
    return quoteSell(open.curve, open.myTokens || 0);
  }, [open.curve, open.status, open.myTokens, sol, side]);
  const blocked =
    open.status !== "curve"
      ? "Graduated."
      : side === "sell"
        ? !(open.myTokens || 0)
          ? "You have no tokens."
          : ""
        : sol < MIN_TRADE_SOL
          ? `Min ${MIN_TRADE_SOL} SOL.`
          : sol > maxOk + 1e-9
            ? snipeLeft > 0 && !creator && sol > ANTI_SNIPE_SOL
              ? `First 60s: max ${ANTI_SNIPE_SOL} SOL.`
              : `5% wallet cap. Max ${fmtSol(maxOk, 3)} SOL.`
            : "";

  return (
    <section className="panel-bubble mt-6 grid gap-5 rounded-3xl p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {open.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="font-display text-3xl text-ghost">{tick(open.symbol)}</div>
              <div className="text-sm text-mute">{open.name}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TokenSocials links={open.links} size="md" />
                <CopyCa ca={open.mint} compact />
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost rounded-full px-4 py-2 text-sm">
            Close
          </button>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-violet/15 bg-void/30 p-3">
          <SparkCandles candles={open.spark || []} up={(open.spark?.at(-1)?.c || 0) >= (open.spark?.[0]?.c || 0)} width={640} height={140} className="h-36 w-full" />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-void">
          <div className="h-full bg-acid" style={{ width: `${Math.round(open.progress * 100)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Stat k="MC" v={open.marketCapUsd ? fmtUsd(open.marketCapUsd) : `${fmtSol(open.marketCapSol, 1)} SOL`} />
          <Stat k="Liq" v={`${fmtSol(open.liqSol || open.realSol, 2)} SOL`} />
          <Stat k="Vol" v={`${fmtSol(open.volSol || 0, 2)} SOL`} />
          <Stat k="Holders" v={String(open.holders)} />
        </div>
      </div>

      <div className="rounded-3xl border border-violet/20 bg-void/50 p-4">
        <div className="grid grid-cols-2 rounded-full border border-violet/30 p-1">
          <button type="button" onClick={() => setSide("buy")} className={`rounded-full py-2 text-sm ${side === "buy" ? "bg-acid/20 text-acid" : "text-mute"}`}>
            Buy
          </button>
          <button type="button" onClick={() => setSide("sell")} className={`rounded-full py-2 text-sm ${side === "sell" ? "bg-acid/20 text-acid" : "text-mute"}`}>
            Sell
          </button>
        </div>
        {!owner ? (
          <div className="mt-6">
            <WalletConnect />
          </div>
        ) : (
          <>
            <p className="mt-5 text-xs tracking-wide text-mute">{side === "buy" ? "You pay" : "You sell"}</p>
            <div className="mt-2 flex items-center justify-between rounded-2xl border border-violet/30 bg-void px-4 py-4">
              {side === "buy" ? (
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={sol}
                  onChange={(e) => setSol(Number(e.target.value))}
                  className="w-full bg-transparent font-display text-3xl text-ghost outline-none"
                />
              ) : (
                <div className="font-display text-3xl text-ghost">{fmtTok(open.myTokens || 0)}</div>
              )}
              <span className="shrink-0 font-mono text-sm text-mute">{side === "buy" ? "SOL" : tick(open.symbol)}</span>
            </div>
            {side === "buy" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSol(p)}
                    className={`rounded-full border px-3 py-1 font-mono text-[11px] ${Math.abs(sol - p) < 1e-9 ? "border-acid text-acid" : "border-violet/30 text-mute"}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSol(Math.max(MIN_TRADE_SOL, Math.floor(maxOk * 1000) / 1000))}
                  className="rounded-full border border-violet/30 px-3 py-1 font-mono text-[11px] text-mute"
                >
                  MAX
                </button>
              </div>
            )}
            <p className="mt-5 text-xs tracking-wide text-mute">You receive</p>
            <div className="mt-2 flex items-center justify-between rounded-2xl border border-violet/30 bg-void px-4 py-4">
              <div className="font-display text-3xl text-ghost">
                {quote && quote.ok ? (side === "buy" ? fmtTok(quote.tokensOut || 0) : fmtSol(quote.solOut || 0, 4)) : "—"}
              </div>
              <span className="font-mono text-sm text-mute">{side === "buy" ? tick(open.symbol) : "SOL"}</span>
            </div>
            {blocked && <p className="mt-3 text-sm text-blood">{blocked}</p>}
            <button
              type="button"
              disabled={busy || Boolean(blocked)}
              onClick={() =>
                side === "buy"
                  ? onAct({ action: "buy", id: open.id, sol })
                  : onAct({ action: "sell", id: open.id, tokens: open.myTokens || 0 })
              }
              className="btn-acid mt-5 min-h-[52px] w-full rounded-full disabled:opacity-40"
            >
              {side === "buy" ? `Buy ${tick(open.symbol)}` : `Sell ${tick(open.symbol)}`}
            </button>
            <p className="mt-3 text-center font-mono text-[11px] text-mute">
              1% fee · 50% to the dev · protocol share: listings, buybacks, burns
              {solUsd ? ` · SOL $${solUsd.toFixed(0)}` : ""}
            </p>
            {creator && (
              <button
                type="button"
                disabled={busy || !(open.devRewardsSol > 0)}
                onClick={() => onAct({ action: "withdraw_dev", id: open.id })}
                className="mt-3 w-full rounded-full border border-acid/40 py-2 text-sm text-acid disabled:opacity-40"
              >
                Withdraw {fmtSol(open.devRewardsSol, 4)} SOL rewards
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-violet/15 px-3 py-2">
      <div className="font-mono text-[10px] text-mute">{k}</div>
      <div className="font-display text-lg text-ghost">{v}</div>
    </div>
  );
}
