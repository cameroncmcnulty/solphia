"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUpDown, ChevronDown, X } from "lucide-react";
import { TokenArt } from "./TokenArt";
import { PhantomMark } from "./PhantomMark";
import { SphaMark } from "./SphaMark";
import { SolanaMark } from "./SolanaMark";
import { WalletConnect } from "./WalletConnect";
import { useOwner } from "@/lib/hooks";
import { loadOwner } from "@/lib/wallet/owner";
import { signPhantomAndSend } from "@/lib/wallet/trading";
import { isPhantomRedirect, PHANTOM_EVENT } from "@/lib/wallet/phantomConnect";
import { markActionSpot } from "@/lib/wallet/actionSpot";
import type { PhAfter } from "@/lib/wallet/phantomBox";
import { isSolanaAddress } from "@/lib/wallet/addr";
import { MIN_TRADE_SOL } from "@/lib/launch/curve";
import { SOL_MINT, USDC_MINT } from "@/lib/pair/mints";
import { amountExceedsBalance, maxPayString, spendableAmount } from "@/lib/swap/spendable";
import { isPlaceholderLabel } from "@/lib/launch/labels";
import {
  clearSwapNotice,
  loadSwapNotice,
  noticeFromSwapError,
  saveSwapNotice,
  SWAP_NOTICE_EVENT,
  type SwapNotice,
} from "@/lib/jup/swapNotice";

const PRESETS = [0.1, 0.25, 0.5, 1];

export type SwapToken = {
  mint: string;
  symbol: string;
  name?: string;
  image?: string;
};

function fmtSol(n: number, d = 4) {
  if (!(n > 0)) return "0";
  if (n >= 1) return n.toFixed(Math.min(d, 4)).replace(/0+$/, "").replace(/\.$/, "");
  return n.toFixed(Math.min(6, d + 2)).replace(/0+$/, "").replace(/\.$/, "");
}

