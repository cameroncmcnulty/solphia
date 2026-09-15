"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownUp } from "lucide-react";
import { isSolanaAddress } from "@/lib/wallet/addr";
import { signAndSendPhantom } from "@/lib/wallet/trading";
import { WalletConnect } from "./WalletConnect";

const PRESETS = [0.1, 0.25, 0.5, 1];

export function SwapShell({
  title = "Swap",
  subtitle = "Buy or sell from the wallet you connected. You sign. Tokens land there.",
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-acid/25 bg-gradient-to-b from-acid/[0.14] via-[#12081c] to-violet/[0.16] p-4 shadow-[0_18px_50px_rgba(20,241,149,0.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-xl text-ghost sm:text-2xl">{title}</div>
          <p className="mt-1 text-[13px] leading-snug text-mute">{subtitle}</p>
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

export function SwapWidget({
  owner,
  title = "Swap",
  defaultMint = "",
}: {
  owner?: string | null;
  title?: string;
  defaultMint?: string;
}) {
  const [mint, setMint] = useState(defaultMint);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.1");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [quote, setQuote] = useState("");
  const [quoteUnit, setQuoteUnit] = useState("tokens");

  useEffect(() => {
    if (defaultMint) setMint((m) => m || defaultMint);
  }, [defaultMint]);

  useEffect(() => {
    fetch("/api/spha", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (typeof j?.mint === "string" && j.mint) setMint((m) => m || j.mint);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const n = Number(amount);
    if (!isSolanaAddress(mint) || !(n > 0)) {
      setQuote("");
      return;
    }
    const t = window.setTimeout(() => {
      fetch("/api/swap/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint, side, amount: n }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (!j?.ok) {
            setQuote("");
            return;
          }
          if (side === "buy") {
            setQuote(Number(j.outAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }));
            setQuoteUnit("tokens");
          } else {
            setQuote(Number(j.outAmount || 0).toFixed(4));
            setQuoteUnit("SOL");
          }
        })
        .catch(() => setQuote(""));
    }, 280);
    return () => window.clearTimeout(t);
  }, [mint, side, amount]);

  async function go() {
    setErr("");
    setOut("");
    if (!owner) {
      setErr("Connect your wallet first.");
      return;
    }
    if (!isSolanaAddress(mint)) {
      setErr("Paste a token contract address.");
      return;
    }
    const n = Number(amount);
    if (!(n > 0)) {
      setErr("Enter an amount.");
      return;
    }
    setBusy(true);
    try {
      const built = await fetch("/api/swap/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, mint, side, amount: n }),
      }).then((r) => r.json());
      if (!built.transaction) throw new Error(built.error || "No route.");
      const sig = await signAndSendPhantom(built.transaction);
      setOut(`${side === "buy" ? "Bought" : "Sold"} · ${sig.slice(0, 8)}…`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "swap failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SwapShell title={title}>
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
          className="w-full bg-transparent font-display text-3xl text-ghost outline-none"
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
      <SwapBox label="YOU GET" unit={quoteUnit}>
        <div className="font-display text-3xl text-ghost">{quote || "—"}</div>
      </SwapBox>
      {owner ? (
        <button type="button" disabled={busy} onClick={go} className="btn-acid mt-4 w-full rounded-full py-3.5 text-base disabled:opacity-40">
          {busy ? "Swapping…" : side === "buy" ? "Buy now" : "Sell now"}
        </button>
      ) : (
        <div className="mt-4 flex justify-center">
          <WalletConnect />
        </div>
      )}
      {out && <p className="mt-2 font-mono text-[11px] text-acid">{out}</p>}
      {err && <p className="mt-2 text-[12px] text-blood">{err}</p>}
    </SwapShell>
  );
}

export { SwapWidget as CircleSwap };
