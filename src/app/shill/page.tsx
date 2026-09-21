"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Pin,
  Reply,
  Rocket,
  Send,
  Smile,
  Trophy,
  X,
} from "lucide-react";
import { SolphiaConstellation } from "@/components/SolphiaConstellation";
import { BurstSticker } from "@/components/BurstSticker";
import { CartoonPfp } from "@/components/CartoonPfp";
import { SwapWidget } from "@/components/SwapWidget";
import { WalletConnect } from "@/components/WalletConnect";
import { RankBadge } from "@/components/RankBadge";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { useOwner } from "@/lib/hooks";
import { paySeatFromPhantom } from "@/lib/wallet/trading";
import { SHILL_PIN_MS, SHILL_PIN_SOL, SHILL_REACTS, SHILL_STICKERS, type ShillToken } from "@/lib/shill/types";

type Msg = {
  id: string;
  at: number;
  owner: string;
  kind: "text" | "sticker" | "media";
  text?: string;
  sticker?: string;
  replyTo?: string;
  reactions: Record<string, string[]>;
  token?: ShillToken;
  pending?: boolean;
};

type PinRow = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  priceUsd?: number;
  mcUsd?: number;
  endsAt: number;
  votes?: number;
};

type VoteRow = {
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  votes: number;
};

type RankCard = {
  pubkey: string;
  username: string;
  hasPfp?: boolean;
  rank: number;
  title: string;
  xp: number;
  need: number;
  pct: number;
  role?: "admin" | "mod" | null;
  staff?: boolean;
};

type Pack = {
  messages?: Msg[];
  pins?: PinRow[];
  pinSlots?: number;
  nextFreeAt?: number;
  pinSol?: number;
  typing?: string[];
  profiles?: Record<string, RankCard>;
  board?: RankCard[];
  you?: RankCard | null;
  treasury?: string;
  voteBoard?: VoteRow[];
  nextVoteAt?: number;
  members?: number;
};

