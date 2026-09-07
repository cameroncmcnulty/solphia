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

export function WalletConnect({ compact: _compact = false }: { compact?: boolean }) {
  const [addr, setAddr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
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
      setAddr(next);
      setOwner(next);
    };
    found?.on?.("accountChanged", onAccount);
    found?.on?.("disconnect", onAccount);
    return () => {
      mounted.current = false;
      found?.off?.("accountChanged", onAccount);
      found?.off?.("disconnect", onAccount);
    };
  }, []);

  async function connect() {
    const found = phantom();
    if (!found) {
      const target = encodeURIComponent(window.location.href);
      window.location.href = `https://phantom.app/ul/browse/${target}?ref=https://solphia.io`;
      return;
    }
    setBusy(true);
    const prev = addr;
    try {
      if (addr && found.publicKey?.toString() === addr && found.disconnect) {
        try {
          await withTimeout(found.disconnect(), 4000, "disconnect");
        } catch {
          /* still try connect */
        }
      }
      const res = await withTimeout(found.connect(), 20000, "connect");
      const pubkey = res.publicKey.toString();
      setAddr(pubkey);
      setOwner(pubkey);
    } catch {
      if (prev) {
        setAddr(prev);
        setOwner(prev);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={connect}
      title={addr ? "Switch Phantom wallet" : "Connect Phantom"}
      className="btn-ghost inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 font-mono text-[10px] tracking-widest sm:h-11 sm:gap-2 sm:px-4 sm:text-[11px]"
    >
      <PhantomMark className="h-4 w-4 shrink-0 text-white sm:h-5 sm:w-5" />
      <span className="whitespace-nowrap">
        {busy ? "…" : addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "CONNECT"}
      </span>
    </button>
  );
}
