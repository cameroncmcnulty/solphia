"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownUp } from "lucide-react";

export function SwapShell({
  title = "Swap",
  subtitle = "Solphia curve only. You sign. Tokens land in the wallet you connected.",
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
          <ArrowDownUp className="h-5 w-5" />
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

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PRESETS = [0.1, 0.25, 0.5, 1];

function dec(mint: string) {
  if (mint === SOL_MINT) return 9;
  if (mint === USDC_MINT) return 6;
  return 6;
}

function toAtoms(amount: number, mint: string) {
  return String(Math.max(1, Math.round(amount * 10 ** dec(mint))));
}

function fromAtoms(raw: string, mint: string) {
  const n = Number(raw) / 10 ** dec(mint);
  if (!Number.isFinite(n)) return "—";
  return n >= 1 ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : n.toPrecision(4);
}

export function SwapWidget({
  owner,
  title = "Swap",
  defaultMint = "",
}: {
  owner?: string | null;
  title?: string;
  defaultMint?: string;
}) {
  const [mint, setMint] = useState(defaultMint || USDC_MINT);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.1");
  const [quote, setQuote] = useState("");
  const [feeNote, setFeeNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [out, setOut] = useState("");

  useEffect(() => {
    if (defaultMint && defaultMint.length > 30) setMint(defaultMint);
  }, [defaultMint]);

  useEffect(() => {
    const n = Number(amount);
    if (!owner || !(n > 0) || mint.length < 32) {
      setQuote("");
      return;
    }
    const t = window.setTimeout(() => {
      const inputMint = side === "buy" ? SOL_MINT : mint;
      const outputMint = side === "buy" ? mint : SOL_MINT;
      fetch("/api/jup/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount: toAtoms(n, inputMint),
          taker: owner,
        }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (!j?.ok || !j.outAmount) {
            setQuote("");
            setErr(typeof j?.error === "string" ? j.error : "");
            return;
          }
          setErr("");
          setQuote(fromAtoms(String(j.outAmount), outputMint));
          const bps = Number(j.feeBps) || 0;
          const collecting = bps >= 50 && Boolean(j.referralAccount);
          setFeeNote(collecting ? `Fee ${bps} bps · Solphia 1% integrator` : `Fee ${bps} bps · referral not collecting`);
        })
        .catch(() => setQuote(""));
    }, 320);
    return () => window.clearTimeout(t);
  }, [owner, mint, side, amount]);

  async function go() {
    setErr("");
    setOut("");
    if (!owner) {
      setErr("Connect Phantom first.");
      return;
    }
    const n = Number(amount);
    if (!(n > 0)) {
      setErr("Enter an amount.");
      return;
    }
    setBusy(true);
    try {
      const { signPhantomTxB64 } = await import("@/lib/wallet/trading");
      const inputMint = side === "buy" ? SOL_MINT : mint;
      const outputMint = side === "buy" ? mint : SOL_MINT;
      const order = await fetch("/api/jup/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount: toAtoms(n, inputMint),
          taker: owner,
        }),
      }).then((r) => r.json());
      if (!order.transaction) throw new Error(order.error || "Jupiter could not build this swap.");
      const signed = await signPhantomTxB64(order.transaction);
      const exe = await fetch("/api/jup/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedTransaction: signed, requestId: order.requestId }),
      }).then((r) => r.json());
      if (!exe.ok) throw new Error(exe.error || "Jupiter execute failed.");
      setOut(`Swapped · ${String(exe.signature).slice(0, 8)}…`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "swap failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SwapShell title={title} subtitle="Jupiter /order + /execute. 1% integrator fee when the referral account is set.">
      <SwapTabs side={side} onSide={setSide} />
      <label className="mt-3 block">
        <span className="font-mono text-[10px] tracking-[0.16em] text-mute">TOKEN</span>
        <input
          value={mint}
          onChange={(e) => setMint(e.target.value.trim())}
          placeholder="Paste contract address"
          className="mt-1 w-full rounded-2xl border border-violet/25 bg-void px-3 py-2.5 font-mono text-[12px] text-ghost outline-none focus:border-acid/50"
        />
      </label>
      <SwapBox label={side === "buy" ? "YOU PAY" : "YOU SELL"} unit={side === "buy" ? "SOL" : "tokens"}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="stat-num w-full bg-transparent text-3xl text-ghost outline-none"
        />
      </SwapBox>
      {side === "buy" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] ${
                Math.abs(Number(amount) - p) < 1e-9 ? "border-acid bg-acid/15 text-acid" : "border-violet/30 text-mute"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="my-2 flex justify-center">
        <button
          type="button"
          onClick={() => setSide((s) => (s === "buy" ? "sell" : "buy"))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-acid/30 bg-void text-acid"
          aria-label="Flip buy and sell"
        >
          <ArrowDownUp className="h-4 w-4" />
        </button>
      </div>
      <SwapBox label="YOU GET" unit={side === "buy" ? "tokens" : "SOL"}>
        <div className="stat-num text-3xl text-ghost">{quote || "—"}</div>
      </SwapBox>
      {feeNote ? <p className="mt-2 font-mono text-[11px] text-white/40">{feeNote}</p> : null}
      <button type="button" disabled={busy || !owner} onClick={() => go().catch(() => {})} className="btn-acid mt-4 w-full rounded-full py-3.5 text-base disabled:opacity-40">
        {busy ? "Swapping…" : !owner ? "Connect Phantom" : side === "buy" ? "Buy now" : "Sell now"}
      </button>
      {out && <p className="mt-2 font-mono text-[11px] text-acid">{out}</p>}
      {err && <p className="mt-2 text-[12px] text-blood">{err}</p>}
    </SwapShell>
  );
}

export { SwapWidget as CircleSwap };