function fmtTok(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(n >= 100 ? 2 : 4).replace(/0+$/, "").replace(/\.$/, "");
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function tick(symbol?: string) {
  const s = (symbol || "").replace(/^\$+/, "").replace(/\*+$/, "").trim();
  if (!s || isPlaceholderLabel(s)) return "";
  return `$${s}`;
}

function liveLabel(symbol?: string, name?: string, mint?: string) {
  const s = (symbol || "").replace(/^\$+/, "").replace(/\*+$/, "").trim();
  if (s && !isPlaceholderLabel(s)) return s;
  const n = (name || "").trim();
  if (n && !isPlaceholderLabel(n)) return n;
  const m = (mint || "").trim();
  return m.length >= 4 ? m.slice(0, 4).toUpperCase() : "";
}

function tokenFromMint(mint: string, symbol?: string, name?: string, image?: string): SwapToken {
  const s = (symbol || "").replace(/^\$+/, "").replace(/\*+$/, "").trim();
  const n = (name || "").trim();
  return {
    mint,
    symbol: s && !isPlaceholderLabel(s) ? s : "",
    name: n && !isPlaceholderLabel(n) ? n : "",
    image,
  };
}

export function SwapShell({
  title = "Swap",
  subtitle = "Solphia curve. You sign. Tokens land in the wallet you connected.",
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="pump-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[22px] font-semibold tracking-tight text-white">{title}</div>
          <p className="mt-1 text-[15px] leading-snug text-white/45">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-acid/15 text-acid">
          <ArrowDown className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function SwapTabs({ side, onSide }: { side: "buy" | "sell"; onSide: (s: "buy" | "sell") => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full bg-black/35 p-1">
      {(["buy", "sell"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSide(s)}
          className={`rounded-full py-2.5 text-sm font-semibold tracking-wide ${
            side === s ? (s === "buy" ? "bg-acid text-void shadow-[0_0_18px_rgba(20,241,149,0.35)]" : "bg-blood text-ghost") : "text-mute hover:text-ghost"
          }`}
        >
          {s === "buy" ? "Buy" : "Sell"}
        </button>
      ))}
    </div>
  );
}

export function SwapBox({
  label,
  unit,
  children,
}: {
  label: string;
  unit: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-violet/25 bg-void/80 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.18em] text-mute">{label}</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-acid">{unit}</span>
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const SOL_TOKEN: SwapToken = { mint: SOL_MINT, symbol: "SOL", name: "Solana" };
const USDC_TOKEN: SwapToken = { mint: USDC_MINT, symbol: "USDC", name: "USD Coin" };

function TokenChip({ token, onClick }: { token?: SwapToken | null; onClick?: () => void }) {
  const sol = token?.mint === SOL_MINT;
  const inner = sol ? (
    <>
      <SolanaMark className="h-7 w-7 shrink-0" />
      <span className="text-[15px] font-semibold text-white">SOL</span>
    </>
  ) : token ? (
    <>
      <TokenArt src={token.image} mint={token.mint} label={token.symbol} eager className="h-7 w-7 rounded-full" />
      <span className="max-w-[5.5rem] truncate text-[15px] font-semibold text-white">{liveLabel(token.symbol, token.name, token.mint)}</span>
    </>
  ) : (
    <span className="text-[15px] font-semibold text-white">Select</span>
  );
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-2.5"
    >
      {inner}
      <ChevronDown className="h-4 w-4 text-white/50" />
    </button>
  );
}

export function SwapWidget({
  owner,
  defaultMint = "",
  defaultSymbol = "",
  defaultName = "",
  defaultImage = "",
  tokens,
  onDone,
  onMint,
}: {
  owner?: string | null;
  title?: string;
  defaultMint?: string;
  defaultSymbol?: string;
  defaultName?: string;
  defaultImage?: string;
  tokens?: SwapToken[];
  onDone?: () => void;
  onMint?: (mint: string) => void;
}) {
  const siteOwner = useOwner();
  const pk = owner || siteOwner || (typeof window !== "undefined" ? loadOwner() : null);
  const seeded = defaultMint && defaultMint.length > 30
    ? tokenFromMint(defaultMint, defaultSymbol, defaultName, defaultImage)
    : USDC_TOKEN;
  const [pay, setPay] = useState<SwapToken>(SOL_TOKEN);
  const [recv, setRecv] = useState<SwapToken>(seeded);
  const [amount, setAmount] = useState("");
  const [picker, setPicker] = useState<"pay" | "recv" | null>(null);
  const [ca, setCa] = useState("");
  const [caBusy, setCaBusy] = useState(false);
  const [bals, setBals] = useState<Record<string, number>>({});
  const [out, setOut] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<SwapNotice | null>(() => (typeof window !== "undefined" ? loadSwapNotice() : null));
  const noticeRef = useRef<(n: SwapNotice) => void>(() => undefined);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef(false);
  const lookedUpMint = useRef("");
  const loadBalsRef = useRef<() => void>(() => undefined);

  function stayOnCard() {
    markActionSpot("swap-widget");
    const go = (n = 0) => {
      const el = rootRef.current || document.getElementById("swap-widget");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (n < 16) requestAnimationFrame(() => go(n + 1));
    };
    go();
  }

  const payNum = Number(String(amount).replace(",", "."));
  const payIsSol = pay.mint === SOL_MINT;
  const recvIsSol = recv.mint === SOL_MINT;
  const payBal = pay.mint === SOL_MINT ? bals[SOL_MINT] || 0 : bals[pay.mint] || 0;
  const recvBal = recv.mint === SOL_MINT ? bals[SOL_MINT] || 0 : bals[recv.mint] || 0;
  const balKnown = Boolean(pk) && Object.prototype.hasOwnProperty.call(bals, payIsSol ? SOL_MINT : pay.mint);
  const spendable = spendableAmount(payBal, pay.mint);
  const short = Boolean(pk && balKnown && amountExceedsBalance(payNum, spendable));

  const showNotice = useCallback((n: SwapNotice) => {
    setNotice(saveSwapNotice(n));
  }, []);
  noticeRef.current = showNotice;

  useEffect(() => {
    if (!defaultMint || defaultMint.length < 32) return;
    const next = tokenFromMint(defaultMint, defaultSymbol, defaultName, defaultImage);
    setRecv((cur) => (cur.mint === defaultMint ? { ...cur, ...next } : next));
    setPay((cur) => (cur.mint === defaultMint ? SOL_TOKEN : cur));
  }, [defaultMint, defaultSymbol, defaultName, defaultImage]);

  useEffect(() => {
    const mint = recv.mint;
    if (!mint || mint === SOL_MINT || mint === USDC_MINT || mint.length < 32) return;
    if (recv.symbol && !isPlaceholderLabel(recv.symbol)) return;
    if (lookedUpMint.current === mint) return;
    lookedUpMint.current = mint;
    const ctrl = new AbortController();
    void fetch(`/api/launch/lookup?mint=${encodeURIComponent(mint)}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const coin = j?.coin as { symbol?: string; name?: string; image?: string } | undefined;
        const symbol = liveLabel(coin?.symbol, coin?.name, mint);
        if (!symbol || isPlaceholderLabel(symbol)) return;
        setRecv((cur) =>
          cur.mint !== mint
            ? cur
            : {
                ...cur,
                symbol,
                name: (coin?.name || "").trim() || cur.name,
                image: coin?.image || cur.image,
              },
        );
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [recv.mint, recv.symbol, recv.name]);

  useEffect(() => {
    const onPh = (e: Event) => {
      const j = (e as CustomEvent<{ signature?: string; after?: PhAfter; error?: string }>).detail;
      if (!j) return;
      const ours = j.after?.kind === "swap" || j.after?.kind === "jup_swap" || (!j.after && liveRef.current);
      if (!ours) return;
      liveRef.current = false;
      stayOnCard();
      if (j.error) {
        noticeRef.current(noticeFromSwapError(j.error));
        return;
      }
      if (j.signature) {
        noticeRef.current({ kind: "ok", text: `Swap landed. ${j.signature}`, at: Date.now() });
        onDone?.();
      }
    };
    const onStored = (e: Event) => {
      const detail = (e as CustomEvent<SwapNotice | null>).detail;
      setNotice(detail ?? loadSwapNotice());
    };
    window.addEventListener(PHANTOM_EVENT, onPh as EventListener);
    window.addEventListener(SWAP_NOTICE_EVENT, onStored as EventListener);
    return () => {
      window.removeEventListener(PHANTOM_EVENT, onPh as EventListener);
      window.removeEventListener(SWAP_NOTICE_EVENT, onStored as EventListener);
    };
  }, [onDone]);

  useEffect(() => {
    if (!pk) {
      setBals({});
      loadBalsRef.current = () => undefined;
      return;
    }
    let ctrl = new AbortController();
    const load = () => {
      ctrl.abort();
      ctrl = new AbortController();
      const signal = ctrl.signal;
      const mints = [...new Set([pay.mint, recv.mint, SOL_MINT])];
      void (async () => {
        const next: Record<string, number> = {};
        const sol = await fetch(`/api/sol/balance?pubkey=${encodeURIComponent(pk)}`, { signal, cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null);
        next[SOL_MINT] = Number(sol?.sol) || 0;
        await Promise.all(
          mints
            .filter((m) => m !== SOL_MINT)
            .map(async (m) => {
              const j = await fetch(`/api/sol/token?owner=${encodeURIComponent(pk)}&mint=${encodeURIComponent(m)}`, {
                signal,
                cache: "no-store",
              })
                .then((r) => r.json())
                .catch(() => null);
              next[m] = Number(j?.amount) || 0;
            }),
        );
        if (!signal.aborted) setBals(next);
      })();
    };
    loadBalsRef.current = load;
    load();
    return () => ctrl.abort();
  }, [pk, pay.mint, recv.mint, notice?.kind, notice?.at]);

  useEffect(() => {
    if (!notice) return;
    stayOnCard();
    if (notice.kind !== "ok") return;
    const t1 = window.setTimeout(() => loadBalsRef.current(), 800);
    const t2 = window.setTimeout(() => loadBalsRef.current(), 2500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [notice?.kind, notice?.at]);

  useEffect(() => {
    if (!(payNum > 0) || !pay.mint || !recv.mint || pay.mint === recv.mint || short) {
      setOut(null);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch("/api/swap/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inputMint: pay.mint,
          outputMint: recv.mint,
          amount: payNum,
          slippageBps: 100,
        }),
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) setOut(Number(j.outAmount) || 0);
          else setOut(null);
        })
        .catch(() => setOut(null));
    }, 280);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [pay.mint, recv.mint, payNum, short]);

  const catalog = useMemo(() => {
    const rows: SwapToken[] = [];
    const seen = new Set<string>();
    const push = (row?: SwapToken | null) => {
      const m = (row?.mint || "").trim();
      if (!m || seen.has(m)) return;
      seen.add(m);
      rows.push(row!);
    };
    push(SOL_TOKEN);
    push(USDC_TOKEN);
    push(pay);
    push(recv);
    for (const row of tokens || []) push(row);
    return rows;
  }, [pay, recv, tokens]);

  function applyPick(next: SwapToken) {
    const slot = picker;
    setPicker(null);
    setCa("");
    if (!slot) return;
    if (slot === "pay") {
      if (next.mint === recv.mint) setRecv(pay);
      setPay(next);
    } else {
      if (next.mint === pay.mint) setPay(recv);
      setRecv(next);
    }
    if (next.mint !== SOL_MINT) onMint?.(next.mint);
  }

  async function pickCa(raw: string) {
    const q = raw.trim();
    if (!isSolanaAddress(q)) return;
    if (q === SOL_MINT) {
      applyPick(SOL_TOKEN);
      return;
    }
    setCaBusy(true);
    try {
      const r = await fetch(`/api/launch/lookup?mint=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      const coin = j?.coin as { mint?: string; symbol?: string; name?: string; image?: string } | undefined;
      applyPick({
        mint: coin?.mint || q,
        symbol: liveLabel(coin?.symbol, coin?.name, q),
        name: (coin?.name || "").trim() || liveLabel(coin?.symbol, coin?.name, q),
        image: coin?.image,
      });
    } catch {
      applyPick({ mint: q, symbol: q.slice(0, 4).toUpperCase(), name: q.slice(0, 8) });
    } finally {
      setCaBusy(false);
    }
  }

  function flip() {
    setPay(recv);
    setRecv(pay);
    if (out != null && out > 0) setAmount(String(out));
  }

  async function go() {
    if (!pk) {
      showNotice({ kind: "error", text: "Connect Phantom to swap.", at: Date.now() });
      return;
    }
    if (!pay.mint || !recv.mint || pay.mint === recv.mint) {
      showNotice({ kind: "error", text: "Pick two different tokens.", at: Date.now() });
      return;
    }
    if (pay.mint === SOL_MINT && !(payNum >= MIN_TRADE_SOL)) {
      showNotice({ kind: "error", text: `Min ${MIN_TRADE_SOL} SOL.`, at: Date.now() });
      return;
    }
    if (!(payNum > 0)) {
      showNotice({ kind: "error", text: "Enter an amount.", at: Date.now() });
      return;
    }
    if (short) {
      showNotice({
        kind: "error",
        text: payIsSol
          ? `Not enough SOL. This wallet has ${fmtSol(payBal, 4)} SOL.`
          : `Not enough ${pay.symbol.replace(/^\$+/, "")} in this wallet.`,
        at: Date.now(),
      });
      return;
    }
    setBusy(true);
    liveRef.current = true;
    markActionSpot("swap-widget");
    stayOnCard();
    try {
      const r = await fetch("/api/swap/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner: pk,
          inputMint: pay.mint,
          outputMint: recv.mint,
          amount: payNum,
          slippageBps: 100,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not build the swap.");
      const sig = await signPhantomAndSend(
        j.transaction,
        undefined,
        {
          kind: "swap",
          owner: pk,
          mint: recv.mint,
          side: pay.mint === SOL_MINT ? "buy" : "sell",
          sol: pay.mint === SOL_MINT ? payNum : undefined,
          tokens: pay.mint === SOL_MINT ? undefined : payNum,
        },
        { skipPreflight: false },
      );
      liveRef.current = false;
      stayOnCard();
      showNotice({ kind: "ok", text: `Swap landed. ${sig}`, at: Date.now() });
      const feeMint = pay.mint === SOL_MINT ? recv.mint : pay.mint;
      void fetch("/api/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sweep_partner", pubkey: pk, mint: feeMint }),
      }).catch(() => {});
      onDone?.();
    } catch (e) {
      if (isPhantomRedirect(e)) {
        showNotice({
          kind: "pending",
          text: "Approve in Phantom. You'll come back here.",
          at: Date.now(),
        });
        return;
      }
      liveRef.current = false;
      stayOnCard();
      showNotice(noticeFromSwapError(e));
    } finally {
      setBusy(false);
    }
  }

  const cta = !pk
    ? "Connect Phantom"
    : busy
      ? "Swapping…"
      : short
        ? payIsSol
          ? "Not enough SOL"
          : `Not enough ${pay.symbol.replace(/^\$+/, "")}`
        : `Swap ${tick(pay.symbol) || pay.symbol} → ${tick(recv.symbol) || recv.symbol}`;

  return (
    <div ref={rootRef} id="swap-widget" className="relative z-20 w-full min-w-0 scroll-mt-20">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0714] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
          <p className="text-[18px] font-semibold tracking-tight text-white">Swap</p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-white/35">ANY SOLANA TOKEN</p>
        </div>

        {notice ? (
          <div
            className={`mx-4 mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2 sm:mx-5 ${
              notice.kind === "error"
                ? "border-blood/40 bg-blood/10 text-blood"
                : notice.kind === "ok"
                  ? "border-acid/40 bg-acid/10 text-acid"
                  : "border-white/20 bg-white/5 text-white/80"
            }`}
            role="status"
          >
            <p className="min-w-0 flex-1 break-all text-left text-[13px] leading-snug">{notice.text}</p>
            <button
              type="button"
              onClick={() => {
                clearSwapNotice();
                setNotice(null);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-current opacity-70"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="px-3 pb-2 pt-3 sm:px-4">
          <div className="rounded-[22px] bg-white/[0.04] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[0.16em] text-white/40">YOU PAY</p>
              <p className="font-mono text-[11px] text-white/35">
                {pk
                  ? payIsSol
                    ? `Balance ${fmtSol(payBal, 4)} SOL`
                    : `Balance ${maxPayString(payBal, pay.mint)} ${pay.symbol.replace(/^\$+/, "")}`
                  : ""}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                className="min-w-0 flex-1 bg-transparent text-[28px] font-semibold tracking-tight text-white outline-none sm:text-[32px]"
                placeholder="0.00"
              />
              <TokenChip token={pay} onClick={() => setPicker("pay")} />
            </div>
          </div>

          <div className="relative z-10 -my-3 flex justify-center">
            <button
              type="button"
              onClick={flip}
              className="flex h-11 w-11 items-center justify-center rounded-full border-[5px] border-[#0b0714] bg-[#1c152c] text-white shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition hover:bg-acid hover:text-void active:rotate-180"
              aria-label="Flip tokens"
            >
              <ArrowUpDown className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>

          <div className="rounded-[22px] bg-white/[0.04] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[0.16em] text-white/40">YOU RECEIVE</p>
              <p className="font-mono text-[11px] text-white/35">
                {pk
                  ? recvIsSol
                    ? `Balance ${fmtSol(recvBal, 4)} SOL`
                    : `Balance ${maxPayString(recvBal, recv.mint)} ${recv.symbol.replace(/^\$+/, "")}`
                  : ""}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">
                {out == null ? "—" : recvIsSol ? fmtSol(out, 4) : fmtTok(out)}
              </p>
              <TokenChip token={recv} onClick={() => setPicker("recv")} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {payIsSol
              ? PRESETS.map((p) => {
                  const tooBig = Boolean(pk && balKnown && p > spendable + 1e-9);
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={tooBig}
                      onClick={() => setAmount(String(p))}
                      className={`rounded-full px-3 py-1.5 font-mono text-[11px] disabled:opacity-30 ${
                        Math.abs(payNum - p) < 1e-9 ? "bg-acid text-void" : "bg-white/8 text-white/55"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })
              : [0.25, 0.5, 0.75].map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={!(spendable > 0)}
                    onClick={() => setAmount(maxPayString(spendable * p, pay.mint))}
                    className="rounded-full bg-white/8 px-3 py-1.5 font-mono text-[11px] text-white/55 disabled:opacity-30"
                  >
                    {Math.round(p * 100)}%
                  </button>
                ))}
            <button
              type="button"
              disabled={!(spendable > 0)}
              onClick={() => setAmount(maxPayString(spendable, pay.mint))}
              className="rounded-full bg-white/8 px-3 py-1.5 font-mono text-[11px] text-white/55 disabled:opacity-30"
            >
              MAX
            </button>
          </div>
          {short ? (
            <p className="mt-2 text-center text-[13px] text-blood">
              {payIsSol
                ? `This wallet has ${fmtSol(payBal, 4)} SOL. Try MAX or a smaller amount.`
                : `This wallet does not have ${fmtTok(payNum)} ${pay.symbol.replace(/^\$+/, "")}.`}
            </p>
          ) : null}
        </div>

        <div className="px-3 pb-4 sm:px-4">
          {!pk ? (
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || pay.mint === recv.mint || short || !(payNum > 0)}
              onClick={() => void go()}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#14f195] text-[16px] font-semibold text-[#04000a] disabled:opacity-40"
            >
              <PhantomMark className="h-4 w-4" />
              {cta}
            </button>
          )}
          <p className="mt-3 text-center text-[13px] text-white/45">Tokens land in your connected wallet.</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-white/35">
            <SphaMark className="h-5 w-5 opacity-80" />
            <p className="font-mono text-[10px] tracking-[0.18em]">POWERED BY SOLPHIA</p>
          </div>
        </div>
      </div>

      {picker ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => setPicker(null)}>
          <div
            className="max-h-[min(32rem,80svh)] w-full max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0714] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[16px] font-semibold text-white">Select token</p>
              <button type="button" onClick={() => setPicker(null)} className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white">
                Close
              </button>
            </div>
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                void pickCa(ca);
              }}
            >
              <input
                value={ca}
                onChange={(e) => setCa(e.target.value.trim())}
                placeholder="Paste any Solana CA"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 font-mono text-[13px] text-white outline-none"
              />
            </form>
            <button
              type="button"
              disabled={caBusy || !isSolanaAddress(ca)}
              onClick={() => void pickCa(ca)}
              className="mt-2 w-full rounded-full bg-white/10 py-2.5 text-[14px] text-white disabled:opacity-40"
            >
              {caBusy ? "Looking up…" : "Use this mint"}
            </button>
            <div className="mt-3 max-h-[18rem] space-y-1 overflow-y-auto">
              {catalog.map((row) => (
                <button
                  key={row.mint}
                  type="button"
                  onClick={() => applyPick(row)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5"
                >
                  {row.mint === SOL_MINT ? (
                    <SolanaMark className="h-9 w-9" />
                  ) : (
                    <TokenArt src={row.image} mint={row.mint} label={row.symbol} eager className="h-9 w-9 rounded-full" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-white">{liveLabel(row.symbol, row.name, row.mint)}</p>
                    <p className="truncate font-mono text-[11px] text-white/35">{row.name || row.mint.slice(0, 8) + "…"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { SwapWidget as CircleSwap };
