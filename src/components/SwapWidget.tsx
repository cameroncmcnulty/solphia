"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ChevronDown, X } from "lucide-react";
import { TokenArt } from "./TokenArt";
import { PhantomMark } from "./PhantomMark";
import { SphaMark } from "./SphaMark";
import { WalletConnect } from "./WalletConnect";
import { useOwner } from "@/lib/hooks";
import { loadOwner } from "@/lib/wallet/owner";
import { signPhantomAndSend } from "@/lib/wallet/trading";
import { isPhantomRedirect, PHANTOM_EVENT } from "@/lib/wallet/phantomConnect";
import type { PhAfter } from "@/lib/wallet/phantomBox";
import { isSolanaAddress } from "@/lib/wallet/addr";
import { MIN_TRADE_SOL } from "@/lib/launch/curve";
import { SOL_MINT } from "@/lib/pair/mints";
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
  return s ? `$${s}` : "";
}

function SolMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#000" />
      <path
        fill="#14F195"
        d="M9.4 20.6c.2-.2.5-.3.8-.3h13.1c.5 0 .8.6.4 1l-2.1 2.1c-.2.2-.5.3-.8.3H7.7c-.5 0-.8-.6-.4-1l2.1-2.1zm0-6.4c.2-.2.5-.3.8-.3h13.1c.5 0 .8.6.4 1l-2.1 2.1c-.2.2-.5.3-.8.3H7.7c-.5 0-.8-.6-.4-1l2.1-2.1zm14.3-4.3-2.1-2.1c-.2-.2-.5-.3-.8-.3H7.7c-.5 0-.8.6-.4 1l2.1 2.1c.2.2.5.3.8.3h13.1c.5 0 .8-.6.4-1z"
      />
    </svg>
  );
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

