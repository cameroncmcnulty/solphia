"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Rocket } from "lucide-react";
import { Keypair } from "@solana/web3.js";
import { usePathname } from "next/navigation";
import { CopyCa } from "@/components/CopyCa";


import { TokenArt } from "@/components/TokenArt";
import { PumpCoinRow } from "@/components/PumpCoinRow";
import { TokenChart } from "@/components/TokenChart";
import { TokenSocials } from "@/components/TokenSocials";
import { WalletConnect } from "@/components/WalletConnect";
import { useOwner } from "@/lib/hooks";
import {
  ANTI_SNIPE_MS,
  ANTI_SNIPE_SOL,
  MIN_TRADE_SOL,
  buySupplyPct,
  emptyCurve,
  launchDevBuyCap,
  quoteBuy,
  quoteSell,
} from "@/lib/launch/curve";
import { launchError } from "@/lib/launch/errors";
import {
  NAME_MAX,
  NAME_MIN,
  TICKER_MAX,
  TICKER_MIN,
  launchCodeToField,
  validateLaunchCreate,
  type LaunchField,
} from "@/lib/launch/validate";
import { FieldError, FormAlert, SafeField, fieldClass, useConfirmErrors } from "@/components/form/confirm";
import { loadOwner, signPhantomAndSend } from "@/lib/wallet/trading";
import { asTxB64 } from "@/lib/solana/wire";
import { mintPda, newMintNonce, nonceToB64 } from "@/lib/launch/pda";
import { dbcEnabled } from "@/lib/launch/dbcIds";

import { auditLaunchCoin, rankTape, scoreTape, type LaunchAudit } from "@/lib/launch/audit";
import { BoostBuy, BoostRail, fmtLeft } from "@/components/BoostBuy";

import { TokenImageCrop, readLaunchImage, type CropSource } from "@/components/TokenImageCrop";
import { yourLaunches } from "@/lib/launch/yours";
import { clearPending, loadPending, savePending, type PendingLaunch } from "@/lib/launch/pending";
import { hideLaunch, loadHidden } from "@/lib/launch/hidden";
import { PadPitch } from "@/components/PadPitch";
import { killNativeValidity } from "@/lib/killNativeValidity";

import { SwapBox, SwapShell, SwapTabs, SwapWidget } from "@/components/SwapWidget";
import type { BoostRank } from "@/lib/launch/boost";
import { filterTape, sortTape, volumeIn, type AgeFilter, type VolWindow } from "@/lib/launch/tape";
import { isSolanaAddress } from "@/lib/wallet/addr";
import { peekRef } from "@/components/ReferralCapture";


const PRESETS = [0.1, 0.25, 0.5, 1];
const DEV_CAP = launchDevBuyCap();

type Spark = { t: number; o: number; h: number; l: number; c: number };
type Coin = {
  id: string;
  mint?: string;
  born?: boolean;
  venue?: string;
  pairAddress?: string;
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
  creatorFeesSol?: number;
  creatorUnclaimedSol?: number;
  partnerFeesSol?: number;
  partnerUnclaimedSol?: number;
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

function LengthHint({
  n,
  min,
  max,
  empty,
  short,
  error,
}: {
  n: number;
  min: number;
  max: number;
  empty: string;
  short: string;
  error?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="mt-1.5 font-mono text-[11px] leading-snug text-blood">
        {error}
      </p>
    );
  }
  const bad = n > 0 && (n < min || n > max);
  return (
    <p className={`mt-1.5 font-mono text-[11px] leading-snug ${bad ? "text-blood" : "text-mute"}`}>
      {n === 0 ? empty : n < min ? `${n}/${max} — ${short}` : `${n}/${max}`}
    </p>
  );
}

