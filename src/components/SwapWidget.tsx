"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowDownUp, X } from "lucide-react";
import {
  JUP_PLUGIN_ACCOUNT,
  JUP_PLUGIN_FEE_BPS,
  JUP_PLUGIN_SOL,
  JUP_PLUGIN_SRC,
  JUP_PLUGIN_USDC,
} from "@/lib/jup/plugin";
import { jupWalletState, syncJupiterWallet } from "@/lib/jup/passthrough";
import {
  clearSwapNotice,
  loadSwapNotice,
  noticeFromSwapError,
  saveSwapNotice,
  SWAP_NOTICE_EVENT,
  type SwapNotice,
} from "@/lib/jup/swapNotice";
import { useOwner } from "@/lib/hooks";
import { loadOwner, persistOwner, OWNER_EVENT } from "@/lib/wallet/owner";
import {
  inPhantomWebView,
  injectedProvider,
  openPhantomUl,
  PHANTOM_EVENT,
  phantomSignError,
  waitForInjected,
} from "@/lib/wallet/phantomConnect";
import type { PhAfter } from "@/lib/wallet/phantomBox";
import { PhantomMark } from "./PhantomMark";

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

function boxHeight(el: HTMLElement) {
  const measured = el.clientHeight;
  if (measured >= 260) return Math.min(520, measured);
  const vh = window.innerHeight || 700;
  return Math.max(280, Math.min(400, Math.round(vh - 240)));
}

function bootPlugin(
  targetId: string,
  outputMint: string,
  height: number,
  onRequestConnectWallet: () => void | Promise<void>,
  pubkey: string | null,
  onSwapError: (args: { error?: unknown }) => void,
  onSuccess: (args: { txid?: string }) => void,
) {
  const el = document.getElementById(targetId);
  if (!el || !window.Jupiter?.init) return false;
  try {
    window.Jupiter.close?.();
  } catch {
    /* first mount */
  }
  window.Jupiter.init({
    displayMode: "integrated",
    integratedTargetId: targetId,
    defaultExplorer: "Solscan",
    autoConnect: false,
    enableWalletPassthrough: true,
    passthroughWalletContextState: jupWalletState(pubkey),
    onRequestConnectWallet,
    onSwapError,
    onSuccess,
    containerStyles: { width: "100%", height: `${height}px`, overflow: "visible" },
    formProps: {
      initialInputMint: JUP_PLUGIN_SOL,
      initialOutputMint: outputMint,
      referralAccount: JUP_PLUGIN_ACCOUNT,
      referralFee: JUP_PLUGIN_FEE_BPS,
    },
    branding: { logoUri: "https://solphia.io/favicon.png", name: "Solphia" },
  });
  window.Jupiter.onSwapError = onSwapError;
  window.Jupiter.onSuccess = onSuccess;
  return true;
}

