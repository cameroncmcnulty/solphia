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

function loadJupiterScript(): Promise<void> {
  const w = window as unknown as { Jupiter?: { init: (p: object) => void } };
  if (w.Jupiter?.init) return Promise.resolve();
  const existing = document.querySelector('script[src="https://plugin.jup.ag/plugin-v1.js"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("jupiter script")), { once: true });
      window.setTimeout(() => (w.Jupiter?.init ? resolve() : reject(new Error("jupiter timeout"))), 8000);
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://plugin.jup.ag/plugin-v1.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("jupiter script"));
    document.head.appendChild(s);
  });
}

export function SwapWidget({
  title = "Swap",
  defaultMint = "",
}: {
  owner?: string | null;
  title?: string;
  defaultMint?: string;
}) {
  const target = "jupiter-plugin";
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let gone = false;
    setErr("");
    setReady(false);
    void (async () => {
      try {
        await loadJupiterScript();
        if (gone) return;
        const jup = (window as unknown as { Jupiter?: { init: (p: object) => void } }).Jupiter;
        if (!jup?.init) throw new Error("Jupiter plugin missing");
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
          branding: { logoUri: "https://solphia.io/icon-192.png", name: "Solphia" },
        });
        if (!gone) setReady(true);
      } catch {
        if (!gone) setErr("Jupiter did not load. Refresh, or swap on jup.ag.");
      }
    })();
    return () => {
      gone = true;
    };
  }, [defaultMint]);

  return (
    <SwapShell title={title} subtitle="Jupiter Ultra. 1% protocol fee into the Solphia treasury.">
      <div id={target} className="min-h-[520px] w-full overflow-visible rounded-2xl bg-black/40" />
      {!ready && !err ? <p className="mt-3 text-center text-[13px] text-white/40">Loading Jupiter…</p> : null}
      {err ? <p className="mt-3 text-center text-[13px] text-blood">{err}</p> : null}
    </SwapShell>
  );
}

export { SwapWidget as CircleSwap };
