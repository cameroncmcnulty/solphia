"use client";

import { useEffect, useRef, useState } from "react";
import { PhantomMark } from "./PhantomMark";
import { loadOwner, persistOwner, OWNER_EVENT } from "@/lib/wallet/owner";
import { beginPhantomConnect, completePhantomConnect, hasPhantomSigner, openThisPageInPhantom, signerPage } from "@/lib/wallet/phantomConnect";

type Provider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  on?: (event: string, handler: (pk?: { toString(): string } | null) => void) => void;
  off?: (event: string, handler: (pk?: { toString(): string } | null) => void) => void;
};

declare global {
  interface Window {
    phantom?: { solana?: Provider };
    solana?: Provider;
    __SOLPHIA_OWNER?: string | null;
  }
}

function phantom(): Provider | null {
  if (typeof window === "undefined") return null;
  const p = window.phantom?.solana;
  if (p?.isPhantom) return p;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

function keep(pubkey: string | null | undefined) {
  if (pubkey) persistOwner(pubkey);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

let switching = false;

function waitForPhantom(ms = 900): Promise<Provider | null> {
  const found = phantom();
  if (found) return Promise.resolve(found);
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const p = phantom();
      if (p) {
        resolve(p);
        return;
      }
      if (Date.now() - start >= ms) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 80);
    };
    window.addEventListener("phantom#initialized", () => resolve(phantom()), { once: true });
    tick();
  });
}

function openPhantomBrowse() {
  beginPhantomConnect();
}

function silentTrusted(p: Provider | null) {
  if (!p) return;
  p.connect({ onlyIfTrusted: true }).then(
    (res) => keep(res?.publicKey?.toString()),
    () => undefined,
  );
}

/** Disconnect then connect so Phantom opens the account picker. Saved wallet is never cleared. */
export async function switchPhantom(): Promise<string | null> {
  const found = phantom();
  if (!found) {
    openPhantomBrowse();
    return loadOwner();
  }
  switching = true;
  const previous = loadOwner();
  try {
    if (found.publicKey && found.disconnect) {
      try {
        await withTimeout(found.disconnect(), 4000, "disconnect");
      } catch {
        /* still open the picker */
      }
    }
    const res = await withTimeout(found.connect(), 20000, "connect");
    const pubkey = res.publicKey.toString();
    persistOwner(pubkey);
    return pubkey;
  } catch {
    const cur = found.publicKey?.toString() || previous;
    if (cur) persistOwner(cur);
    return cur;
  } finally {
    switching = false;
  }
}

/** Keep Phantom session across phone tab sleeps and in-app switches. Mount once in the shell. */
export function WalletKeepalive() {
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null;
    let attached: Provider | null = null;

    const onAccount = (pk?: { toString(): string } | null) => {
      if (switching) return;
      if (!pk) {
        const saved = loadOwner();
        if (saved) persistOwner(saved, { server: false });
        return;
      }
      persistOwner(pk.toString());
    };

    const bind = (p: Provider | null) => {
      if (attached === p) return;
      attached?.off?.("accountChanged", onAccount);
      attached = p;
      p?.on?.("accountChanged", onAccount);
    };

    const wake = (opts?: { server?: boolean }) => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const p = phantom();
      bind(p);
      if (p?.publicKey) {
        persistOwner(p.publicKey.toString(), { server: opts?.server !== false });
        return;
      }
      const saved = loadOwner();
      if (saved) persistOwner(saved, { announce: true, server: opts?.server !== false });
      silentTrusted(p);
    };

    const restoreFromCookie = () => {
      const saved = loadOwner();
      if (saved) {
        persistOwner(saved, { server: true });
        return;
      }
      fetch("/api/wallet/remember", { credentials: "include", cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (j?.pubkey) persistOwner(String(j.pubkey));
        })
        .catch(() => undefined);
    };

    const fromUl = completePhantomConnect();
    if (fromUl) persistOwner(fromUl);
    restoreFromCookie();
    wake({ server: true });

    let tries = 0;
    poll = setInterval(() => {
      tries += 1;
      const p = phantom();
      bind(p);
      if (p?.publicKey) {
        persistOwner(p.publicKey.toString(), { server: tries % 8 === 0 });
        if (tries > 20 && poll) {
          clearInterval(poll);
          poll = setInterval(() => wake({ server: false }), 8000);
        }
        return;
      }
      if (document.visibilityState === "visible" && tries % 5 === 1) silentTrusted(p);
      if (tries > 40 && poll) {
        clearInterval(poll);
        poll = setInterval(() => wake({ server: false }), 8000);
      }
    }, 400);

    const onShow = () => wake({ server: true });
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("online", onShow);
    window.addEventListener("phantom#initialized", onShow as EventListener);
    return () => {
      if (poll) clearInterval(poll);
      attached?.off?.("accountChanged", onAccount);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("online", onShow);
      window.removeEventListener("phantom#initialized", onShow as EventListener);
    };
  }, []);
  return null;
}

export function WalletConnect({ compact: _compact = false }: { compact?: boolean }) {
  const [addr, setAddr] = useState<string | null>(() => (typeof window === "undefined" ? null : loadOwner()));
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const fromUl = completePhantomConnect();
    const saved = fromUl || loadOwner();
    if (saved) setAddr(saved);
    const found = phantom();
    if (found?.publicKey) {
      const pubkey = found.publicKey.toString();
      setAddr(pubkey);
      persistOwner(pubkey);
    } else {
      silentTrusted(found);
    }
    const onAccount = (pk?: { toString(): string } | null) => {
      if (!pk) return;
      const next = pk.toString();
      setAddr(next);
      persistOwner(next);
    };
    found?.on?.("accountChanged", onAccount);
    const onOwner = (e: Event) => {
      const pk = (e as CustomEvent<string | null>).detail || loadOwner();
      if (pk) setAddr(pk);
    };
    window.addEventListener(OWNER_EVENT, onOwner as EventListener);
    return () => {
      mounted.current = false;
      found?.off?.("accountChanged", onAccount);
      window.removeEventListener(OWNER_EVENT, onOwner as EventListener);
    };
  }, []);

  async function connect() {
    setBusy(true);
    try {
      const found = phantom() || (await waitForPhantom(hasPhantomSigner() ? 1200 : 250));
      if (!found) {
        if (signerPage()) openThisPageInPhantom();
        else beginPhantomConnect();
        return;
      }
      const res = await withTimeout(found.connect(), 20000, "connect");
      const pubkey = res.publicKey.toString();
      setAddr(pubkey);
      persistOwner(pubkey);
    } catch {
      /* user closed Phantom */
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  if (addr) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        connect();
      }}
      title="Connect Phantom"
      className="relative z-[70] btn-ghost inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 font-mono text-[10px] tracking-widest sm:h-11 sm:gap-2 sm:px-4 sm:text-[11px]"
    >
      <PhantomMark className="h-4 w-4 shrink-0 text-white sm:h-5 sm:w-5" />
      <span className="whitespace-nowrap">{busy ? "…" : "CONNECT"}</span>
    </button>
  );
}
