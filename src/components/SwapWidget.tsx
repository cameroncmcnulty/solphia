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
const JUP_REF = (process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT || "").trim();

export function SwapWidget({
  title = "Swap",
  defaultMint = "",
}: {
  owner?: string | null;
  title?: string;
  defaultMint?: string;
}) {
  const [target] = useState(() => "jup-swap-" + Math.random().toString(36).slice(2, 10));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let gone = false;
    const boot = () => {
      const jup = (window as unknown as { Jupiter?: { init: (p: object) => void; close?: () => void } }).Jupiter;
      if (!jup?.init) return false;
      try {
        jup.close?.();
      } catch {
        /* first load */
      }
      const formProps: Record<string, string | number> = {
        initialInputMint: SOL_MINT,
        initialOutputMint: defaultMint && defaultMint.length > 30 ? defaultMint : USDC_MINT,
        referralFee: 100,
      };
      if (JUP_REF) formProps.referralAccount = JUP_REF;
      jup.init({
        displayMode: "integrated",
        integratedTargetId: target,
        defaultExplorer: "Solscan",
        formProps,
        branding: { logoUri: "https://solphia.io/og.jpg", name: "Solphia" },
      });
      setReady(true);
      return true;
    };
    if (boot()) return () => { gone = true; };
    const t = window.setInterval(() => {
      if (gone) return;
      if (boot()) window.clearInterval(t);
    }, 350);
    return () => {
      gone = true;
      window.clearInterval(t);
      try {
        (window as unknown as { Jupiter?: { close?: () => void } }).Jupiter?.close?.();
      } catch {
        /* unmount */
      }
    };
  }, [defaultMint, target]);

  return (
    <SwapShell title={title} subtitle="Jupiter Ultra. 1% protocol fee into the Solphia treasury.">
      <div id={target} className="min-h-[480px] w-full overflow-hidden rounded-2xl" />
      {!ready ? <p className="mt-3 text-center text-[13px] text-white/40">Loading Jupiter…</p> : null}
    </SwapShell>
  );
}

export { SwapWidget as CircleSwap };