export function SwapWidget({
  owner,
  defaultMint = "",
}: {
  owner?: string | null;
  title?: string;
  defaultMint?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const target = `jup-${uid}`;
  const siteOwner = useOwner();
  const pk = owner || siteOwner || (typeof window !== "undefined" ? loadOwner() : null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<SwapNotice | null>(() => (typeof window !== "undefined" ? loadSwapNotice() : null));
  const [busy, setBusy] = useState(false);
  const connectRef = useRef<() => Promise<void>>(async () => undefined);
  const pkRef = useRef(pk);
  pkRef.current = pk;
  const noticeRef = useRef<(n: SwapNotice) => void>(() => undefined);
  const outMint = defaultMint && defaultMint.length > 30 ? defaultMint : JUP_PLUGIN_USDC;

  const livePk = () => pkRef.current || loadOwner();

  const showNotice = (n: SwapNotice) => {
    setNotice(saveSwapNotice(n));
  };
  noticeRef.current = showNotice;

  const onPluginError = (args: { error?: unknown }) => {
    noticeRef.current(noticeFromSwapError(args?.error));
  };

  const onPluginSuccess = (args: { txid?: string }) => {
    const sig = typeof args?.txid === "string" ? args.txid.trim() : "";
    noticeRef.current({
      kind: "ok",
      text: sig ? `Swap landed. ${sig}` : "Swap landed.",
      at: Date.now(),
    });
  };

  connectRef.current = async () => {
    const existing = livePk();
    if (existing) syncJupiterWallet(existing);
    setBusy(true);
    try {
      let found = injectedProvider();
      if (!found) {
        await waitForInjected(inPhantomWebView() ? 8000 : 4000);
        found = injectedProvider();
      }
      if (found?.connect) {
        const res = await found.connect();
        const pubkey = res.publicKey.toString();
        persistOwner(pubkey);
        syncJupiterWallet(pubkey);
        return;
      }
      if (existing) {
        syncJupiterWallet(existing);
        return;
      }
      if (inPhantomWebView()) {
        showNotice({ kind: "error", text: "Pull down to refresh this tab, then tap Connect Phantom.", at: Date.now() });
        return;
      }
      await openPhantomUl({ pubkey: loadOwner() });
    } catch (e) {
      if (e instanceof Error && e.message === "PHANTOM_REDIRECT") return;
      showNotice({ kind: "error", text: phantomSignError(e).message, at: Date.now() });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onPh = (e: Event) => {
      const j = (e as CustomEvent<{ signature?: string; after?: PhAfter; error?: string }>).detail;
      if (!j) return;
      if (j.after?.kind !== "jup_swap") return;
      if (j.error) {
        noticeRef.current(noticeFromSwapError(j.error));
        return;
      }
      if (j.signature) {
        noticeRef.current({ kind: "ok", text: `Swap landed. ${j.signature}`, at: Date.now() });
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
  }, []);

  useEffect(() => {
    if (!ready) return;
    const push = () => syncJupiterWallet(livePk());
    push();
    const onOwner = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      syncJupiterWallet(detail || livePk());
    };
    window.addEventListener(OWNER_EVENT, onOwner as EventListener);
    window.addEventListener("phantom#initialized", push);
    window.addEventListener("focus", push);
    window.addEventListener("pageshow", push);
    const t = window.setInterval(push, 600);
    return () => {
      window.removeEventListener(OWNER_EVENT, onOwner as EventListener);
      window.removeEventListener("phantom#initialized", push);
      window.removeEventListener("focus", push);
      window.removeEventListener("pageshow", push);
      window.clearInterval(t);
    };
  }, [pk, ready]);

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        await loadPluginScript();
        if (gone) return;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const el = document.getElementById(target);
        if (gone || !el) return;
        const height = boxHeight(el);
        el.style.height = `${height}px`;
        const pubkey = livePk();
        if (
          !bootPlugin(
            target,
            outMint,
            height,
            () => {
              void connectRef.current();
            },
            pubkey,
            onPluginError,
            onPluginSuccess,
          )
        ) {
          setNotice({ kind: "error", text: "Jupiter did not mount.", at: Date.now() });
          return;
        }
        if (window.Jupiter) {
          window.Jupiter.enableWalletPassthrough = true;
          window.Jupiter.onRequestConnectWallet = () => {
            void connectRef.current();
          };
          window.Jupiter.onSwapError = onPluginError;
          window.Jupiter.onSuccess = onPluginSuccess;
        }
        syncJupiterWallet(pubkey);
        setReady(true);
      } catch {
        if (!gone) setNotice({ kind: "error", text: "Jupiter did not load.", at: Date.now() });
      }
    })();
    return () => {
      gone = true;
      try {
        window.Jupiter?.close?.();
      } catch {
        /* unmount */
      }
    };
  }, [outMint, target]);

  return (
    <div className="relative z-20 flex min-h-0 w-full flex-1 flex-col">
      {!pk ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void connectRef.current()}
          className="mb-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white/10 px-3 text-[14px] font-semibold text-white"
        >
          <PhantomMark className="h-4 w-4" />
          {busy ? "Connecting…" : "Connect Phantom"}
        </button>
      ) : null}
      {notice ? (
        <div
          className={`mb-2 flex shrink-0 items-start gap-2 rounded-2xl border px-3 py-2 ${
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
      <div
        id={target}
        className="h-[min(22.5rem,calc(100svh-12.5rem))] max-h-full min-h-[16rem] w-full flex-1 overflow-visible rounded-2xl sm:h-[min(28rem,calc(100svh-10rem))]"
      />
      {!ready && !notice ? <p className="mt-2 shrink-0 text-center text-[13px] text-white/40">Loading Jupiter…</p> : null}
    </div>
  );
}

export { SwapWidget as CircleSwap };