function when(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLabel(at: number, now: number) {
  const d = new Date(at);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(now - 86_400_000);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function nameOf(pk: string, profiles?: Pack["profiles"]) {
  const u = profiles?.[pk]?.username;
  return u ? `@${u}` : `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function pfpSrc(pk: string, profiles?: Pack["profiles"]) {
  const p = profiles?.[pk];
  if (p?.hasPfp) return `/api/circle/avatar?pk=${encodeURIComponent(pk)}`;
  return undefined;
}

function rankOf(pk: string, profiles?: Pack["profiles"]) {
  return profiles?.[pk]?.rank || 1;
}

function fmtPinLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (s < 3600) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtMc(n?: number) {
  if (!(n && n > 0)) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function tick(symbol?: string) {
  return `$${(symbol || "").replace(/^\$/, "") || "TOKEN"}`;
}

function TokenBubble({
  token,
  onCopy,
  votes,
  onVote,
  canVote,
}: {
  token: ShillToken;
  onCopy: (mint: string) => void;
  votes?: number;
  onVote?: () => void;
  canVote?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 grid w-full grid-cols-[2.4rem_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-2 py-1.5">
      {token.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={token.image} alt="" className="h-9 w-9 rounded-xl object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-void font-display text-xs text-acid">
          {(token.symbol || "?").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 overflow-hidden">
        <div className="truncate text-[14px] font-semibold text-white">{tick(token.symbol)}</div>
        <div className="truncate font-mono text-[10px] text-white/55">
          {token.name}
          {token.mcUsd ? ` · ${fmtMc(token.mcUsd)}` : ""}
        </div>
      </div>
      <button
        type="button"
        disabled={!canVote}
        onClick={(e) => {
          e.stopPropagation();
          onVote?.();
        }}
        className="flex h-8 min-w-[2.6rem] flex-col items-center justify-center rounded-full bg-acid/15 text-acid disabled:opacity-40"
        aria-label="Upvote"
      >
        <ChevronUp className="h-4 w-4" />
        <span className="font-mono text-[9px] leading-none">{votes || 0}</span>
      </button>
      <button
        type="button"
        className="h-8 rounded-full bg-white/10 px-3 font-mono text-[10px] text-cyan"
        onClick={(e) => {
          e.stopPropagation();
          onCopy(token.mint);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="panel-bubble max-h-[min(78%,36rem)] w-full overflow-y-auto rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-w-lg sm:rounded-3xl sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-display text-[20px] text-ghost">{title}</div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-white/70" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 pb-5">{children}</div>
      </div>
    </div>
  );
}

function VoteBoard({
  rows,
  canVote,
  onVote,
  nextVote,
  now,
}: {
  rows: VoteRow[];
  canVote: boolean;
  onVote: (mint: string) => void;
  nextVote: number;
  now: number;
}) {
  const wait = Math.max(0, nextVote - now);
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.28em] text-acid">24H TROPHY</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <h3 className="font-display text-[26px] tracking-tight text-ghost">Board</h3>
        <p className="font-mono text-[10px] text-white/50">{canVote ? "vote ready" : `next ${fmtPinLeft(wait)}`}</p>
      </div>
      <p className="mt-1 text-[13px] leading-snug text-mute">One upvote an hour. Each vote lasts 24 hours. Keep voting to hold rank.</p>
      {rows.length === 0 && <p className="mt-6 text-[14px] text-white/45">No votes yet. Upvote a CA in chat or a pinned token.</p>}
      {top.length > 0 && (
        <div className="mt-5 grid grid-cols-3 items-end gap-2">
          {[top[1], top[0], top[2]].map((row, place) => {
            if (!row) return <div key={place} />;
            const rank = place === 1 ? 1 : place === 0 ? 2 : 3;
            const tall = rank === 1 ? "pb-8 pt-4" : rank === 2 ? "pb-5 pt-3" : "pb-3 pt-3";
            const ring =
              rank === 1
                ? "border-[#ffd24a]/70 bg-[#ffd24a]/10 shadow-[0_0_24px_rgba(255,210,74,0.18)]"
                : rank === 2
                  ? "border-white/25 bg-white/5"
                  : "border-[#c47a4a]/60 bg-[#c47a4a]/10";
            return (
              <button key={row.mint} type="button" onClick={() => onVote(row.mint)} className={`rounded-2xl border px-2 ${tall} ${ring}`}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-void font-display text-acid">
                  {row.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (row.symbol || "?").slice(0, 2)
                  )}
                </div>
                <div className="mt-2 truncate text-center font-display text-sm text-white">{tick(row.symbol)}</div>
                <div className="stat-num text-center text-[13px] text-acid">{row.votes}</div>
                <div className="text-center font-mono text-[9px] text-white/40">#{rank}</div>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-4 space-y-1">
        {rest.map((row, i) => (
          <button
            key={row.mint}
            type="button"
            onClick={() => onVote(row.mint)}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white/5"
          >
            <span className="w-6 font-mono text-[12px] text-white/40">{i + 4}</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-void font-display text-xs text-acid">
              {row.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.image} alt="" className="h-full w-full object-cover" />
              ) : (
                (row.symbol || "?").slice(0, 2)
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-[15px] text-white">{tick(row.symbol)}</span>
            <span className="inline-flex items-center gap-0.5 font-mono text-[12px] text-acid">
              <ChevronUp className="h-4 w-4" />
              {row.votes}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function windowsBottomLift() {
  if (typeof window === "undefined") return 0;
  if (!/Windows/i.test(navigator.userAgent || "")) return 0;
  const screenH = window.screen?.height || 0;
  const availH = window.screen?.availHeight || 0;
  const measured = Math.max(0, screenH - availH);
  const outer = window.outerHeight || 0;
  const fillsScreen = screenH > 0 && outer >= Math.min(screenH, availH || screenH) - 16;
  if (!fillsScreen) return 12;
  return Math.max(measured, 48);
}

export default function ShillPage() {
  const owner = useOwner();
  const frame = useRef<HTMLElement>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Msg | null>(null);
  const [stickers, setStickers] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pinMint, setPinMint] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [sheet, setSheet] = useState<"pin" | "ranks" | "swap" | null>(null);
  const [tab, setTab] = useState<"chat" | "pins" | "board">("chat");
  const lastType = useRef(0);
  const [swapMint, setSwapMint] = useState("");
  const [openPin, setOpenPin] = useState<PinRow | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const hold = useRef<number>(0);
  const lastAt = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const stickToBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  const load = useCallback(async (full = false) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const since = !full && lastAt.current ? lastAt.current : 0;
    const q = new URLSearchParams();
    if (owner) q.set("pubkey", owner);
    if (since) q.set("since", String(since));
    const r = await fetch(`/api/shill?${q}`, { cache: "no-store", signal: ac.signal });
    const j = (await r.json()) as Pack;
    setPack((prev) => {
      if (!since || !prev) return j;
      const seen = new Map((prev.messages || []).map((m) => [m.id, m]));
      for (const m of j.messages || []) seen.set(m.id, m);
      for (const loc of [...seen.values()].filter((m) => String(m.id).startsWith("local-"))) {
        const hit = (j.messages || []).find(
          (m) => m.owner === loc.owner && (m.text || "") === (loc.text || "") && Math.abs(m.at - loc.at) < 12_000,
        );
        if (hit) seen.delete(loc.id);
      }
      const messages = [...seen.values()].sort((a, b) => a.at - b.at).slice(-200);
      return {
        ...prev,
        ...j,
        messages,
        board: j.board || prev.board,
        profiles: j.profiles ? { ...prev.profiles, ...j.profiles } : prev.profiles,
        voteBoard: j.voteBoard || prev.voteBoard,
        you: j.you ?? prev.you,
        pins: j.pins || prev.pins,
        members: j.members ?? prev.members,
      };
    });
    const latest = (j.messages || []) as Msg[];
    if (latest.length) lastAt.current = Math.max(lastAt.current, latest[latest.length - 1].at);
  }, [owner]);

  useEffect(() => {
    lastAt.current = 0;
    let timer = 0;
    let stop = false;
    let n = 0;
    const tick = () => {
      if (stop) return;
      n += 1;
      load(n % 16 === 0)
        .catch(() => {})
        .finally(() => {
          if (stop) return;
          timer = window.setTimeout(tick, document.hidden ? 8000 : 700);
        });
    };
    load(true).catch(() => {});
    timer = window.setTimeout(tick, 700);
    const vis = () => {
      if (!document.hidden) load(false).catch(() => {});
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      stop = true;
      window.clearTimeout(timer);
      abortRef.current?.abort();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => {
      const vv = window.visualViewport;
      const visH = Math.round(vv?.height || window.innerHeight);
      const visTop = Math.round(vv?.offsetTop || 0);
      const keyboard = visTop > 0 || visH < window.innerHeight - 80;
      const lift = keyboard ? 0 : windowsBottomLift();
      el.style.top = `${visTop}px`;
      el.style.right = "0px";
      el.style.left = "0px";
      el.style.bottom = "auto";
      el.style.height = `${Math.max(280, visH - lift)}px`;
      el.style.setProperty("--shill-lift", `${lift}px`);
      window.scrollTo(0, 0);
    };
    fit();
    window.visualViewport?.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("scroll", fit);
    window.addEventListener("resize", fit);
    return () => {
      window.visualViewport?.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [pack?.messages?.length]);

  async function act(body: Record<string, unknown>) {
    if (!owner) throw new Error("Connect your wallet.");
    const r = await fetch("/api/shill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, pubkey: owner }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || j.error || "failed");
    return j;
  }

  async function send(extra?: Record<string, unknown>) {
    if (!owner) {
      setErr("Connect Phantom to chat.");
      return;
    }
    const bodyText = extra?.sticker ? "" : text.trim();
    if (!bodyText && !extra?.sticker) return;
    setErr("");
    stickToBottom.current = true;
    setAtBottom(true);
    const localId = "local-" + Date.now();
    const optimistic: Msg = {
      id: localId,
      at: Date.now(),
      owner,
      kind: extra?.sticker ? "sticker" : "text",
      text: bodyText || undefined,
      sticker: typeof extra?.sticker === "string" ? extra.sticker : undefined,
      replyTo: reply?.id,
      reactions: {},
      pending: true,
    };
    setPack((prev) => (prev ? { ...prev, messages: [...(prev.messages || []), optimistic] } : prev));
    setText("");
    setReply(null);
    setStickers(false);
    setBusy(true);
    try {
      const sent = await act({ action: "chat", text: bodyText, replyTo: optimistic.replyTo, ...extra });
      if (sent?.leveled) {
        setToast(`Rank up. You are ${sent.rank}.`);
        window.setTimeout(() => setToast(""), 3200);
      }
      const real = sent?.message as Msg | undefined;
      if (real?.id) {
        setPack((prev) => {
          if (!prev) return prev;
          const rest = (prev.messages || []).filter((m) => m.id !== localId);
          return { ...prev, messages: [...rest, { ...real, pending: false }] };
        });
        lastAt.current = Math.max(lastAt.current, real.at);
      }
    } catch (e) {
      setPack((prev) => (prev ? { ...prev, messages: (prev.messages || []).filter((m) => m.id !== localId) } : prev));
      setErr(e instanceof Error ? e.message : "send failed");
    } finally {
      setBusy(false);
    }
  }

  async function react(id: string, emoji: string) {
    if (!owner) return;
    setPack((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: (prev.messages || []).map((m) => {
          if (m.id !== id) return m;
          const reactions = { ...m.reactions };
          const list = reactions[emoji] || [];
          reactions[emoji] = list.includes(owner) ? list.filter((pk) => pk !== owner) : [...list, owner];
          return { ...m, reactions };
        }),
      };
    });
    try {
      await act({ action: "react", id, emoji });
      setPicker(null);
    } catch {
      /* poll will repair */
    }
  }

  async function pin() {
    if (!owner) return;
    setErr("");
    setPinBusy(true);
    try {
      const prep = await act({ action: "pin", mint: pinMint.trim() });
      if (!prep.treasury || !prep.sol) throw new Error(prep.message || "Could not start the pin.");
      const sig = await paySeatFromPhantom(owner, prep.treasury, Number(prep.sol));
      if (!sig) throw new Error("Payment did not send.");
      await act({ action: "pin", mint: pinMint.trim(), signature: sig });
      setPinMint("");
      setSheet(null);
      flash("Pinned");
      await load(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "pin failed");
    } finally {
      setPinBusy(false);
    }
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function upvote(mint: string) {
    if (!owner) {
      setErr("Connect Phantom to vote.");
      return;
    }
    try {
      const j = await act({ action: "vote", mint });
      flash(`${j.votes || 1} votes · next in 1h`);
      await load(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "vote failed");
    }
  }

  async function copyMint(mint: string) {
    try {
      await navigator.clipboard.writeText(mint);
      flash("CA copied");
    } catch {
      flash("Could not copy");
    }
  }

  function openSwap(mint = "") {
    setSwapMint(mint);
    setOpenPin(null);
    setSheet("swap");
  }

  function jumpLatest() {
    stickToBottom.current = true;
    setAtBottom(true);
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  const msgs = pack?.messages || [];
  const byId = useMemo(() => Object.fromEntries(msgs.map((m) => [m.id, m])), [msgs]);
  const pins = pack?.pins || [];
  const slots = pack?.pinSlots ?? 0;
  const nextFree = pack?.nextFreeAt || 0;
  const waitMin = Math.max(1, Math.ceil((nextFree - Date.now()) / 60_000));
  const you = pack?.you;
  const voteRows = pack?.voteBoard || [];
  const nextVote = pack?.nextVoteAt || 0;
  const canVote = Boolean(owner) && now >= nextVote;
  const voteByMint = useMemo(() => Object.fromEntries(voteRows.map((r) => [r.mint, r.votes])), [voteRows]);
  const live = Math.max(pack?.members || 0, (pack?.typing || []).length + (owner ? 1 : 0), msgs.length ? 1 : 0);

  return (
    <main ref={frame} className="fixed inset-0 z-40 overflow-hidden bg-void">
      <SolphiaConstellation />
      <div className="shill-veil" />
      <div className="relative z-10 mx-auto grid h-full min-h-0 w-full grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_auto_minmax(0,1fr)]">
        <div className="lg:col-span-2">
          <header className="flex items-center gap-1 border-b border-white/10 bg-[#04000a]/55 px-1 pb-2 pt-[max(0.4rem,env(safe-area-inset-top))] backdrop-blur-xl">
            <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/5" aria-label="Back to home">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="shill-live" />
                <p className="font-mono text-[10px] tracking-[0.28em] text-acid">LIVE ROOM</p>
              </div>
              <div className="truncate font-display text-[20px] leading-tight text-ghost">Shill</div>
              <div className="truncate text-[12px] text-acid/80">{live ? `${live} in the room` : "waiting"}</div>
            </div>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-acid hover:bg-acid/10" onClick={() => setSheet("pin")} aria-label="Pin a token">
              <Rocket className="h-5 w-5" />
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-white/55 hover:bg-white/5" onClick={() => openSwap()} aria-label="Swap">
              <ArrowDownUp className="h-5 w-5" />
            </button>
          </header>
          <nav className="flex gap-6 border-b border-white/10 bg-[#04000a]/40 px-4 backdrop-blur-md">
            {(
              [
                ["chat", "Chat", MessageCircle],
                ["pins", "Pins", Pin],
                ["board", "Board", Trophy],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`shill-tab ${tab === id ? "shill-tab-on" : ""} ${id === "board" ? "lg:hidden" : ""}`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === "pins" && pins.length > 0 ? <span className="font-mono text-[10px] text-acid">{pins.length}</span> : null}
              </button>
            ))}
          </nav>

          {pins.length > 0 && tab === "chat" && (
            <div className="shrink-0 border-b border-white/10 bg-black/15 px-2 py-2 backdrop-blur-sm">
              <div className="boost-rail">
                {pins.map((p) => {
                  const left = Math.max(0, p.endsAt - now);
                  const pct = Math.max(4, Math.min(100, (left / SHILL_PIN_MS) * 100));
                  return (
                    <button key={p.id} type="button" onClick={() => setOpenPin(p)} className="shill-pin-tile">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" className="shill-pin-art" />
                      ) : (
                        <div className="shill-pin-art flex items-center justify-center font-display text-xs text-acid">
                          {(p.symbol || "?").slice(0, 2)}
                        </div>
                      )}
                      <span className="block w-full truncate text-center text-[12px] font-semibold text-white">{tick(p.symbol)}</span>
                      <span className="shill-bar">
                        <i style={{ width: `${pct}%` }} />
                      </span>
                      <span className="flex items-center gap-0.5 font-mono text-[10px] text-acid">
                        <ChevronUp className="h-3 w-3" />
                        {p.votes || voteByMint[p.mint] || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          ref={scroller}
          className={`relative min-h-0 overflow-y-auto px-2 py-3 lg:col-start-1 ${tab === "chat" ? "" : "hidden"}`}
          onClick={() => setPicker(null)}
          onScroll={(e) => {
            const el = e.currentTarget;
            const stuck = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            stickToBottom.current = stuck;
            setAtBottom((was) => (was === stuck ? was : stuck));
          }}
        >
          {msgs.length === 0 && (
            <div className="flex h-full min-h-[18rem] flex-col items-center justify-center px-6 text-center">
              <p className="font-mono text-[11px] tracking-[0.28em] text-acid">SHILL ZONE</p>
              <h2 className="mt-2 font-display text-4xl text-ghost">Drop a CA.</h2>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-mute">Chat like Telegram. Pin the rail. Vote the board. Phantom signs. Nothing is custodial.</p>
            </div>
          )}
          {msgs.map((m, i) => {
            const mine = m.owner === owner;
            const quoted = m.replyTo ? byId[m.replyTo] : null;
            const reacts = Object.entries(m.reactions || {}).filter(([, pks]) => pks.length);
            const seen = mine && !m.pending && Date.now() - m.at > 900;
            const sticker = m.kind === "sticker" && m.sticker;
            const prev = msgs[i - 1];
            const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
            const grouped = Boolean(prev && !newDay && prev.owner === m.owner && m.at - prev.at < 8 * 60_000);
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="shill-date">
                    <span>{dayLabel(m.at, now)}</span>
                  </div>
                )}
                <div className={`mb-1.5 flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""} ${grouped ? "mt-0" : "mt-2"}`}>
                  {!mine &&
                    (grouped ? (
                      <div className="h-8 w-8 shrink-0" />
                    ) : (
                      <CartoonPfp seed={m.owner} src={pfpSrc(m.owner, pack?.profiles)} className="h-8 w-8 shrink-0" onClick={() => setPeek(m.owner)} />
                    ))}
                  <div className={`flex min-w-0 max-w-[min(78%,calc(100%-2.5rem))] flex-col ${mine ? "items-end" : "items-start"}`}>
                    {!mine && !grouped && (
                      <button type="button" className="mb-0.5 px-1 text-[13px] font-medium text-acid" onClick={() => setPeek(m.owner)}>
                        {nameOf(m.owner, pack?.profiles)}
                        <span className="ml-1.5 font-mono text-[10px] text-white/40">{rankOf(m.owner, pack?.profiles)}</span>
                      </button>
                    )}
                    {sticker ? (
                      <button type="button" onClick={() => setPicker(m.id)} className="px-1">
                        <BurstSticker emoji={m.sticker!} size={88} />
                      </button>
                    ) : (
                      <div
                        className={`relative max-w-full min-w-0 overflow-hidden rounded-[18px] px-3 py-2 text-[15px] leading-[1.4] text-white ${
                          m.token ? "w-full" : ""
                        } ${mine ? "shill-bubble-me rounded-br-md" : "shill-bubble-them rounded-bl-md"} ${m.pending ? "opacity-70" : ""}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setPicker(m.id);
                        }}
                        onDoubleClick={() => react(m.id, "❤️")}
                        onTouchStart={() => {
                          window.clearTimeout(hold.current);
                          hold.current = window.setTimeout(() => setPicker(m.id), 450);
                        }}
                        onTouchEnd={() => window.clearTimeout(hold.current)}
                        onTouchMove={() => window.clearTimeout(hold.current)}
                      >
                        {quoted && (
                          <div className="mb-1 rounded-lg border-l-2 border-cyan bg-black/25 px-2 py-1 text-[12px] text-white/70">
                            {quoted.sticker || quoted.text || "message"}
                          </div>
                        )}
                        {m.text && <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.text}</div>}
                        {m.token && (
                          <TokenBubble
                            token={m.token}
                            onCopy={copyMint}
                            votes={voteByMint[m.token.mint] || 0}
                            canVote={canVote}
                            onVote={() => upvote(m.token!.mint)}
                          />
                        )}
                        <div className="mt-0.5 flex items-center justify-end gap-1">
                          <span className="font-mono text-[11px] text-white/45">{when(m.at)}</span>
                          {mine && (seen ? <CheckCheck className="h-3.5 w-3.5 text-cyan" /> : <Check className="h-3.5 w-3.5 text-white/45" />)}
                        </div>
                      </div>
                    )}
                    {reacts.length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                        {reacts.map(([emoji, pks]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              react(m.id, emoji);
                            }}
                            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-[2px] text-[15px] ${
                              owner && pks.includes(owner) ? "bg-acid/20" : "bg-white/10"
                            }`}
                          >
                            <BurstSticker emoji={emoji} size={18} />
                            {pks.length > 1 ? <span className="font-mono text-[10px] text-white/70">{pks.length}</span> : null}
                          </button>
                        ))}
                      </div>
                    )}
                    {picker === m.id && (
                      <div className="z-20 mt-1 flex gap-1 rounded-full border border-white/10 bg-[#0b0614]/90 px-2 py-1 shadow-lg backdrop-blur-md">
                        {SHILL_REACTS.map((emoji) => (
                          <button key={emoji} type="button" className="px-0.5" onClick={() => react(m.id, emoji)}>
                            <BurstSticker emoji={emoji} size={28} />
                          </button>
                        ))}
                        <button type="button" className="px-1 text-white/50" onClick={() => setReply(m)} title="Reply">
                          <Reply className="h-4 w-4" />
                        </button>
                        {pack?.you?.staff && (
                          <button type="button" className="px-1 text-white/50" onClick={() => act({ action: "delete", id: m.id }).then(() => load(true))}>
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {(pack?.typing || []).length > 0 && (
            <div className="px-2 font-mono text-[12px] text-mute">
              {(pack?.typing || []).map((pk) => nameOf(pk, pack?.profiles)).join(", ")} typing…
            </div>
          )}
          {!atBottom && tab === "chat" && (
            <button
              type="button"
              onClick={jumpLatest}
              className="shill-jump sticky bottom-3 ml-auto mr-1 flex h-10 w-10 items-center justify-center rounded-full bg-acid text-void"
              aria-label="Jump to latest"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          )}
        </div>

        {tab === "pins" && (
          <div className="min-h-0 overflow-y-auto px-4 py-5 lg:col-start-1">
            <p className="font-mono text-[11px] tracking-[0.28em] text-acid">PINNED</p>
            <h2 className="mt-1 font-display text-[26px] tracking-tight text-ghost">On the rail</h2>
            <p className="mt-1 text-[15px] text-white/45">Paid pins sit at the top of chat for 3 hours. {SHILL_PIN_SOL} SOL.</p>
            <div className="mt-3 flex gap-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <i key={i} className={`h-1.5 flex-1 rounded-full ${i < pins.length ? "bg-[#ffd24a] shadow-[0_0_10px_rgba(255,210,74,0.6)]" : "bg-white/10"}`} />
              ))}
            </div>
            <button type="button" onClick={() => setSheet("pin")} className="btn-acid mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px]">
              <Rocket className="h-4 w-4" /> Pin a token
            </button>
            <div className="mt-4 divide-y divide-white/[0.06]">
              {pins.length === 0 && <p className="py-8 text-[15px] text-white/45">No pins live. Be first.</p>}
              {pins.map((p) => (
                <button key={p.id} type="button" onClick={() => setOpenPin(p)} className="flex w-full items-center gap-3 py-3 text-left">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-14 w-14 rounded-[18px] object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/10 text-sm text-acid">{(p.symbol || "?").slice(0, 2)}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-semibold text-white">{tick(p.symbol)}</p>
                    <p className="truncate text-[14px] text-white/45">
                      {p.name} · {fmtPinLeft(p.endsAt - now)} left
                    </p>
                  </div>
                  <span className="text-[15px] text-acid">{p.votes || voteByMint[p.mint] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {tab === "board" && (
          <div className="min-h-0 overflow-y-auto px-4 py-5 lg:col-start-1 lg:hidden">
            <VoteBoard rows={voteRows} canVote={canVote} onVote={upvote} nextVote={nextVote} now={now} />
            {you && (
              <button type="button" onClick={() => owner && setPeek(owner)} className="shill-glass mt-5 flex w-full items-center gap-3 rounded-2xl p-3 text-left">
                <RankBadge rank={you.rank} size={40} />
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-white">Your rank · {you.title}</div>
                  <div className="font-mono text-[11px] text-mute">{you.need === 0 ? "Maxed" : `${you.need} XP to next`}</div>
                </div>
              </button>
            )}
          </div>
        )}

        <div className={`relative z-20 border-t border-white/10 bg-[#04000a]/70 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:col-start-1 ${tab === "chat" ? "" : "hidden lg:block"}`}>
          {!owner ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-[14px] text-mute">Connect Phantom to chat.</p>
              <WalletConnect />
            </div>
          ) : (
            <>
              {reply && (
                <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5 text-[13px] text-mute">
                  <span className="truncate">
                    Reply to {nameOf(reply.owner, pack?.profiles)}: {reply.text || reply.sticker || "message"}
                  </span>
                  <button type="button" onClick={() => setReply(null)} className="ml-2 text-white/60">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <form
                noValidate
                className="flex items-center gap-2 px-3 py-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (text.trim()) send();
                }}
              >
                <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mute hover:bg-white/5" onClick={() => setStickers((v) => !v)} aria-label="Stickers">
                  <Smile className="h-6 w-6" />
                </button>
                <input
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    const t = Date.now();
                    if (t - lastType.current > 1800) {
                      lastType.current = t;
                      act({ action: "typing" }).catch(() => {});
                    }
                  }}
                  onFocus={() => {
                    stickToBottom.current = true;
                    window.scrollTo(0, 0);
                    requestAnimationFrame(() => {
                      window.scrollTo(0, 0);
                      const box = scroller.current;
                      if (box) box.scrollTop = box.scrollHeight;
                    });
                  }}
                  placeholder="Message"
                  enterKeyHint="send"
                  className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 text-[16px] text-white outline-none backdrop-blur-md placeholder:text-white/30"
                />
                <button type="submit" disabled={busy || !text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-acid text-void shadow-[0_0_22px_rgba(20,241,149,0.35)] disabled:opacity-35" aria-label="Send">
                  <Send className="h-5 w-5" />
                </button>
              </form>
              {stickers && (
                <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto border-t border-white/5 px-3 py-2 sm:grid-cols-8">
                  {SHILL_STICKERS.map((s) => (
                    <button key={s} type="button" className="flex h-12 items-center justify-center" onClick={() => send({ sticker: s, kind: "sticker" })}>
                      <BurstSticker emoji={s} size={40} />
                    </button>
                  ))}
                </div>
              )}
              {err && <p className="px-4 pb-2 text-sm text-blood">{err}</p>}
            </>
          )}
        </div>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-white/10 bg-black/15 p-5 backdrop-blur-md lg:col-start-2 lg:row-start-2 lg:row-span-2 lg:block">
          <VoteBoard rows={voteRows} canVote={canVote} onVote={upvote} nextVote={nextVote} now={now} />
          {you && (
            <button type="button" onClick={() => owner && setPeek(owner)} className="shill-glass mt-6 flex w-full items-center gap-3 rounded-2xl p-3 text-left">
              <RankBadge rank={you.rank} size={40} />
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-white">Your rank · {you.title}</div>
                <div className="font-mono text-[11px] text-mute">{you.need === 0 ? "Maxed" : `${you.need} XP to next`}</div>
              </div>
            </button>
          )}
        </aside>

        {peek && (
          <ProfileOverlay
            pubkey={peek}
            viewer={owner}
            onClose={() => setPeek(null)}
            onModerated={() => load(true).catch(() => {})}
          />
        )}
        {toast && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[60] flex justify-center">
            <div className="rounded-full bg-acid px-5 py-2 font-display text-base text-void">{toast}</div>
          </div>
        )}

        {openPin && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm" onClick={() => setOpenPin(null)}>
            <div className="panel-bubble w-full max-w-sm rounded-3xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                {openPin.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={openPin.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-void font-display text-acid">
                    {(openPin.symbol || "?").slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-xl text-white">{tick(openPin.symbol)}</div>
                  <div className="truncate text-[13px] text-mute">{openPin.name}</div>
                  {openPin.mcUsd ? <div className="stat-num text-[12px] text-acid">{fmtMc(openPin.mcUsd)}</div> : null}
                </div>
                <button type="button" onClick={() => setOpenPin(null)} className="text-white/50" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 break-all font-mono text-[11px] text-white/50">{openPin.mint}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button type="button" disabled={!canVote} className="rounded-full border border-acid/40 py-2.5 text-[14px] text-acid disabled:opacity-40" onClick={() => upvote(openPin.mint)}>
                  Up
                </button>
                <button type="button" className="rounded-full border border-white/15 py-2.5 text-[14px] text-white" onClick={() => copyMint(openPin.mint)}>
                  Copy CA
                </button>
                <button type="button" className="rounded-full bg-acid py-2.5 text-[14px] font-semibold text-void" onClick={() => openSwap(openPin.mint)}>
                  Buy
                </button>
              </div>
            </div>
          </div>
        )}

        <Sheet open={sheet === "pin"} title="Pin to the rail" onClose={() => setSheet(null)}>
          <p className="text-[14px] text-mute">Pin your project to the top of chat. {SHILL_PIN_SOL} SOL · 3 hours.</p>
          <p className="mt-1 font-mono text-[12px] text-white/70">{slots > 0 ? `${slots} paid spots open` : `No paid spots · next in ${waitMin}m`}</p>
          {owner ? (
            <>
              <input
                value={pinMint}
                onChange={(e) => setPinMint(e.target.value.trim())}
                placeholder="Token CA"
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 font-mono text-[13px] text-white outline-none"
              />
              <button
                type="button"
                disabled={pinBusy || !pinMint}
                onClick={pin}
                className="btn-acid mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[15px] disabled:opacity-40"
              >
                <Rocket className="h-4 w-4" />
                {pinBusy ? "Paying…" : `Pin · ${SHILL_PIN_SOL} SOL`}
              </button>
            </>
          ) : (
            <div className="mt-3">
              <WalletConnect />
            </div>
          )}
        </Sheet>

        <Sheet open={sheet === "ranks"} title="Live board" onClose={() => setSheet(null)}>
          <VoteBoard
            rows={voteRows}
            canVote={canVote}
            onVote={(mint) => {
              upvote(mint);
            }}
            nextVote={nextVote}
            now={now}
          />
        </Sheet>

        <Sheet open={sheet === "swap"} title="Swap" onClose={() => setSheet(null)}>
          <SwapWidget key={swapMint || "swap"} owner={owner} defaultMint={swapMint} />
        </Sheet>
      </div>
    </main>
  );
}
