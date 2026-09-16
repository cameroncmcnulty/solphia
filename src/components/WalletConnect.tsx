"use client";

import { useEffect, useRef, useState } from "react";
import { PhantomMark } from "./PhantomMark";

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
  }
}

function phantom(): Provider | null {
  if (typeof window === "undefined") return null;
  const p = window.phantom?.solana;
  if (p?.isPhantom) return p;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

function setOwner(pubkey: string | null) {
  if (pubkey) localStorage.setItem("solphia_owner", pubkey);
  else localStorage.removeItem("solphia_owner");
  window.dispatchEvent(new CustomEvent("solphia-owner", { detail: pubkey }));
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

function openPhantomBrowse() {
  const target = encodeURIComponent(window.location.href);
  window.location.href = `https://phantom.app/ul/browse/${target}?ref=https://solphia.io`;
}

/** Disconnect then connect so Phantom opens the account picker. */
export async function switchPhantom(): Promise<string | null> {
  const found = phantom();
  if (!found) {
    openPhantomBrowse();
    return null;
  }
  switching = true;
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
    setOwner(pubkey);
    return pubkey;
  } catch {
    const cur = found.publicKey?.toString() || (typeof window !== "undefined" ? localStorage.getItem("solphia_owner") : null);
    if (cur) setOwner(cur);
    return cur;
  } finally {
    switching = false;
  }
}

/** Keep Phantom session across phone tab sleeps. Mount once in the shell. */
export function WalletKeepalive() {
  useEffect(() => {
    const wake = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const saved = localStorage.getItem("solphia_owner");
      const p = phantom();
      if (p?.publicKey) {
        setOwner(p.publicKey.toString());
        return;
      }
      if (saved) {
        window.dispatchEvent(new CustomEvent("solphia-owner", { detail: saved }));
      }
      p?.connect({ onlyIfTrusted: true }).then(
        (res) => {
          if (res?.publicKey) setOwner(res.publicKey.toString());
        },
        () => undefined,
      );
    };
    const onAccount = (pk?: { toString(): string } | null) => {
      if (!pk) return;
      setOwner(pk.toString());
    };
    const found = phantom();
    found?.on?.("accountChanged", onAccount);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    wake();
    return () => {
      found?.off?.("accountChanged", onAccount);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
    };
  }, []);
  return null;
}

export function WalletConnect({ compact: _compact = false }: { compact?: boolean }) {
  const [addr, setAddr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const saved = typeof window !== "undefined" ? localStorage.getItem("solphia_owner") : null;
    if (saved) setAddr(saved);
    const found = phantom();
    if (found?.publicKey) {
      const pubkey = found.publicKey.toString();
      setAddr(pubkey);
      setOwner(pubkey);
    } else if (found) {
      found.connect({ onlyIfTrusted: true }).then(
        (res) => {
          if (!mounted.current || !res?.publicKey) return;
          const pubkey = res.publicKey.toString();
          setAddr(pubkey);
          setOwner(pubkey);
        },
        () => undefined,
      );
    }
    const onAccount = (pk?: { toString(): string } | null) => {
      const next = pk ? pk.toString() : null;
      if (!next) {
        /* Phone browsers fire a null account when the tab backgrounds. Keep the saved wallet. */
        return;
      }
      setAddr(next);
      setOwner(next);
    };
    found?.on?.("accountChanged", onAccount);
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      const p = phantom();
      if (p?.publicKey) {
        const pubkey = p.publicKey.toString();
        setAddr(pubkey);
        setOwner(pubkey);
        return;
      }
      const saved = localStorage.getItem("solphia_owner");
      if (saved) setAddr(saved);
      p?.connect({ onlyIfTrusted: true }).then(
        (res) => {
          if (!res?.publicKey) return;
          const pubkey = res.publicKey.toString();
          setAddr(pubkey);
          setOwner(pubkey);
        },
        () => undefined,
      );
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    const onOwner = (e: Event) => {
      const pk = (e as CustomEvent<string | null>).detail || null;
      setAddr(pk);
    };
    window.addEventListener("solphia-owner", onOwner as EventListener);
    return () => {
      mounted.current = false;
      found?.off?.("accountChanged", onAccount);
      window.removeEventListener("solphia-owner", onOwner as EventListener);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, []);

  async function connect() {
    const found = phantom();
    if (!found) {
      openPhantomBrowse();
      return;
    }
    setBusy(true);
    try {
      const res = await withTimeout(found.connect(), 20000, "connect");
      const pubkey = res.publicKey.toString();
      setAddr(pubkey);
      setOwner(pubkey);
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
      onClick={connect}
      title="Connect Phantom"
      className="btn-ghost inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 font-mono text-[10px] tracking-widest sm:h-11 sm:gap-2 sm:px-4 sm:text-[11px]"
    >
      <PhantomMark className="h-4 w-4 shrink-0 text-white sm:h-5 sm:w-5" />
      <span className="whitespace-nowrap">{busy ? "…" : "CONNECT"}</span>
    </button>
  );
}
