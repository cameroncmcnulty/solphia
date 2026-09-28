"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Script from "next/script";
import { ArrowDownUp } from "lucide-react";
import {
  JUP_PLUGIN_ACCOUNT,
  JUP_PLUGIN_FEE_BPS,
  JUP_PLUGIN_SOL,
  JUP_PLUGIN_SRC,
  JUP_PLUGIN_USDC,
} from "@/lib/jup/plugin";

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

function bootPlugin(targetId: string, outputMint: string) {
  const jup = window.Jupiter;
  if (!jup?.init) return false;
  try {
    jup.close?.();
  } catch {
    /* first load */
  }
  jup.init({
    displayMode: "integrated",
    integratedTargetId: targetId,
    defaultExplorer: "Solscan",
    containerStyles: { width: "100%", height: "600px", borderRadius: "16px", overflow: "hidden" },
    formProps: {
      initialInputMint: JUP_PLUGIN_SOL,
      initialOutputMint: outputMint,
      referralAccount: JUP_PLUGIN_ACCOUNT,
      referralFee: JUP_PLUGIN_FEE_BPS,
    },
    branding: { logoUri: "https://solphia.io/favicon.png", name: "Solphia" },
  });
  return true;
}

export function SwapWidget({
  title = "Swap",
  defaultMint = "",
}: {
  owner?: string | null;
  title?: string;
  defaultMint?: string;
}) {
  const target = useRef(`jup-plugin-${Math.random().toString(36).slice(2, 10)}`).current;
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const outMint = defaultMint && defaultMint.length > 30 ? defaultMint : JUP_PLUGIN_USDC;

  useEffect(() => {
    let gone = false;
    const go = () => {
      if (gone) return true;
      if (!bootPlugin(target, outMint)) return false;
      setReady(true);
      setErr("");
      return true;
    };
    if (go()) {
      return () => {
        gone = true;
        try {
          window.Jupiter?.close?.();
        } catch {
          /* unmount */
        }
      };
    }
    const t = window.setInterval(() => {
      if (go()) window.clearInterval(t);
    }, 300);
    const giveUp = window.setTimeout(() => {
      window.clearInterval(t);
      if (!gone && !window.Jupiter?.init) setErr("Jupiter plugin did not load. Hard-refresh once.");
    }, 12_000);
    return () => {
      gone = true;
      window.clearInterval(t);
      window.clearTimeout(giveUp);
      try {
        window.Jupiter?.close?.();
      } catch {
        /* unmount */
      }
    };
  }, [outMint, target]);

  return (
    <SwapShell title={title} subtitle="Jupiter Plugin. Search any token. Connect Phantom in the widget. 1% to Solphia.">
      <Script src={JUP_PLUGIN_SRC} strategy="afterInteractive" data-preload />
      <div id={target} className="w-full overflow-hidden rounded-2xl bg-black/40" style={{ height: 600 }} />
      {!ready && !err ? <p className="mt-3 text-center text-[13px] text-white/40">Loading Jupiter…</p> : null}
      {err ? <p className="mt-3 text-center text-[13px] text-blood">{err}</p> : null}
    </SwapShell>
  );
}

export { SwapWidget as CircleSwap };