async function waitForPhantomRoute(mint: string): Promise<{ ok: boolean; via?: string }> {
  for (let i = 0; i < 8; i++) {
    try {
      const r = await fetch(`/api/launch/jup?mint=${encodeURIComponent(mint)}`, { cache: "no-store" });
      const j = await r.json();
      if (j.ok) return { ok: true, via: typeof j.via === "string" ? j.via : undefined };
    } catch {
      /* keep polling */
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  return { ok: false };
}

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

function fmtPx(n?: number) {
  if (!(n && n > 0)) return "—";
  if (n >= 1) return `$${n.toFixed(n >= 100 ? 2 : 4)}`;
  return `$${n.toPrecision(4)}`;
}

function venueLabel(c: Coin) {
  if (c.born) return "SOLPHIA";
  if (c.venue === "pumpfun" || c.venue === "pumpswap") return "PUMP";
  if (c.venue === "raydium" || c.venue === "launchlab") return "RAY";
  if (c.venue === "meteora") return "MET";
  return "MKT";
}

export default function LaunchPage() {
  const path = usePathname();
  const isSwap = path.startsWith("/swap");
  const connected = useOwner();
  const owner = connected || (typeof window !== "undefined" ? loadOwner() : null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [open, setOpen] = useState<Coin | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [blurb, setBlurb] = useState("");
  const [image, setImage] = useState("");
  const [cropSrc, setCropSrc] = useState<CropSource | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
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
  const [phase, setPhase] = useState<"live" | "graduated">("live");
  const [tapeSort, setTapeSort] = useState<"newest" | "mcap" | "vol5m" | "vol1h" | "rank">("newest");
  const [boostOpen, setBoostOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [boostRank, setBoostRank] = useState<BoostRank[]>([]);
  const [boostMine, setBoostMine] = useState<{
    live: { symbol: string; leftMs: number; rockets: number }[];
    queued: { symbol: string; position: number; etaMs: number; rockets: number }[];
  }>({ live: [], queued: [] });
  const [source, setSource] = useState<"all" | "born" | "market">("all");
  const [tapeLoading, setTapeLoading] = useState(true);
  const [caQuery, setCaQuery] = useState("");
  const [caBusy, setCaBusy] = useState(false);
  const [caErr, setCaErr] = useState("");
  const [lookedMint, setLookedMint] = useState<string | null>(null);
  const bootMint = useRef(false);
  const [snapAt, setSnapAt] = useState(0);
  const [pending, setPending] = useState<PendingLaunch[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [ownerWallet, setOwnerWallet] = useState("");
  const lastMintRef = useRef("");
  const cropUrlRef = useRef<string>("");
  const devPct = buySupplyPct(emptyCurve(), devBuy);

  useEffect(() => {
    setPending(loadPending());
    setHidden(loadHidden());
    return () => {
      if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open || !snapAt) return;
    const id = `desk-${open.id}`;
    let n = 0;
    const go = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
      if (n++ < 16) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }, [open?.id, snapAt]);

  async function refreshPad() {
    const q = owner ? `pubkey=${encodeURIComponent(owner)}` : "";
    const pad = await fetch(`/api/launch?${q}`, { cache: "no-store" }).then((r) => r.json());
    if (pad.solUsd) setSolUsd(pad.solUsd);
    if (typeof pad.ownerWallet === "string") setOwnerWallet(pad.ownerWallet);
    const padCoins: Coin[] = Array.isArray(pad.coins) ? pad.coins.map((c: Coin) => ({ ...c, born: true })) : [];
    setCoins((prev) => {
      const market = prev.filter((c) => !c.born);
      const next = [...padCoins, ...market];
      setOpen((cur) => (cur ? next.find((c) => c.id === cur.id) || cur : cur));
      return mergeCoins(next, prev.filter((c) => c.born));
    });
  }

  async function refreshBoosts() {
    const q = owner ? `?pubkey=${encodeURIComponent(owner)}` : "";
    const j = await fetch(`/api/launch/boost${q}`, { cache: "no-store" }).then((r) => r.json());
    const incoming = Array.isArray(j.ranked) ? j.ranked : Array.isArray(j.live) ? j.live : null;
    if (incoming) {
      setBoostRank((prev) => (incoming.length === 0 && prev.length > 0 ? prev : incoming));
    }
    if (j.mine) setBoostMine({ live: j.mine.live || [], queued: [] });
  }

  async function refreshTape() {
    try {
      const tape = await fetch("/api/launch/tape", { cache: "no-store" }).then((r) => r.json());
      if (tape.solUsd) setSolUsd((s) => s || tape.solUsd);
      if (Array.isArray(tape.ranked) && tape.ranked.length > 0) setBoostRank(tape.ranked);
      const market: Coin[] = Array.isArray(tape.coins) ? tape.coins : [];
      setCoins((prev) => {
        const padCoins = prev.filter((c) => c.born);
        const padMints = new Set(padCoins.map((c) => c.mint).filter(Boolean));
        const extra = market.filter((c) => !c.mint || !padMints.has(c.mint));
        const next = [...padCoins, ...extra];
        setOpen((cur) => (cur ? next.find((c) => c.id === cur.id) || cur : cur));
        return next;
      });
    } catch {
      /* keep whatever is on screen */
    } finally {
      setTapeLoading(false);
    }
  }

  useEffect(() => {
    setTab("tape");
  }, [isSwap]);

  useEffect(() => killNativeValidity(), []);

  async function absorbPending(p: PendingLaunch) {
    if (!owner) return;
    try {
      const r = await fetch("/api/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          pubkey: owner,
          mint: p.mint,
          sigs: p.sig ? [p.sig] : ["1111111111111111111111111111111111111111111111111111111111111111"],
          name: p.name,
          symbol: p.symbol,
          image: p.image,
        }),
      });
      const j = await r.json();
      if (r.ok && j.coin) {
        clearPending(p.mint);
        setPending(loadPending());
        setCoins((prev) => [j.coin, ...prev.filter((c) => c.id !== j.coin.id)]);
      }
    } catch {
      /* stay on pending until they remove it */
    }
  }

  function removeFromDashboard(mint: string, symbol?: string) {
    const label = symbol ? `$${symbol}` : "this token";
    const ok = window.confirm(
      `Remove ${label} from your dashboard? This is permanent on this device. The token still exists on Solana.`,
    );
    if (!ok) return;
    hideLaunch(mint);
    clearPending(mint);
    setHidden(loadHidden());
    setPending(loadPending());
    setOpen((cur) => (cur?.mint === mint ? null : cur));
  }

  async function pickArtFile() {
    const file = await new Promise<File | null>((resolve) => {
      const i = document.createElement("input");
      i.type = "file";
      i.addEventListener(
        "invalid",
        (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
        },
        true,
      );
      const done = (f: File | null) => {
        i.onchange = null;
        window.removeEventListener("focus", onFocus);
        i.remove();
        resolve(f);
      };
      const onFocus = () => window.setTimeout(() => done(i.files?.[0] || null), 400);
      i.onchange = () => done(i.files?.[0] || null);
      window.addEventListener("focus", onFocus);
      i.click();
    });
    if (!file) return;
    try {
      const src = await readLaunchImage(file);
      if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current);
      cropUrlRef.current = src.url;
      setCropSrc(src);
      setCropOpen(true);
      createErr.clear("image");
      setErr("");
    } catch (er) {
      const message = er instanceof Error ? er.message : "image failed";
      setImage("");
      createErr.fail({ image: message }, message);
    }
  }

  useEffect(() => {
    refreshPad().catch(() => {});
    refreshTape().catch(() => setTapeLoading(false));
    refreshBoosts().catch(() => {});
    const padT = setInterval(() => refreshPad().catch(() => {}), 8_000);
    const tapeT = setInterval(() => refreshTape().catch(() => {}), 40_000);
    const boostT = setInterval(() => refreshBoosts().catch(() => {}), 8_000);
    return () => {
      clearInterval(padT);
      clearInterval(tapeT);
      clearInterval(boostT);
    };
  }, [owner]);

  useEffect(() => {
    if (!owner) return;
    const leftover = loadPending().filter((p) => !hidden.includes(p.mint));
    leftover.forEach((p) => absorbPending(p).catch(() => {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("mint") || "";
    if (isSolanaAddress(q)) {
      setCaQuery(q);
      searchMint(q).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchMint(raw?: string) {
    const q = (raw ?? caQuery).trim();
    setCaErr("");
    if (!q) {
      setCaErr("Paste a mint address.");
      return;
    }
    const local = coins.find((c) => {
      if (c.mint && c.mint === q) return true;
      const sym = (c.symbol || "").replace(/^\$+/, "").toLowerCase();
      return sym && sym === q.replace(/^\$+/, "").toLowerCase();
    });
    if (local) {
      setOpen(local);
      setLookedMint(local.mint || local.id);
      setTab("tape");
      return;
    }
    if (!isSolanaAddress(q)) {
      setCaErr("Paste a mint address to look up a token off the tape.");
      return;
    }
    setCaBusy(true);
    try {
      const r = await fetch(`/api/launch/lookup?mint=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.coin) {
        setCaErr(j.error === "not_found" ? "No token at that mint." : j.error || "Lookup failed.");
        return;
      }
      const coin = j.coin as Coin;
      if (j.solUsd) setSolUsd((s) => s || j.solUsd);
      setCoins((prev) => [coin, ...prev.filter((c) => c.mint !== coin.mint && c.id !== coin.id)]);
      setOpen(coin);
      setLookedMint(coin.mint || coin.id);
      setTab("tape");
    } catch (e) {
      setCaErr(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setCaBusy(false);
    }
  }

  useEffect(() => {
    if (!isSwap || bootMint.current) return;
    const mint = new URLSearchParams(window.location.search).get("mint") || "";
    if (!mint || !isSolanaAddress(mint)) return;
    bootMint.current = true;
    setCaQuery(mint);
    const t = window.setTimeout(() => {
      searchMint(mint).catch(() => {});
    }, 500);
    return () => window.clearTimeout(t);
  }, [isSwap]);

  async function launchToken() {
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
    if (!owner) {
      createErr.fail({ wallet: "Connect your wallet to launch." });
      return;
    }
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const useDbc = dbcEnabled();
      const mintKp = useDbc ? Keypair.generate() : null;
      const nonce = useDbc ? null : newMintNonce();
      const mintPk = mintKp ? mintKp.publicKey.toBase58() : mintPda(owner, nonce!).toBase58();
      lastMintRef.current = mintPk;
      savePending({ mint: mintPk, name: name.trim(), symbol: symbol.trim().toUpperCase(), image, at: Date.now() });
      setPending(loadPending());
      setMsg("Building the Solphia curve… CA " + mintPk);
      const prep = await fetch("/api/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          pubkey: owner,
          mint: mintPk,
          nonce: nonce ? nonceToB64(nonce) : undefined,
          name,
          symbol,
          blurb,
          image,
          website,
          x,
          telegram,
          discord,
          launchBuySol: devBuy,
          referrer: peekRef() || undefined,
        }),
        signal: AbortSignal.timeout(28_000),
      });
      const prepText = await prep.text();
      let pj: Record<string, unknown> = {};
      try {
        pj = JSON.parse(prepText) as Record<string, unknown>;
      } catch {
        throw new Error("Launch API is down (" + prep.status + "). Wait a few seconds and try again.");
      }
      let packed = "";
      try {
        packed = asTxB64(pj.tx ?? (Array.isArray(pj.txs) ? pj.txs[0] : ""));
      } catch {
        packed = "";
      }
      if (!prep.ok || !packed) {
        const code = typeof pj.error === "string" ? pj.error : "";
        const message =
          (typeof pj.message === "string" && pj.message) ||
          launchError(code) ||
          "Could not build the launch.";
        const field = launchCodeToField(code);
        if (field !== "form") createErr.fail({ [field]: message } as Partial<Record<LaunchField, string>>, message);
        else createErr.fail({}, message);
        throw new Error(message);
      }
      setMsg("Sign once in Phantom… CA " + mintPk);
      const sig = await signPhantomAndSend(packed, mintKp || undefined);
      savePending({ mint: mintPk, name: name.trim(), symbol: symbol.trim().toUpperCase(), image, at: Date.now(), sig });
      setPending(loadPending());
      setMsg("Waiting for the curve on Solana… CA " + mintPk);
      const confirmBody = {
        action: "confirm",
        pubkey: owner,
        mint: mintPk,
        sigs: [sig],
        tokens: Number(pj.tokensOut) || 0,
        name,
        symbol,
        blurb,
        image: pj.image || image,
        website,
        x,
        telegram,
        discord,
        launchBuySol: devBuy,
        uri: pj.uri,
        referrer: peekRef() || undefined,
      };
      let r = await fetch("/api/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(confirmBody),
      });
      let j = await r.json();
      for (let i = 0; i < 4 && !r.ok && j.error === "curve_missing"; i++) {
        setMsg("Signature is in. Waiting on Solana…");
        await new Promise((res) => setTimeout(res, 2000));
        r = await fetch("/api/launch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(confirmBody),
        });
        j = await r.json();
      }
      if (!r.ok) {
        const code = typeof j.error === "string" ? j.error : "";
        const message = j.message || launchError(code) || "Curve landed but the pad could not list it yet.";
        createErr.fail({}, message);
        throw new Error(message);
      }
      if (j.coin) {
        setOpen(j.coin);
        setCoins((prev) => [j.coin, ...prev.filter((c) => c.id !== j.coin.id)]);
      }
      await Promise.all([refreshPad(), refreshTape()]);
      createErr.ok();
      setName("");
      setSymbol("");
      setBlurb("");
      setImage("");
      if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current);
      cropUrlRef.current = "";
      setCropSrc(null);
      setCropOpen(false);
      setWebsite("");
      setX("");
      setTelegram("");
      setDiscord("");
      setDevBuy(0);
      clearPending(mintPk);
      setPending(loadPending());
      setTab("mine");
      setBusy(false);
      setMsg(
        devBuy > 0
          ? `Live on Meteora DBC. CA ${mintPk}. First buy is in this wallet. Checking Phantom Swap…`
          : `Live on Meteora DBC. CA ${mintPk}. Supply sits on the curve. Checking Phantom Swap…`,
      );
      const routed = await waitForPhantomRoute(mintPk);
      setMsg(
        routed.ok
          ? `Live. Phantom Swap can buy ${symbol || "it"} now${routed.via ? ` via ${routed.via}` : ""}. CA ${mintPk}`
          : `Live on the curve. CA ${mintPk}. Jupiter is still indexing — paste the CA into Phantom Swap in a minute.`,
      );
    } catch (e) {
      const timed = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      if (!createErr.banner) {
        const raw = e instanceof Error ? e.message : "launch failed";
        const ca = lastMintRef.current;
        const extra = ca ? ` CA ${ca}` : "";
        setErr((timed ? "Launch timed out building the curve. Try again." : raw) + extra);
      }
    } finally {
      setBusy(false);
    }
  }

  async function act(body: Record<string, unknown>) {
    if (!owner) {
      if (body.action === "create") createErr.fail({ wallet: "Connect your wallet to launch." });
      else setErr("Connect your wallet to launch or swap.");
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
      let listed = j;
      if (j.needsSign && j.transaction) {
        setMsg(j.claim ? "Sign the claim in Phantom…" : "Sign the swap in Phantom…");
        const sig = await signPhantomAndSend(j.transaction);
        if (j.claim) {
          setMsg(j.partner ? "Protocol fees claimed into this wallet." : "Creator fees claimed into this wallet.");
          await Promise.all([refreshPad(), refreshTape()]);
          return;
        }
        const conf = await fetch("/api/launch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "trade_confirm",
            pubkey: owner,
            id: body.id,
            mint: j.coin?.mint,
            side: body.action === "sell" ? "sell" : "buy",
            sol: body.action === "sell" ? j.solOut : body.sol,
            tokens: body.action === "sell" ? body.tokens : j.tokensOut,
            feeSol: j.feeSol,
            sig,
          }),
        });
        listed = await conf.json();
        if (!conf.ok) throw new Error(listed.message || launchError(listed.error) || "Trade landed but the tape missed it.");
      }
      if (listed.coin) {
        setOpen(listed.coin);
        setCoins((prev) => [listed.coin, ...prev.filter((c: { id: string }) => c.id !== listed.coin.id)]);
      }
      await Promise.all([refreshPad(), refreshTape()]);
      if (body.action === "create") {
        createErr.ok();
        setName("");
        setSymbol("");
        setBlurb("");
        setImage("");
        if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current);
        cropUrlRef.current = "";
        setCropSrc(null);
        setCropOpen(false);
        setWebsite("");
        setX("");
        setTelegram("");
        setDiscord("");
        setDevBuy(0);
        setTab("mine");
        setMsg("Live on Meteora DBC.");
      } else if (body.action === "withdraw_dev" || body.action === "withdraw_partner") setMsg("Fees claimed.");
      else setMsg("Filled. Tokens are in your wallet.");
    } catch (e) {
      if (body.action !== "create") setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const mine = yourLaunches(coins, owner).filter((c) => !hidden.includes(c.mint || ""));
  const claimable = mine.filter((c) => (c.creatorUnclaimedSol || 0) > 1e-6);
  const protocolClaimable = mine.filter((c) => (c.partnerUnclaimedSol || 0) > 1e-6);
  const generatedSol = mine.reduce((s, c) => s + (c.creatorFeesSol || c.devRewardsSol || 0), 0);
  const unclaimedSol = mine.reduce((s, c) => s + (c.creatorUnclaimedSol || 0), 0);
  const protocolGeneratedSol = mine.reduce((s, c) => s + (c.partnerFeesSol || 0), 0);
  const protocolUnclaimedSol = mine.reduce((s, c) => s + (c.partnerUnclaimedSol || 0), 0);
  const isProtocol = Boolean(owner && ownerWallet && owner === ownerWallet);
  const pool = isSwap ? coins : mine;
  const board = useMemo(() => {
    if (!isSwap) {
      const rows = mine
        .slice()
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .map((coin) => ({ coin, rank: 0, audit: undefined as undefined, boost: undefined as undefined }));
      return rows;
    }
    const sourced =
      source === "born"
        ? pool.filter((c) => c.born)
        : source === "market"
          ? pool.filter((c) => !c.born)
          : pool;
    const staged =
      phase === "graduated"
        ? sourced.filter((c) => c.status === "graduated")
        : sourced.filter((c) => c.status !== "graduated");
    const q = caQuery.trim().toLowerCase().replace(/^\$+/, "");
    const searched = q
      ? staged.filter((c) => {
          const sym = (c.symbol || "").toLowerCase().replace(/^\$+/, "");
          const name = (c.name || "").toLowerCase();
          const mint = (c.mint || "").toLowerCase();
          return sym.includes(q) || name.includes(q) || mint.includes(q);
        })
      : staged;
    const aged = filterTape(searched, age);
    const rows =
      tapeSort === "rank" || ranked
        ? rankTape(aged, solUsd)
        : tapeSort === "mcap"
          ? scoreTape(
              aged.slice().sort((a, b) => (b.marketCapUsd || 0) - (a.marketCapUsd || 0) || b.createdAt - a.createdAt),
              solUsd,
            )
          : scoreTape(sortTape(aged, vol), solUsd);
    const boosted = [];
    const rest = [];
    for (const row of rows) {
      const b = boostRank.find((x) => x.coinId === row.coin.id || (x.mint && x.mint === row.coin.mint));
      if (b) boosted.push({ ...row, boost: b });
      else rest.push({ ...row, boost: undefined as undefined });
    }
    boosted.sort((a, b) => (b.boost?.rockets || 0) - (a.boost?.rockets || 0));
    let next = [...boosted, ...rest];
    if (lookedMint) {
      const pinned = coins.find((c) => c.mint === lookedMint || c.id === lookedMint);
      if (pinned) {
        const already = next.find((r) => r.coin.id === pinned.id || r.coin.mint === pinned.mint);
        if (already) next = [already, ...next.filter((r) => r !== already)];
        else {
          const extra = scoreTape([pinned], solUsd)[0];
          if (extra) next = [{ ...extra, boost: undefined }, ...next];
        }
      }
    }
    return next;
  }, [isSwap, mine, pool, age, vol, ranked, tapeSort, phase, solUsd, source, boostRank, lookedMint, coins, caQuery]);
  const rows = board.map((r) => r.coin);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-x-hidden pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(20,80,40,0.35),transparent_55%)]" />
      <div className="relative z-10 mx-auto max-w-lg px-4 pt-5 md:max-w-2xl md:pt-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[32px] font-semibold tracking-tight text-white">{isSwap ? "Swap" : "Launch"}</p>
          {isSwap && (
            <button
              type="button"
              onClick={() => setSwapOpen((v) => !v)}
              className={`rounded-full px-4 py-2 text-[14px] font-semibold ${
                swapOpen ? "bg-acid text-void" : "bg-white/10 text-white"
              }`}
            >
              {swapOpen ? "Hide swap" : "Swap"}
            </button>
          )}
        </div>
        {isSwap && swapOpen && (
          <div className="mt-4">
            <SwapWidget key={open?.mint || "swap"} owner={owner} defaultMint={open?.mint || ""} title="Swap" />
          </div>
        )}
        {isSwap && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-white/50">Boosted</p>
              <button
                type="button"
                onClick={() => setBoostOpen((v) => !v)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${boostOpen ? "bg-acid text-void" : "bg-white/10 text-white"}`}
              >
                Boost a coin
              </button>
            </div>
            <BoostRail
              rows={boostRank.map((b) => {
                const hit = coins.find((c) => c.mint === b.mint || c.id === b.coinId || c.id === b.mint);
                return {
                  ...b,
                  image: b.image || hit?.image,
                  name: b.name || hit?.name,
                  symbol: b.symbol || hit?.symbol || "",
                };
              })}
              onOpen={(mint, coinId) => {
                const hit = coins.find((c) => c.mint === mint || c.id === coinId || c.id === mint);
                if (hit) {
                  setOpen(hit);
                  setLookedMint(hit.mint || hit.id);
                  setSnapAt(Date.now());
                }
              }}
            />
            {boostOpen && (
              <div className="mt-3">
                {owner && (open || coins[0]) ? (
                  <BoostBuy
                    owner={owner}
                    coinId={(open || coins[0]).id}
                    symbol={(open || coins[0]).symbol}
                    onDone={() => refreshBoosts().catch(() => {})}
                  />
                ) : (
                  <p className="text-[13px] text-white/45">{owner ? "Open a token, then boost it." : "Connect Phantom to boost."}</p>
                )}
              </div>
            )}
          </div>
        )}

        {!isSwap && (
          <div className="mt-5 flex gap-5 border-b border-white/10 text-[16px]">
            <button
              type="button"
              onClick={() => {
                setTab("tape");
                setOpen(null);
              }}
              className={`inline-flex items-center gap-1.5 pb-2 ${tab === "tape" ? "border-b-2 border-white font-medium text-white" : "text-white/40"}`}
            >
              <Rocket className="h-4 w-4" />
              Launch
            </button>
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`pb-2 ${tab === "mine" ? "border-b-2 border-white font-medium text-white" : "text-white/40"}`}
            >
              Your tokens
            </button>
          </div>
        )}

        <div className="mt-6">
          {!isSwap && tab === "tape" && (
          <div className="space-y-5">
          <PadPitch />
          <section id="solphia-launch" className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5">
            <h2 className="mb-1 text-[22px] font-semibold text-white">Create a coin</h2>
            <p className="mb-4 text-[15px] text-white/45">Name, ticker, art. One Phantom signature. Lives on Meteora so Phantom Swap can buy it.</p>
            {!owner ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-mute">Connect your wallet to launch.</p>
                <WalletConnect />
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    data-field="image"
                    onClick={() => (cropSrc ? setCropOpen(true) : pickArtFile().catch(() => {}))}
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
                    <p className="text-sm text-ghost">Token art</p>
                    <p className="mt-0.5 text-sm text-mute">Any photo. You frame a square. We save a JPEG wallets can show.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => pickArtFile().catch(() => {})} className="font-mono text-[11px] text-acid">
                        {image ? "Replace" : "Choose photo"}
                      </button>
                      {cropSrc ? (
                        <button type="button" onClick={() => setCropOpen(true)} className="font-mono text-[11px] text-mute">
                          Recrop
                        </button>
                      ) : null}
                      {image ? (
                        <button
                          type="button"
                          onClick={() => {
                            setImage("");
                            if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current);
                            cropUrlRef.current = "";
                            setCropSrc(null);
                            createErr.clear("image");
                          }}
                          className="font-mono text-[11px] text-mute"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <FieldError error={createErr.errors.image} />
                  </div>
                </div>
                {cropOpen && cropSrc ? (
                  <TokenImageCrop
                    source={cropSrc}
                    onCancel={() => setCropOpen(false)}
                    onDone={(dataUrl) => {
                      setImage(dataUrl);
                      setCropOpen(false);
                      createErr.clear("image");
                    }}
                  />
                ) : null}
                <div>
                <label className="mt-4 block">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className={`text-xs ${createErr.errors.name ? "text-blood" : "text-mute"}`}>Name</span>
                    <span className="font-mono text-[10px] text-mute">{NAME_MIN}–{NAME_MAX} characters</span>
                  </div>
                  <SafeField
                    field="name"
                    value={name}
                    max={NAME_MAX}
                    placeholder="Name"
                    className={`w-full rounded-2xl border bg-void px-4 py-3 text-ghost ${fieldClass(createErr.errors.name)}`}
                    onChange={(v) => {
                      setName(v);
                      createErr.clear("name");
                    }}
                  />
                  <LengthHint
                    n={name.trim().length}
                    min={NAME_MIN}
                    max={NAME_MAX}
                    empty={`${NAME_MIN}–${NAME_MAX} characters. “HI” is valid.`}
                    short={`needs at least ${NAME_MIN} characters`}
                    error={createErr.errors.name}
                  />
                </label>
                <label
                  data-field="symbol"
                  className="mt-3 block"
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className={`text-xs ${createErr.errors.symbol ? "text-blood" : "text-mute"}`}>Ticker</span>
                    <span className="font-mono text-[10px] text-mute">{TICKER_MIN}–{TICKER_MAX} letters or numbers</span>
                  </div>
                  <div className={`flex w-full items-center rounded-2xl border bg-void px-4 py-3 font-mono text-ghost ${fieldClass(createErr.errors.symbol)}`}>
                    <span className="pr-1 text-acid">$</span>
                    <SafeField
                      field="symbol"
                      value={symbol}
                      max={TICKER_MAX}
                      placeholder="TICKER"
                      className="w-full bg-transparent outline-none"
                      filter={(v) => v.replace(/^\$+/, "").toUpperCase().replace(/[^A-Z0-9]/g, "")}
                      onChange={(v) => {
                        setSymbol(v);
                        createErr.clear("symbol");
                      }}
                    />
                  </div>
                  <LengthHint
                    n={symbol.trim().length}
                    min={TICKER_MIN}
                    max={TICKER_MAX}
                    empty={`${TICKER_MIN}–${TICKER_MAX} letters or numbers. No spaces or symbols. “HI” is valid.`}
                    short={`needs at least ${TICKER_MIN} letters or numbers`}
                    error={createErr.errors.symbol}
                  />
                </label>
                <SafeField
                  field="blurb"
                  value={blurb}
                  max={280}
                  placeholder="One line (optional)"
                  className={`mt-3 w-full rounded-2xl border bg-void px-4 py-3 text-ghost ${fieldClass(createErr.errors.blurb)}`}
                  onChange={(v) => {
                    setBlurb(v);
                    createErr.clear("blurb");
                  }}
                />
                <FieldError error={createErr.errors.blurb} />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <SafeField
                      field="website"
                      value={website}
                      max={160}
                      placeholder="website.com"
                      className={`rounded-2xl border bg-void px-3 py-2 text-sm text-ghost ${fieldClass(createErr.errors.website)}`}
                      onChange={(v) => {
                        setWebsite(v);
                        createErr.clear("website");
                      }}
                    />
                    <FieldError error={createErr.errors.website} />
                  </div>
                  <div>
                    <SafeField
                      field="x"
                      value={x}
                      max={80}
                      placeholder="@handle or x.com/…"
                      className={`rounded-2xl border bg-void px-3 py-2 text-sm text-ghost ${fieldClass(createErr.errors.x)}`}
                      onChange={(v) => {
                        setX(v);
                        createErr.clear("x");
                      }}
                    />
                    <FieldError error={createErr.errors.x} />
                  </div>
                  <div>
                    <SafeField
                      field="telegram"
                      value={telegram}
                      max={80}
                      placeholder="t.me/…"
                      className={`rounded-2xl border bg-void px-3 py-2 text-sm text-ghost ${fieldClass(createErr.errors.telegram)}`}
                      onChange={(v) => {
                        setTelegram(v);
                        createErr.clear("telegram");
                      }}
                    />
                    <FieldError error={createErr.errors.telegram} />
                  </div>
                  <div>
                    <SafeField
                      field="discord"
                      value={discord}
                      max={120}
                      placeholder="discord.gg/…"
                      className={`rounded-2xl border bg-void px-3 py-2 text-sm text-ghost ${fieldClass(createErr.errors.discord)}`}
                      onChange={(v) => {
                        setDiscord(v);
                        createErr.clear("discord");
                      }}
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[0, ...PRESETS.filter((n) => n <= DEV_CAP), Number(DEV_CAP.toFixed(2))].filter((n, i, a) => a.indexOf(n) === i).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setDevBuy(n);
                          createErr.clear("launchBuySol");
                        }}
                        className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
                          Math.abs(devBuy - n) < 0.001 ? "bg-[#14f195] text-black" : "bg-white/10 text-white"
                        }`}
                      >
                        {n === 0 ? "0" : `${n} SOL`}
                      </button>
                    ))}
                  </div>
                  <FieldError error={createErr.errors.launchBuySol} />
                  <p className="mt-1 text-xs text-mute">
                    Optional first buy into this wallet, bundled in the same signature. Leave at 0 to put the whole
                    supply on the curve. Capped at 5% of supply ({fmtSol(DEV_CAP, 2)} SOL at open).
                  </p>
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div data-field="wallet" className={createErr.errors.wallet ? "rounded-full ring-1 ring-blood/70" : undefined}>
                    <WalletConnect />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => launchToken().catch(() => {})}
                    className="btn-acid min-h-[48px] rounded-full px-6 disabled:opacity-40"
                  >
                    {busy ? "Launching…" : "Launch on Solana"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-mute">One Phantom prompt. 1% total. Half of that fee hits the creator on-chain.</p>
                <FieldError error={createErr.errors.wallet} />
                <div className="mt-3">
                  <FormAlert error={createErr.banner} />
                </div>
                </div>
              </>
            )}
          </section>
          </div>
          )}

          {((!isSwap && tab === "mine") || isSwap) && (
          <section className="mt-2">
            {isSwap && (
            <div className="space-y-3">
              <div className="flex gap-1 rounded-full bg-white/[0.06] p-1">
                {(["live", "graduated"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPhase(k)}
                    className={`flex-1 rounded-full py-2 text-[14px] font-medium ${
                      phase === k ? "bg-white text-void" : "text-white/45"
                    }`}
                  >
                    {k === "live" ? "Curve" : "Graduated"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <SafeField
                  value={caQuery}
                  placeholder="Search by CA or ticker"
                  className="min-h-[44px] w-full rounded-full border border-white/10 bg-black/35 px-4 pl-4 text-[15px] text-white"
                  onChange={(v) => {
                    setCaQuery(v);
                    setCaErr("");
                  }}
                />
                <button
                  type="button"
                  disabled={caBusy}
                  onClick={() => searchMint().catch(() => {})}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-acid px-4 py-1.5 text-[13px] font-semibold text-void disabled:opacity-40"
                >
                  {caBusy ? "…" : "Go"}
                </button>
              </div>
              {caErr && <p className="text-[13px] text-blood">{caErr}</p>}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {(
                  [
                    ["newest", "Newest"],
                    ["mcap", "Mcap"],
                    ["vol5m", "5m vol"],
                    ["vol1h", "1h vol"],
                    ["rank", "Rank"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setTapeSort(k);
                      setRanked(k === "rank");
                      setVol(k === "vol5m" ? "5m" : k === "vol1h" ? "1h" : null);
                    }}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                      tapeSort === k ? "bg-acid/20 text-acid" : "bg-white/[0.06] text-white/45"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {(["newest", "1h", "6h", "24h"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAge(k)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${
                      age === k ? "text-white" : "text-white/35"
                    }`}
                  >
                    {k === "newest" ? "Any age" : k}
                  </button>
                ))}
                <span className="mx-1 h-5 w-px self-center bg-white/10" />
                {(["all", "born", "market"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSource(k)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${
                      source === k ? "text-white" : "text-white/35"
                    }`}
                  >
                    {k === "all" ? "All" : k === "born" ? "Pad" : "Market"}
                  </button>
                ))}
              </div>
            </div>
            )}
            {!isSwap && (
              <div className="mb-4 rounded-3xl border border-white/10 bg-black/30 p-4">
                <p className="font-mono text-[11px] tracking-[0.28em] text-acid">DEV REWARDS</p>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-white">Claim fees</h2>
                <p className="mt-1 text-[14px] leading-snug text-white/45">
                  Swaps on Meteora pay 1%. Half is yours (claimable here). Half is the protocol share for treasury/owner.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="font-mono text-[10px] text-white/40">YOUR GENERATED</p>
                    <p className="stat-num text-[18px] text-acid">{fmtSol(generatedSol, 4)} SOL</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40">YOUR UNCLAIMED</p>
                    <p className="stat-num text-[18px] text-white">{fmtSol(unclaimedSol, 4)} SOL</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40">PROTOCOL GENERATED</p>
                    <p className="stat-num text-[18px] text-white/80">{fmtSol(protocolGeneratedSol, 4)} SOL</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-white/40">PROTOCOL UNCLAIMED</p>
                    <p className="stat-num text-[18px] text-white/80">{fmtSol(protocolUnclaimedSol, 4)} SOL</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || claimable.length === 0}
                    onClick={() => {
                      const first = claimable[0];
                      if (first) act({ action: "withdraw_dev", id: first.id, mint: first.mint });
                    }}
                    className="rounded-full bg-[#14f195] px-4 py-2 text-[14px] font-semibold text-[#04000a] disabled:opacity-40"
                  >
                    {claimable.length > 1 ? `Claim ${fmtSol(unclaimedSol, 4)} SOL` : "Claim creator fees"}
                  </button>
                  {isProtocol && protocolClaimable.length > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const first = protocolClaimable[0];
                        if (first) act({ action: "withdraw_partner", id: first.id, mint: first.mint });
                      }}
                      className="rounded-full border border-white/15 px-4 py-2 text-[14px] text-white disabled:opacity-40"
                    >
                      Claim protocol fees
                    </button>
                  )}
                </div>
                {claimable.length > 1 && (
                  <p className="mt-2 text-[12px] text-white/40">Signs one token at a time. After it lands, tap claim again for the next.</p>
                )}
              </div>
            )}
            <div className="mt-3 space-y-2">
              {!isSwap && tab === "mine" && boostMine.live.length > 0 && (
                <div className="space-y-1 text-[12px] text-mute">
                  {boostMine.live.map((b) => (
                    <div key={`l-${b.symbol}`} className="text-acid">
                      ${b.symbol} · {b.rockets} rockets
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-1 divide-y divide-white/[0.06]">
              {!isSwap &&
                pending
                  .filter((p) => !mine.some((c) => c.mint === p.mint) && !hidden.includes(p.mint))
                  .map((p) => (
                    <div key={p.mint} className="py-3">
                      <PumpCoinRow
                        name={p.name || "Pending"}
                        symbol={p.symbol || "…"}
                        image={p.image}
                        mint={p.mint}
                        onOpen={() => window.open("https://solscan.io/token/" + p.mint, "_blank", "noopener,noreferrer")}
                      />
                      <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
                        <CopyCa ca={p.mint} compact />
                        <p className="text-[13px] text-white/45">Signing finished. Listing it on your dashboard…</p>
                        <button
                          type="button"
                          className="rounded-full bg-white/10 px-3 py-1 text-[13px] text-white"
                          onClick={() => removeFromDashboard(p.mint, p.symbol)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
              {rows.length === 0 && tapeLoading && pending.length === 0 && (
                <div className="space-y-2 py-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              )}
              {rows.length === 0 && !tapeLoading && pending.filter((p) => !mine.some((c) => c.mint === p.mint)).length === 0 && (
                <div className="py-10">
                  <p className="text-[22px] font-semibold text-white">{!isSwap ? "No tokens yet" : "Get your first coin today!"}</p>
                  <p className="mt-2 text-[15px] text-white/45">
                    {!isSwap
                      ? owner
                        ? "Launch a coin on the Launch tab. It will show up here to manage and claim rewards."
                        : "Connect Phantom, then launch a coin."
                      : "No coins in this window."}
                  </p>
                </div>
              )}
              {board.map((row) => (
                <div key={row.coin.id}>
                  <PumpCoinRow
                    name={row.coin.name}
                    symbol={row.coin.symbol}
                    image={row.coin.image}
                    mint={row.coin.mint}
                    marketCapUsd={row.coin.marketCapUsd}
                    marketCapSol={row.coin.marketCapSol}
                    change={row.coin.change24h ?? row.coin.change1h}
                    active={open?.id === row.coin.id}
                    place={isSwap && tapeSort === "rank" && row.rank >= 1 && row.rank <= 3 ? row.rank : undefined}
                    badge={row.coin.born ? "✓" : undefined}
                    onOpen={() => {
                      setOpen((cur) => {
                        if (cur?.id === row.coin.id) return null;
                        setSnapAt(Date.now());
                        return row.coin;
                      });
                    }}
                  />
                  {!isSwap && owner && row.coin.creator === owner ? (
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
                      <p className="text-[13px] text-white/45">
                        Generated {fmtSol(row.coin.creatorFeesSol || row.coin.devRewardsSol || 0, 4)} SOL
                        {(row.coin.creatorUnclaimedSol || 0) > 0 ? ` · ${fmtSol(row.coin.creatorUnclaimedSol || 0, 4)} unclaimed` : ""}
                        {(row.coin.partnerFeesSol || 0) > 0 ? ` · protocol ${fmtSol(row.coin.partnerFeesSol || 0, 4)}` : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy || !((row.coin.creatorUnclaimedSol || 0) > 1e-6 || row.coin.devRewardsSol > 0)}
                          onClick={() => act({ action: "withdraw_dev", id: row.coin.id, mint: row.coin.mint })}
                          className="rounded-full bg-[#14f195]/15 px-3 py-1.5 text-[13px] font-medium text-[#14f195] disabled:opacity-40"
                        >
                          Claim
                        </button>
                        <button
                          type="button"
                          onClick={() => row.coin.mint && removeFromDashboard(row.coin.mint, row.coin.symbol)}
                          className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white/70"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {open?.id === row.coin.id && (
                    <div id={`desk-${open.id}`} className="scroll-mt-[4.75rem]">
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
          )}
        </div>

        {err && (
          <div className="relative z-10 mt-4 rounded-2xl border border-blood/50 bg-blood/10 px-4 py-3 text-sm text-blood">
            <p className="font-mono">{err}</p>
            {pending[0]?.mint ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-ghost">
                <span className="text-[13px] text-white/70">Mint CA</span>
                <CopyCa ca={pending[0].mint} compact />
              </div>
            ) : null}
          </div>
        )}
        {msg && !err && <p className="relative z-10 mt-4 font-mono text-sm text-acid">{msg}</p>}
      </div>
    </main>
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
  const [liveOut, setLiveOut] = useState<number | null>(null);
  const tradeErr = useConfirmErrors<"wallet" | "amount">();
  const audit = useMemo(() => auditLaunchCoin(open, solUsd), [open, solUsd]);
  const creator = Boolean(owner && open.creator === owner);
  const padTrade = Boolean(open.born || open.venue === "solphia" || open.venue === "pumpfun");
  const snipeLeft = Math.max(0, ANTI_SNIPE_MS - (Date.now() - open.createdAt));
  const cap = open.maxBuySol ?? 0;
  const snipeCap = open.venue === "solphia" || open.venue === "pumpfun" || creator || snipeLeft <= 0 ? Infinity : ANTI_SNIPE_SOL;
  const maxOk = Math.min(cap || 40, snipeCap, 40);
  const quote = useMemo(() => {
    if (!open.curve) return null;
    if (side === "buy") return quoteBuy(open.curve, sol);
    if (!(open.myTokens || 0)) return null;
    return quoteSell(open.curve, open.myTokens || 0);
  }, [open.curve, open.myTokens, sol, side]);
  useEffect(() => {
    if (!padTrade || !open.mint) {
      setLiveOut(null);
      return;
    }
    const tokens = open.myTokens || 0;
    if (side === "buy" && !(sol > 0)) {
      setLiveOut(null);
      return;
    }
    if (side === "sell" && !(tokens > 0)) {
      setLiveOut(null);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch("/api/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "quote",
          pubkey: owner || open.creator,
          id: open.id,
          mint: open.mint,
          sol: side === "buy" ? sol : undefined,
          tokens: side === "sell" ? tokens : undefined,
        }),
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((j) => {
          const q = j.quote;
          if (!q?.ok) {
            setLiveOut(null);
            return;
          }
          setLiveOut(side === "buy" ? Number(q.tokensOut) || 0 : Number(q.solOut) || 0);
        })
        .catch(() => setLiveOut(null));
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [padTrade, open.mint, open.id, open.creator, open.myTokens, owner, sol, side]);
  const blocked =
    side === "sell"
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
    <section className="pump-card mt-2 flex min-w-0 flex-col gap-5 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TokenArt src={open.image} mint={open.mint} label={open.symbol} eager className="h-14 w-14 rounded-2xl" />
          <div className="min-w-0">
            <div className="font-display text-3xl text-ghost">{tick(open.symbol)}</div>
            <div className="text-sm text-mute">{open.name}</div>
            <div className={`mt-1 font-mono text-sm ${(open.change24h || 0) >= 0 ? "text-acid" : "text-blood"}`}>
              {fmtPx((open.priceSol || 0) * (solUsd || 0))}
              <span className="ml-2">{fmtPct(open.change24h)} 24h</span>
            </div>
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

      <TokenChart
        key={open.mint || open.id}
        mint={open.mint}
        pair={open.pairAddress}
        venue={open.venue || (open.born ? "launchlab" : undefined)}
        seed={open.spark}
        change24h={open.change24h}
        solUsd={solUsd}
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="min-w-0">
          {open.born && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-void">
              <div className="h-full bg-acid" style={{ width: `${Math.round((open.progress || 0) * 100)}%` }} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

        <SwapShell
          title={`Trade ${tick(open.symbol)}`}
          subtitle="On the curve until it graduates. Phantom Swap can route it."
        >
          {!padTrade ? (
            <MarketSwap open={open} owner={owner} sol={sol} setSol={setSol} solUsd={solUsd} />
          ) : (
            <>
              <SwapTabs side={side} onSide={setSide} />
              {!owner ? (
                <div className="mt-6 flex justify-center">
                  <WalletConnect />
                </div>
              ) : (
                <>
                  <div className="mt-3">
                    <SwapBox label={side === "buy" ? "YOU PAY" : "YOU SELL"} unit={side === "buy" ? "SOL" : tick(open.symbol) || "TOKEN"}>
                      {side === "buy" ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={String(sol)}
                          data-field="amount"
                          onChange={(e) => {
                            const n = Number(e.target.value.replace(",", "."));
                            setSol(Number.isFinite(n) ? n : 0);
                            tradeErr.clear("amount");
                          }}
                          aria-invalid={Boolean(tradeErr.errors.amount)}
                          className={`w-full bg-transparent font-display text-3xl text-ghost outline-none ${fieldClass(tradeErr.errors.amount, "")}`}
                        />
                      ) : (
                        <div className="font-display text-3xl text-ghost">{fmtTok(open.myTokens || 0)}</div>
                      )}
                    </SwapBox>
                  </div>
                  <FieldError error={tradeErr.errors.amount} />
                  {side === "buy" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSol(p)}
                          className={`rounded-full border px-3 py-1 font-mono text-[11px] ${Math.abs(sol - p) < 1e-9 ? "border-acid bg-acid/15 text-acid" : "border-violet/30 text-mute"}`}
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
                  <div className="mt-3">
                    <SwapBox label="YOU GET" unit={side === "buy" ? tick(open.symbol) || "TOKEN" : "SOL"}>
                      <div className="font-display text-3xl text-ghost">
                        {liveOut != null
                          ? side === "buy"
                            ? fmtTok(liveOut)
                            : fmtSol(liveOut, 4)
                          : quote && quote.ok
                            ? side === "buy"
                              ? fmtTok(quote.tokensOut || 0)
                              : fmtSol(quote.solOut || 0, 4)
                            : "—"}
                      </div>
                    </SwapBox>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!owner) {
                        tradeErr.fail({ wallet: "Connect your wallet to swap." });
                        return;
                      }
                      if (blocked) {
                        tradeErr.fail({ amount: blocked });
                        return;
                      }
                      tradeErr.ok();
                      if (side === "buy") onAct({ action: "buy", id: open.id, mint: open.mint, sol });
                      else onAct({ action: "sell", id: open.id, mint: open.mint, tokens: open.myTokens || 0 });
                    }}
                    className="btn-acid mt-4 min-h-[52px] w-full rounded-full disabled:opacity-40"
                  >
                    {side === "buy" ? `Buy ${tick(open.symbol)}` : `Sell ${tick(open.symbol)}`}
                  </button>
                  <div className="mt-3">
                    <FormAlert error={tradeErr.banner} />
                  </div>
                  <p className="mt-3 text-center font-mono text-[11px] text-mute">
                    {solUsd ? `SOL $${solUsd.toFixed(0)}` : "You sign. Tokens land in your wallet."}
                  </p>
                  {creator && (
                    <button
                      type="button"
                      disabled={busy || !((open.creatorUnclaimedSol || 0) > 1e-6 || open.devRewardsSol > 0)}
                      onClick={() => onAct({ action: "withdraw_dev", id: open.id, mint: open.mint })}
                      className="mt-3 w-full rounded-full border border-acid/40 py-2 text-sm text-acid disabled:opacity-40"
                    >
                      Claim {fmtSol(open.creatorUnclaimedSol || open.devRewardsSol || 0, 4)} SOL
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </SwapShell>
      </div>
    </section>
  );
}

function MarketSwap({
  open,
  owner,
  sol,
  setSol,
  solUsd,
}: {
  open: Coin;
  owner: string | null;
  sol: number;
  setSol: (n: number) => void;
  solUsd: number;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<number | null>(null);
  const [feeSol, setFeeSol] = useState(0);
  const [held, setHeld] = useState(0);
  const [msg, setMsg] = useState("");
  const [hint, setHint] = useState("");
  const tradeErr = useConfirmErrors<"wallet" | "amount">();
  const mint = open.mint || "";

  useEffect(() => {
    if (!owner || !mint) {
      setHeld(0);
      return;
    }
    fetch(`/api/sol/token?owner=${encodeURIComponent(owner)}&mint=${encodeURIComponent(mint)}`)
      .then((r) => r.json())
      .then((j) => setHeld(Number(j.amount) || 0))
      .catch(() => setHeld(0));
  }, [owner, mint]);

  useEffect(() => {
    const amount = side === "buy" ? sol : held;
    if (!mint || !(amount > 0)) {
      setOut(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/swap/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint, side, amount, slippageBps: 100 }),
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) {
            setHint("");
            setOut(Number(j.outAmount) || 0);
            setFeeSol(Number(j.feeSol) || 0);
          } else {
            setOut(null);
            setHint(typeof j.error === "string" ? j.error : "Not on the Solphia curve.");
          }
        })
        .catch(() => {
          setOut(null);
          setHint("Not on the Solphia curve.");
        });
    }, 280);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [mint, side, sol, held]);

  async function go() {
    if (!owner) {
      tradeErr.fail({ wallet: "Connect your wallet to swap. Tokens land in that wallet." });
      return;
    }
    if (!mint) {
      tradeErr.fail({ amount: "This coin has no mint yet." });
      return;
    }
    const amount = side === "buy" ? sol : held;
    if (side === "buy" && sol < MIN_TRADE_SOL) {
      tradeErr.fail({ amount: `Min ${MIN_TRADE_SOL} SOL.` });
      return;
    }
    if (side === "sell" && !(held > 0)) {
      tradeErr.fail({ amount: "You have none of this token in your wallet." });
      return;
    }
    tradeErr.ok();
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/swap/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, mint, side, amount, slippageBps: 100 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not build the swap.");
      const sig = await signPhantomAndSend(j.transaction);
      setMsg(`Filled · ${sig.slice(0, 8)}… Tokens landed in your wallet.`);
      if (owner && mint) {
        const b = await fetch(`/api/sol/token?owner=${encodeURIComponent(owner)}&mint=${encodeURIComponent(mint)}`).then((x) => x.json());
        setHeld(Number(b.amount) || 0);
      }
    } catch (e) {
      tradeErr.fail({ amount: e instanceof Error ? e.message : "swap failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SwapTabs side={side} onSide={setSide} />
      {!owner ? (
        <div className="mt-5 flex justify-center">
          <WalletConnect />
          <FieldError error={tradeErr.errors.wallet} />
        </div>
      ) : (
        <>
          <div className="mt-3">
            <SwapBox label={side === "buy" ? "YOU PAY" : "YOU SELL"} unit={side === "buy" ? "SOL" : tick(open.symbol) || "TOKEN"}>
              {side === "buy" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={String(sol)}
                  data-field="amount"
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(",", "."));
                    setSol(Number.isFinite(n) ? n : 0);
                    tradeErr.clear("amount");
                  }}
                  aria-invalid={Boolean(tradeErr.errors.amount)}
                  className="w-full bg-transparent font-display text-3xl text-ghost outline-none"
                />
              ) : (
                <div className="font-display text-3xl text-ghost">{fmtTok(held)}</div>
              )}
            </SwapBox>
          </div>
          <FieldError error={tradeErr.errors.amount} />
          {side === "buy" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSol(p)}
                  className={`rounded-full border px-3 py-1 font-mono text-[11px] ${Math.abs(sol - p) < 1e-9 ? "border-acid bg-acid/15 text-acid" : "border-violet/30 text-mute"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3">
            <SwapBox label="YOU GET" unit={side === "buy" ? tick(open.symbol) || "TOKEN" : "SOL"}>
              <div className="font-display text-3xl text-ghost">
                {out == null ? "—" : side === "buy" ? fmtTok(out) : fmtSol(out, 4)}
              </div>
            </SwapBox>
          </div>
          {feeSol > 0 && (
            <p className="mt-2 font-mono text-[11px] text-mute">
              Protocol fee {fmtSol(feeSol, 4)} SOL{solUsd ? ` · ~$${(feeSol * solUsd).toFixed(3)}` : ""}
            </p>
          )}
          <button type="button" disabled={busy} onClick={go} className="btn-acid mt-4 min-h-[52px] w-full rounded-full disabled:opacity-40">
            {busy ? "Swapping…" : side === "buy" ? `Buy ${tick(open.symbol)}` : `Sell ${tick(open.symbol)}`}
          </button>
          {hint && !msg && <p className="mt-3 text-[12px] leading-snug text-mute">{hint}</p>}
          {msg && <p className="mt-3 font-mono text-sm text-acid">{msg}</p>}
        </>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-violet/15 px-3 py-2">
      <div className="font-mono text-[10px] text-mute">{k}</div>
      <div className="stat-num text-lg text-ghost">{v}</div>
    </div>
  );
}