function TokenChip({
  token,
  sol,
  onClick,
}: {
  token?: SwapToken | null;
  sol?: boolean;
  onClick?: () => void;
}) {
  const inner = sol ? (
    <>
      <SolMark className="h-7 w-7 shrink-0" />
      <span className="text-[15px] font-semibold text-white">SOL</span>
    </>
  ) : token ? (
    <>
      <TokenArt src={token.image} mint={token.mint} label={token.symbol} eager className="h-7 w-7 rounded-full" />
      <span className="max-w-[5.5rem] truncate text-[15px] font-semibold text-white">{token.symbol.replace(/^\$+/, "") || "Token"}</span>
    </>
  ) : (
    <span className="text-[15px] font-semibold text-white">Select</span>
  );
  if (!onClick) {
    return <div className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3">{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-2.5"
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
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.25");
  const [token, setToken] = useState<SwapToken | null>(() =>
    defaultMint && defaultMint.length > 30
      ? { mint: defaultMint, symbol: defaultSymbol || "TOKEN", name: defaultName, image: defaultImage }
      : null,
  );
  const [picker, setPicker] = useState(false);
  const [ca, setCa] = useState("");
  const [caBusy, setCaBusy] = useState(false);
  const [held, setHeld] = useState(0);
  const [solBal, setSolBal] = useState(0);
  const [out, setOut] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<SwapNotice | null>(() => (typeof window !== "undefined" ? loadSwapNotice() : null));
  const noticeRef = useRef<(n: SwapNotice) => void>(() => undefined);

  const mint = token?.mint || "";
  const paySol = side === "buy";
  const payNum = Number(String(amount).replace(",", "."));
  const payOk = Number.isFinite(payNum) && payNum > 0;

  const showNotice = useCallback((n: SwapNotice) => {
    setNotice(saveSwapNotice(n));
  }, []);
  noticeRef.current = showNotice;

  useEffect(() => {
    if (!defaultMint || defaultMint.length < 32) return;
    setToken((cur) => {
      if (cur?.mint === defaultMint) {
        return {
          mint: defaultMint,
          symbol: defaultSymbol || cur.symbol,
          name: defaultName || cur.name,
          image: defaultImage || cur.image,
        };
      }
      return { mint: defaultMint, symbol: defaultSymbol || "TOKEN", name: defaultName, image: defaultImage };
    });
    setSide("buy");
  }, [defaultMint, defaultSymbol, defaultName, defaultImage]);

  useEffect(() => {
    const onPh = (e: Event) => {
      const j = (e as CustomEvent<{ signature?: string; after?: PhAfter; error?: string }>).detail;
      if (!j) return;
      if (j.after?.kind !== "swap" && j.after?.kind !== "jup_swap") return;
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
      setSolBal(0);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/sol/balance?pubkey=${encodeURIComponent(pk)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => setSolBal(Number(j.sol) || 0))
      .catch(() => setSolBal(0));
    return () => ctrl.abort();
  }, [pk, notice?.kind]);

  useEffect(() => {
    if (!pk || !mint) {
      setHeld(0);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/sol/token?owner=${encodeURIComponent(pk)}&mint=${encodeURIComponent(mint)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => setHeld(Number(j.amount) || 0))
      .catch(() => setHeld(0));
    return () => ctrl.abort();
  }, [pk, mint, notice?.kind]);

  const quoteAmount = side === "buy" ? payNum : held;
  useEffect(() => {
    if (!mint || !(quoteAmount > 0) || (side === "buy" && !(payNum > 0))) {
      setOut(null);
      return;
    }
    if (side === "sell" && !(held > 0)) {
      setOut(null);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch("/api/swap/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mint,
          side,
          amount: side === "buy" ? payNum : held,
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
  }, [mint, side, payNum, held, quoteAmount]);

  const catalog = useMemo(() => {
    const rows: SwapToken[] = [];
    const seen = new Set<string>();
    const push = (row?: SwapToken | null) => {
      const m = (row?.mint || "").trim();
      if (!m || seen.has(m) || m === SOL_MINT) return;
      seen.add(m);
      rows.push(row!);
    };
    push(token);
    for (const row of tokens || []) push(row);
    return rows;
  }, [token, tokens]);

  async function pickCa(raw: string) {
    const q = raw.trim();
    if (!isSolanaAddress(q) || q === SOL_MINT) return;
    setCaBusy(true);
    try {
      const r = await fetch(`/api/launch/lookup?mint=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      const coin = j.coin as { mint?: string; symbol?: string; name?: string; image?: string } | undefined;
      const next: SwapToken = {
        mint: coin?.mint || q,
        symbol: coin?.symbol || q.slice(0, 4).toUpperCase(),
        name: coin?.name,
        image: coin?.image,
      };
      setToken(next);
      setPicker(false);
      setCa("");
      onMint?.(next.mint);
    } catch {
      showNotice({ kind: "error", text: "Could not find that mint.", at: Date.now() });
    } finally {
      setCaBusy(false);
    }
  }

  async function go() {
    if (!pk) {
      showNotice({ kind: "error", text: "Connect Phantom to swap.", at: Date.now() });
      return;
    }
    if (!mint) {
      showNotice({ kind: "error", text: "Pick a token.", at: Date.now() });
      return;
    }
    if (side === "buy" && !(payNum >= MIN_TRADE_SOL)) {
      showNotice({ kind: "error", text: `Min ${MIN_TRADE_SOL} SOL.`, at: Date.now() });
      return;
    }
    if (side === "sell" && !(held > 0)) {
      showNotice({ kind: "error", text: "You have none of this token in this wallet.", at: Date.now() });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/swap/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner: pk,
          mint,
          side,
          amount: side === "buy" ? payNum : held,
          slippageBps: 100,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not build the swap.");
      const sig = await signPhantomAndSend(j.transaction, undefined, {
        kind: "swap",
        owner: pk,
        mint,
        side,
        sol: side === "buy" ? payNum : undefined,
        tokens: side === "sell" ? held : undefined,
      });
      showNotice({ kind: "ok", text: `Swap landed. ${sig}`, at: Date.now() });
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
      showNotice(noticeFromSwapError(e));
    } finally {
      setBusy(false);
    }
  }

  const payBal = paySol ? solBal : held;
  const getBal = paySol ? held : solBal;
  const cta = !pk
    ? "Connect Phantom"
    : !mint
      ? "Select a token"
      : busy
        ? "Swapping…"
        : side === "buy"
          ? `Buy ${tick(token?.symbol) || "token"}`
          : `Sell ${tick(token?.symbol) || "token"}`;

  return (
    <div className="relative z-20 w-full min-w-0">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0714] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
          <p className="text-[18px] font-semibold tracking-tight text-white">Swap</p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-white/35">SOLPHIA CURVE</p>
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

        <div className="relative px-3 pb-2 pt-3 sm:px-4">
          <div className="rounded-[22px] bg-white/[0.04] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[0.16em] text-white/40">YOU PAY</p>
              <p className="font-mono text-[11px] text-white/35">
                {paySol ? `${fmtSol(payBal, 4)} SOL` : `${fmtTok(payBal)} ${token?.symbol.replace(/^\$+/, "") || ""}`}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={side === "sell" ? fmtTok(held) : amount}
                readOnly={side === "sell"}
                onChange={(e) => {
                  if (side === "sell") return;
                  setAmount(e.target.value.replace(/[^\d.,]/g, ""));
                }}
                className="min-w-0 flex-1 bg-transparent text-[28px] font-semibold tracking-tight text-white outline-none sm:text-[32px]"
                placeholder="0.00"
              />
              <TokenChip sol={paySol} token={paySol ? null : token} onClick={paySol ? undefined : () => setPicker(true)} />
            </div>
            {side === "buy" ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className={`rounded-full px-3 py-1 font-mono text-[11px] ${
                      Math.abs(payNum - p) < 1e-9 ? "bg-acid text-void" : "bg-white/8 text-white/55"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(fmtSol(Math.max(MIN_TRADE_SOL, Math.max(0, solBal - 0.02)), 4))}
                  className="rounded-full bg-white/8 px-3 py-1 font-mono text-[11px] text-white/55"
                >
                  MAX
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setSide((s) => (s === "buy" ? "sell" : "buy"))}
            className="absolute left-1/2 top-[50%] z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#0b0714] bg-white/10 text-white"
            aria-label="Flip direction"
          >
            <ArrowDown className="h-4 w-4" />
          </button>

          <div className="mt-2 rounded-[22px] bg-white/[0.04] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[0.16em] text-white/40">YOU RECEIVE</p>
              <p className="font-mono text-[11px] text-white/35">
                {paySol ? `${fmtTok(getBal)} ${token?.symbol.replace(/^\$+/, "") || ""}` : `${fmtSol(getBal, 4)} SOL`}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">
                {out == null ? "—" : paySol ? fmtTok(out) : fmtSol(out, 4)}
              </p>
              <TokenChip sol={!paySol} token={paySol ? token : null} onClick={paySol ? () => setPicker(true) : undefined} />
            </div>
          </div>
        </div>

        <div className="px-3 pb-4 sm:px-4">
          {!pk ? (
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || !mint}
              onClick={() => void go()}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#14f195] text-[16px] font-semibold text-[#04000a] disabled:opacity-40"
            >
              <PhantomMark className="h-4 w-4" />
              {cta}
            </button>
          )}
          {token ? (
            <p className="mt-3 text-center font-mono text-[11px] text-white/35">
              {out != null && side === "buy" && payNum > 0
                ? `1 SOL ≈ ${fmtTok(out / payNum)} ${token.symbol.replace(/^\$+/, "")}`
                : "You sign. Tokens land in this Phantom."}
            </p>
          ) : (
            <p className="mt-3 text-center text-[13px] text-white/40">Pick a Solphia token or paste a CA.</p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2 text-white/35">
            <SphaMark className="h-5 w-5 opacity-80" />
            <p className="font-mono text-[10px] tracking-[0.18em]">POWERED BY SOLPHIA</p>
          </div>
        </div>
      </div>

      {picker ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => setPicker(false)}>
          <div
            className="max-h-[min(32rem,80svh)] w-full max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0714] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[16px] font-semibold text-white">Select token</p>
              <button type="button" onClick={() => setPicker(false)} className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white">
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
                placeholder="Search by CA"
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
                  onClick={() => {
                    setToken(row);
                    setPicker(false);
                    onMint?.(row.mint);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5"
                >
                  <TokenArt src={row.image} mint={row.mint} label={row.symbol} eager className="h-9 w-9 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-white">{row.symbol.replace(/^\$+/, "")}</p>
                    <p className="truncate font-mono text-[11px] text-white/35">{row.name || row.mint.slice(0, 8) + "…"}</p>
                  </div>
                </button>
              ))}
              {catalog.length === 0 ? <p className="py-6 text-center text-[13px] text-white/40">Paste a CA to trade a Solphia token.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { SwapWidget as CircleSwap };
