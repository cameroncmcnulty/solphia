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
import {
  IMAGE_DATA_MAX,
  launchCodeToField,
  validateLaunchCreate,
  type LaunchField,
} from "@/lib/launch/validate";
import { FieldError, FormAlert, fieldClass, useConfirmErrors } from "@/components/form/confirm";
import { loadOwner } from "@/lib/wallet/trading";
import { auditLaunchCoin, rankTape, type LaunchAudit } from "@/lib/launch/audit";
import { TAPE_BOARD, filterTape, sortTape, volumeIn, type AgeFilter, type VolWindow } from "@/lib/launch/tape";
import { MARKET_MIN_SCORE } from "@/lib/launch/market";

const TOKEN_PX = TOKEN_IMAGE_PX;
const STORE_PX = 512;
const PRESETS = [0.1, 0.25, 0.5, 1];
const DEV_CAP = launchDevBuyCap();

type Spark = { t: number; o: number; h: number; l: number; c: number };
type Coin = {
  id: string;
  mint?: string;
  born?: boolean;
  venue?: string;
  pairUrl?: string;
  liqUsd?: number;
  score?: number;
  grade?: string;
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
  vol5m?: number;
  vol30m?: number;
  vol1h?: number;
  vol6h?: number;
  vol24h?: number;
  txns?: number;
  txns5m?: number;
  txns1h?: number;
  buys?: number;
  sells?: number;
  buys1h?: number;
  sells1h?: number;
  unique1h?: number;
  uniqueAll?: number;
  top10HolderPct?: number;
  creatorHoldPct?: number;
  largestWalletPct?: number;
  bundleRatio?: number;
  devSoldPct?: number;
  deployerTokenCount?: number;
  deployerDeathRate?: number;
  creatorRecentLaunches?: number;
  change5m?: number;
  change1h?: number;
  change6h?: number;
  change24h?: number;
  spark?: Spark[];
  fills: { at: number; side: "buy" | "sell"; sol: number; tokens: number; owner?: string }[];
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
  return s ? `$${s}` : "";
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
    return jpegFit(store);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function jpegFit(canvas: HTMLCanvasElement, max = IMAGE_DATA_MAX): string {
  for (const q of [0.72, 0.6, 0.48, 0.36, 0.24]) {
    const data = canvas.toDataURL("image/jpeg", q);
    if (data.length <= max) return data;
  }
  const small = document.createElement("canvas");
  small.width = 384;
  small.height = 384;
  small.getContext("2d")?.drawImage(canvas, 0, 0, 384, 384);
  for (const q of [0.55, 0.4, 0.28]) {
    const data = small.toDataURL("image/jpeg", q);
    if (data.length <= max) return data;
  }
  throw new Error("Image is too heavy. Use a simpler square PNG or JPEG.");
}

function mergeCoins(remote: Coin[], prev: Coin[]): Coin[] {
  const seen = new Set(remote.map((c) => c.id));
  const keepBorn = prev.filter((c) => c.born && !seen.has(c.id));
  return [...remote, ...keepBorn];
}

function fmtPct(n?: number) {
  if (n == null || !Number.isFinite(n) || n === 0) return "0%";
  const pct = n * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function venueLabel(c: Coin) {
  if (c.born) return "SOLPHIA";
  if (c.venue === "pumpfun" || c.venue === "pumpswap") return "PUMP";
  if (c.venue === "raydium" || c.venue === "launchlab") return "RAY";
  if (c.venue === "meteora") return "MET";
  return "MKT";
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
  const createErr = useConfirmErrors<LaunchField>();
  const [busy, setBusy] = useState(false);
  const [solUsd, setSolUsd] = useState(0);
  const [tab, setTab] = useState<"tape" | "mine">("tape");
  const [age, setAge] = useState<AgeFilter>("newest");
  const [vol, setVol] = useState<VolWindow | null>(null);
  const [ranked, setRanked] = useState(false);
  const [source, setSource] = useState<"all" | "born" | "market">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const devPct = buySupplyPct(emptyCurve(), devBuy);

  async function refresh() {
    const q = owner ? `pubkey=${encodeURIComponent(owner)}` : "";
    const [pad, tape] = await Promise.all([
      fetch(`/api/launch?${q}`, { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/launch/tape", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ coins: [] })),
    ]);
    if (pad.solUsd) setSolUsd(pad.solUsd);
    else if (tape.solUsd) setSolUsd(tape.solUsd);
    const padCoins: Coin[] = Array.isArray(pad.coins) ? pad.coins.map((c: Coin) => ({ ...c, born: true })) : [];
    const padMints = new Set(padCoins.map((c) => c.mint).filter(Boolean));
    const market: Coin[] = Array.isArray(tape.coins)
      ? tape.coins.filter((c: Coin) => !c.mint || !padMints.has(c.mint))
      : [];
    const next = [...padCoins, ...market];
    setCoins((prev) => mergeCoins(next, prev));
    setOpen((cur) => (cur ? next.find((c) => c.id === cur.id) || cur : cur));
  }

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 8_000);
    return () => clearInterval(t);
  }, [owner]);

  function launchToken() {
    const issues = validateLaunchCreate({
      creator: owner || "",
      name,
      symbol,
      blurb,
      image,
      website,
      x,
      telegram,
      discord,
      launchBuySol: devBuy,
    });
    if (Object.keys(issues).length) {
      createErr.fail(issues);
      setErr("");
      return;
    }
    createErr.ok();
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
    });
  }

  async function act(body: Record<string, unknown>) {
    if (!owner) {
      if (body.action === "create") createErr.fail({ wallet: "Connect Phantom to launch." });
      else setErr("Connect Phantom to launch or swap.");
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
      if (!r.ok) {
        const code = typeof j.error === "string" ? j.error : "";
        const message = j.message || launchError(code) || "failed";
        if (body.action === "create") {
          const field = launchCodeToField(code);
          if (field !== "form") createErr.fail({ [field]: message } as Partial<Record<LaunchField, string>>, message);
          else createErr.fail({}, message);
        }
        throw new Error(message);
      }
      if (j.coin) {
        setOpen(j.coin);
        setCoins((prev) => [j.coin, ...prev.filter((c) => c.id !== j.coin.id)]);
      }
      await refresh();
      if (body.action === "create") {
        createErr.ok();
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
      if (body.action !== "create") setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const mine = owner ? coins.filter((c) => c.creator === owner && c.born) : [];
  const pool = owner && tab === "mine" ? mine : coins;
  const board = useMemo(() => {
    const sourced =
      tab === "mine"
        ? pool
        : source === "born"
          ? pool.filter((c) => c.born)
          : source === "market"
            ? pool.filter((c) => !c.born)
            : pool;
    const aged = filterTape(sourced, age);
    if (ranked) return rankTape(aged.filter((c) => c.born), solUsd);
    return sortTape(aged, vol).map((coin, i) => ({ coin, audit: coin.born ? auditLaunchCoin(coin, solUsd) : null, rank: i + 1 }));
  }, [pool, age, vol, ranked, solUsd, source, tab]);
  const rows = board.map((r) => r.coin);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-x-hidden pb-24">
      <SolphiaConstellation />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
        <p className="font-mono text-[11px] tracking-[0.28em] text-acid">LAUNCH · 1B · 1% SWAP · 50% TO DEV · 25% TO INVITER</p>
        <h1 className="mt-2 font-display text-4xl text-ghost sm:text-5xl">Fair launch. Swap like Phantom.</h1>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="panel-bubble overflow-hidden rounded-3xl p-5">
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
                    data-field="image"
                    onClick={() => fileRef.current?.click()}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-void ${fieldClass(createErr.errors.image, "border-violet/40")}`}
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center font-mono text-[10px] text-mute">art</span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-mute">Square art, 512px min. We crop 1000×1000 for X, Telegram, Discord. Optional.</p>
                    <FieldError error={createErr.errors.image} />
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
                        createErr.clear("image");
                        setErr("");
                      } catch (er) {
                        const message = er instanceof Error ? er.message : "image failed";
                        setImage("");
                        createErr.fail({ image: message }, message);
                      }
                    }}
                  />
                </div>
                <input
                  value={name}
                  data-field="name"
                  onChange={(e) => {
                    setName(e.target.value);
                    createErr.clear("name");
                  }}
                  placeholder="Name"
                  aria-invalid={Boolean(createErr.errors.name)}
                  className={`mt-4 w-full rounded-2xl border bg-void px-4 py-3 text-ghost ${fieldClass(createErr.errors.name)}`}
                />
                <FieldError error={createErr.errors.name} />
                <label
                  data-field="symbol"
                  className={`mt-3 flex w-full items-center rounded-2xl border bg-void px-4 py-3 font-mono text-ghost ${fieldClass(createErr.errors.symbol)}`}
                >
                  <span className="pr-1 text-acid">$</span>
                  <input
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value.replace(/^\$+/, "").toUpperCase());
                      createErr.clear("symbol");
                    }}
                    placeholder="TICKER"
                    maxLength={10}
                    aria-invalid={Boolean(createErr.errors.symbol)}
                    className="w-full bg-transparent outline-none"
                  />
                </label>
                <FieldError error={createErr.errors.symbol} />
                <input
                  value={blurb}
                  data-field="blurb"
                  onChange={(e) => {
                    setBlurb(e.target.value);
                    createErr.clear("blurb");
                  }}
                  placeholder="One line (optional)"
                  aria-invalid={Boolean(createErr.errors.blurb)}
                  className={`mt-3 w-full rounded-2xl border bg-void px-4 py-3 text-ghost ${fieldClass(createErr.errors.blurb)}`}
                />
                <FieldError error={createErr.errors.blurb} />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <SocialInput
                      kind="website"
                      value={website}
                      onChange={(v) => {
                        setWebsite(v);
                        createErr.clear("website");
                      }}
                      placeholder="website.com"
                      error={createErr.errors.website}
                    />
                    <FieldError error={createErr.errors.website} />
                  </div>
                  <div>
                    <SocialInput
                      kind="x"
                      value={x}
                      onChange={(v) => {
                        setX(v);
                        createErr.clear("x");
                      }}
                      placeholder="@handle or x.com/…"
                      error={createErr.errors.x}
                    />
                    <FieldError error={createErr.errors.x} />
                  </div>
                  <div>
                    <SocialInput
                      kind="telegram"
                      value={telegram}
                      onChange={(v) => {
                        setTelegram(v);
                        createErr.clear("telegram");
                      }}
                      placeholder="t.me/…"
                      error={createErr.errors.telegram}
                    />
                    <FieldError error={createErr.errors.telegram} />
                  </div>
                  <div>
                    <SocialInput
                      kind="discord"
                      value={discord}
                      onChange={(v) => {
                        setDiscord(v);
                        createErr.clear("discord");
                      }}
                      placeholder="discord.gg/…"
                      error={createErr.errors.discord}
                    />
                    <FieldError error={createErr.errors.discord} />
                  </div>
                </div>
                <label data-field="launchBuySol" className="mt-4 block">
                  <div className="flex justify-between text-sm">
                    <span className={createErr.errors.launchBuySol ? "text-blood" : "text-mute"}>Dev buy</span>
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
                    onChange={(e) => {
                      setDevBuy(Number(e.target.value));
                      createErr.clear("launchBuySol");
                    }}
                    className="mt-2 w-full accent-[#14f195]"
                  />
                  <FieldError error={createErr.errors.launchBuySol} />
                  <p className="mt-1 text-xs text-mute">
                    Optional first buy. Capped at 5% of supply ({fmtSol(DEV_CAP, 2)} SOL at open) so a 2 SOL slide cannot
                    overbuy.
                  </p>
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div data-field="wallet" className={createErr.errors.wallet ? "rounded-full ring-1 ring-blood/70" : undefined}>
                    <WalletConnect />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={launchToken}
                    className="btn-acid min-h-[48px] rounded-full px-6 disabled:opacity-40"
                  >
                    {busy ? "Launching…" : "Launch"}
                  </button>
                </div>
                <FieldError error={createErr.errors.wallet} />
                <div className="mt-3">
                  <FormAlert error={createErr.banner} />
                </div>
              </>
            )}
          </section>

          <section className="panel-bubble overflow-hidden rounded-3xl p-5">
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
            <div className="mt-3 space-y-2">
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-mute">SOURCE</div>
                <div className="mt-1 flex flex-wrap gap-1 rounded-2xl border border-violet/25 p-1">
                  {(["all", "born", "market"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setSource(k);
                        if (k === "market") setRanked(false);
                      }}
                      className={`rounded-full px-3 py-1 font-mono text-[10px] ${source === k ? "bg-acid/20 text-acid" : "text-mute hover:text-ghost"}`}
                    >
                      {k === "all" ? "ALL" : k === "born" ? "SOLPHIA" : "MARKET"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-mute">WHEN</div>
                <div className="mt-1 flex flex-wrap gap-1 rounded-2xl border border-violet/25 p-1">
                  {(["newest", "1h", "6h", "24h"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setAge(k)}
                      className={`rounded-full px-3 py-1 font-mono text-[10px] ${age === k ? "bg-acid/20 text-acid" : "text-mute hover:text-ghost"}`}
                    >
                      {k === "newest" ? "NEWEST" : k === "1h" ? "1 HR" : k === "6h" ? "6 HR" : "24 HR"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] text-mute">VOLUME</div>
                <div className={`mt-1 flex flex-wrap gap-1 rounded-2xl border border-violet/25 p-1 ${ranked ? "opacity-40" : ""}`}>
                  {(["5m", "30m", "1h", "6h", "24h"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setRanked(false);
                        setVol((cur) => (cur === k ? null : k));
                      }}
                      className={`rounded-full px-3 py-1 font-mono text-[10px] ${!ranked && vol === k ? "bg-acid/20 text-acid" : "text-mute hover:text-ghost"}`}
                    >
                      {k === "5m" ? "5 M" : k === "30m" ? "30 M" : k === "1h" ? "1 HR" : k === "6h" ? "6 HR" : "24 HR"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRanked((v) => !v);
                  if (!ranked) setVol(null);
                }}
                className={`w-full rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.16em] ${
                  ranked ? "btn-on" : "btn-ghost"
                }`}
              >
                RANKED · FULL AUDIT
              </button>
              {ranked && (
                <p className="text-[11px] leading-relaxed text-mute">
                  Solphia-born tokens are ranked by Solphia’s risk engine. Top {TAPE_BOARD} fill the board.
                </p>
              )}
              {!ranked && (
                <p className="text-[11px] leading-relaxed text-mute">
                  Market coins need a {MARKET_MIN_SCORE}+ safety score. Solphia-born always make the tape.
                </p>
              )}
            </div>
            {!ranked && (
              <div className="mt-3 hidden grid-cols-[minmax(0,1.4fr)_repeat(6,minmax(0,0.7fr))] gap-2 px-3 font-mono text-[10px] tracking-[0.14em] text-mute md:grid">
                <span>TOKEN</span>
                <span>AGE</span>
                <span>MC</span>
                <span>LIQ</span>
                <span>VOL</span>
                <span>24H</span>
                <span className="text-right">SCORE</span>
              </div>
            )}
            <div className={`mt-2 space-y-2 ${ranked ? "" : "max-h-[36rem] overflow-y-auto overflow-x-hidden"}`}>
              {rows.length === 0 && (
                <p className="text-sm text-mute">
                  {tab === "mine"
                    ? "Nothing launched yet."
                    : ranked
                      ? "Nothing in this window ranks yet."
                      : "No coins in this window passed the gate."}
                </p>
              )}
              {board.map((row) => (
                <CoinCard
                  key={row.coin.id}
                  c={row.coin}
                  solUsd={solUsd}
                  active={open?.id === row.coin.id}
                  onOpen={() => setOpen(row.coin)}
                  rank={ranked ? row.rank : 0}
                  audit={row.audit}
                  vol={ranked ? null : vol}
                />
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

function RankMark({ n }: { n: number }) {
  if (n === 1) {
    return (
      <span className="relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acid font-display text-sm text-void shadow-[inset_0_0_10px_rgba(255,255,255,0.35)]">
        1
        <span className="pointer-events-none absolute inset-x-0 -top-px text-center text-[8px] leading-none text-void/70">▴</span>
      </span>
    );
  }
  if (n === 2) {
    return (
      <span className="relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan font-display text-sm text-void shadow-[inset_0_0_10px_rgba(255,255,255,0.28)]">
        2
      </span>
    );
  }
  if (n === 3) {
    return (
      <span className="relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warn font-display text-sm text-void shadow-[inset_0_0_10px_rgba(255,255,255,0.22)]">
        3
      </span>
    );
  }
  return (
    <span className="relative z-[1] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet/40 font-mono text-[11px] text-mute">
      {n}
    </span>
  );
}

function eliteClass(rank: number, active: boolean) {
  if (rank === 1) return "border-acid/65 bg-acid/[0.07]";
  if (rank === 2) return "border-cyan/55 bg-cyan/[0.07]";
  if (rank === 3) return "border-warn/55 bg-warn/[0.07]";
  if (active) return "border-acid/40 bg-void/45";
  return "border-violet/20 bg-void/20 hover:border-acid/35 hover:bg-void/35";
}

function eliteGlow(rank: number) {
  if (rank === 1) return "inset 0 0 28px rgba(20,241,149,0.28), inset 0 0 0 1px rgba(20,241,149,0.4)";
  if (rank === 2) return "inset 0 0 24px rgba(128,234,255,0.22), inset 0 0 0 1px rgba(128,234,255,0.35)";
  if (rank === 3) return "inset 0 0 24px rgba(255,176,32,0.2), inset 0 0 0 1px rgba(255,176,32,0.32)";
  return undefined;
}

function CoinCard({
  c,
  solUsd,
  active,
  onOpen,
  rank,
  audit,
  vol,
}: {
  c: Coin;
  solUsd: number;
  active: boolean;
  onOpen: () => void;
  rank: number;
  audit: LaunchAudit | null;
  vol: VolWindow | null;
}) {
  const elite = rank > 0 && rank <= 3;
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
      className={`relative isolate flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left ${eliteClass(rank, active)}`}
    >
      {elite && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: eliteGlow(rank) }} />}
      {rank > 0 && <RankMark n={rank} />}
      {c.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.image} alt="" className={`relative z-[1] rounded-xl object-cover ${elite ? "h-14 w-14" : "h-12 w-12"}`} />
      ) : (
        <span className={`relative z-[1] rounded-xl bg-violet/20 ${elite ? "h-14 w-14" : "h-12 w-12"}`} />
      )}
      <div className="relative z-[1] min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate font-display text-ghost ${elite ? "text-xl" : "text-lg"}`}>{tick(c.symbol)}</span>
          <span className="truncate text-sm text-mute">{c.name}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] tracking-wide ${c.born ? "bg-acid/15 text-acid" : "bg-white/10 text-mute"}`}>
            {venueLabel(c)}
          </span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] md:grid-cols-6">
          <span className="text-mute md:hidden">{fmtAge(Date.now() - c.createdAt)}</span>
          <span className="hidden text-mute md:inline">{fmtAge(Date.now() - c.createdAt)}</span>
          <span className="text-ghost">{c.marketCapUsd ? fmtUsd(c.marketCapUsd) : `${fmtSol(c.marketCapSol, 1)} SOL`}</span>
          <span className="hidden text-mute md:inline">{c.liqUsd ? fmtUsd(c.liqUsd) : c.liqSol ? `${fmtSol(c.liqSol, 1)} SOL` : "—"}</span>
          <span className="hidden text-mute md:inline">
            {vol ? `${fmtSol(volumeIn(c, vol), 2)} SOL` : c.vol1h ? `${fmtSol(c.vol1h, 2)} SOL` : "—"}
          </span>
          <span className={(c.change24h || 0) >= 0 ? "text-acid" : "text-blood"}>{fmtPct(c.change24h)}</span>
          <span
            className={`justify-self-end rounded-full px-2 py-0.5 text-[10px] ${
              (audit?.grade || c.grade) === "S" || (audit?.grade || c.grade) === "A"
                ? "bg-acid/20 text-acid"
                : (audit?.grade || c.grade) === "B"
                  ? "bg-cyan/20 text-cyan"
                  : "bg-white/10 text-mute"
            }`}
          >
            {audit ? `${audit.grade} ${audit.score}` : c.score != null ? `${c.grade || ""} ${c.score}` : "—"}
          </span>
        </div>
        {audit && elite && <p className="mt-1 truncate font-mono text-[10px] text-mute">{audit.why}</p>}
      </div>
      <div className="relative z-[1] hidden overflow-hidden rounded-xl sm:block">
        <SparkCandles candles={c.spark || []} up={(c.spark?.at(-1)?.c || 0) >= (c.spark?.[0]?.c || 0)} />
      </div>
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
  const tradeErr = useConfirmErrors<"wallet" | "amount">();
  const audit = useMemo(() => auditLaunchCoin(open, solUsd), [open, solUsd]);
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
    <section className="panel-bubble mt-6 grid gap-5 overflow-hidden rounded-3xl p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
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
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${open.born ? "bg-acid/15 text-acid" : "bg-white/10 text-mute"}`}>
                  {venueLabel(open)}
                </span>
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
        <div className="mt-3 rounded-2xl border border-violet/20 bg-void/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-[10px] tracking-[0.22em] text-mute">FULL AUDIT</div>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                audit.grade === "S" || audit.grade === "A"
                  ? "bg-acid/20 text-acid"
                  : audit.grade === "B"
                    ? "bg-cyan/20 text-cyan"
                    : audit.vetoed
                      ? "bg-blood/20 text-blood"
                      : "bg-white/10 text-mute"
              }`}
            >
              {audit.grade} {audit.score} · {audit.verdict.toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-sm text-ghost">{audit.why}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {audit.factors
              .slice()
              .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
              .slice(0, 6)
              .map((f) => (
                <span
                  key={f.id}
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${f.delta >= 0 ? "bg-acid/10 text-acid" : "bg-blood/10 text-blood"}`}
                >
                  {f.delta >= 0 ? "+" : ""}
                  {f.delta} {f.label}
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-violet/20 bg-void/50 p-4">
        {!open.born ? (
          <div>
            <p className="font-display text-xl text-ghost">Trade off-pad</p>
            <p className="mt-2 text-sm text-mute">
              This is a market coin that cleared a {MARKET_MIN_SCORE}+ safety score. Solphia does not custody it. Swap on the venue it
              actually lives on.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={open.pairUrl || `https://dexscreener.com/solana/${open.mint}`}
                target="_blank"
                rel="noreferrer"
                className="btn-acid inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm"
              >
                Open Dexscreener
              </a>
              {(open.venue === "pumpfun" || open.venue === "pumpswap") && open.mint && (
                <a
                  href={`https://pump.fun/${open.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm"
                >
                  Open Pump.fun
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
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
            <div
              data-field="amount"
              className={`mt-2 flex items-center justify-between rounded-2xl border bg-void px-4 py-4 ${fieldClass(tradeErr.errors.amount)}`}
            >
              {side === "buy" ? (
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={sol}
                  onChange={(e) => {
                    setSol(Number(e.target.value));
                    tradeErr.clear("amount");
                  }}
                  aria-invalid={Boolean(tradeErr.errors.amount)}
                  className="w-full bg-transparent font-display text-3xl text-ghost outline-none"
                />
              ) : (
                <div className="font-display text-3xl text-ghost">{fmtTok(open.myTokens || 0)}</div>
              )}
              <span className="shrink-0 font-mono text-sm text-mute">{side === "buy" ? "SOL" : tick(open.symbol)}</span>
            </div>
            <FieldError error={tradeErr.errors.amount} />
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
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!owner) {
                  tradeErr.fail({ wallet: "Connect Phantom to swap." });
                  return;
                }
                if (blocked) {
                  tradeErr.fail({ amount: blocked });
                  return;
                }
                tradeErr.ok();
                if (side === "buy") onAct({ action: "buy", id: open.id, sol });
                else onAct({ action: "sell", id: open.id, tokens: open.myTokens || 0 });
              }}
              className="btn-acid mt-5 min-h-[52px] w-full rounded-full disabled:opacity-40"
            >
              {side === "buy" ? `Buy ${tick(open.symbol)}` : `Sell ${tick(open.symbol)}`}
            </button>
            <div className="mt-3">
              <FormAlert error={tradeErr.banner} />
            </div>
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
