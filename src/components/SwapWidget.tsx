"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

function loadPluginScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Jupiter?.init) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-jup-plugin]");
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.Jupiter?.init) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Jupiter script failed")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = JUP_PLUGIN_SRC;
    s.async = true;
    s.dataset.jupPlugin = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Jupiter script failed"));
    document.head.appendChild(s);
  });
}

function bootPlugin(targetId: string, outputMint: string) {
  const el = document.getElementById(targetId);
  if (!el || !window.Jupiter?.init) return false;
  window.Jupiter.init({
    displayMode: "integrated",
    integratedTargetId: targetId,
    defaultExplorer: "Solscan",
    containerStyles: { width: "100%", height: "548px" },
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
  defaultMint = "",
}: {
  owner?: string | null;
  title?: string;
  defaultMint?: string;
}) {
  const target = useRef("jupiter-plugin").current;
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const outMint = defaultMint && defaultMint.length > 30 ? defaultMint : JUP_PLUGIN_USDC;

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        await loadPluginScript();
        if (gone) return;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        if (gone) return;
        if (!bootPlugin(target, outMint)) {
          setErr("Jupiter did not mount. Hard-refresh once.");
          return;
        }
        setReady(true);
        setErr("");
      } catch {
        if (!gone) setErr("Jupiter did not load. Hard-refresh once.");
      }
    })();
    return () => {
      gone = true;
    };
  }, [outMint, target]);

  return (
    <div>
      <div id={target} className="w-full overflow-hidden rounded-2xl" style={{ height: 548 }} />
      {!ready && !err ? <p className="mt-3 text-center text-[13px] text-white/40">Loading Jupiter…</p> : null}
      {err ? <p className="mt-3 text-center text-[13px] text-blood">{err}</p> : null}
    </div>
  );
}

export { SwapWidget as CircleSwap };
