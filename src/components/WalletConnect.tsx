"use client";

import { useEffect, useState } from "react";
import { PhantomMark } from "./PhantomMark";

type Provider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  on?: (event: string, handler: (pk?: { toString(): string } | null) => void) => void;
  off?: (event: string, handler: (pk?: { toString(): string } | null) => void) => void;
  signMessage?: (msg: Uint8Array, enc?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
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

export function WalletConnect({ compact: _compact = false }: { compact?: boolean }) {
  const [addr, setAddr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const found = phantom();
    if (found?.publicKey) {
      const pubkey = found.publicKey.toString();
      setAddr(pubkey);
      setOwner(pubkey);
    }
    const onAccount = (pk?: { toString(): string } | null) => {
      const next = pk ? pk.toString() : null;
      setAddr(next);
      setOwner(next);
    };
    found?.on?.("accountChanged", onAccount);
    found?.on?.("disconnect", onAccount);
    return () => {
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
      if (addr && found.disconnect) {
        await found.disconnect();
      }
      const res = await found.connect();
      const pubkey = res.publicKey.toString();
      setAddr(pubkey);
      setOwner(pubkey);
      const nonceRes = await fetch("/api/session");
      const nonceJson = await nonceRes.json();
      if (found.signMessage && nonceJson.message) {
        const serverMsg = String(nonceJson.message).replace("YOUR_WALLET", pubkey);
        const encoded = new TextEncoder().encode(serverMsg);
        const signed = await found.signMessage(encoded, "utf8");
        const sig = signed && typeof signed === "object" && "signature" in signed ? signed.signature : (signed as Uint8Array);
        const b64 = btoa(String.fromCharCode(...Array.from(sig)));
        await fetch("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pubkey, signature: b64 }),
        });
      }
    } catch {
      if (prev) {
        setAddr(prev);
        setOwner(prev);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={connect}
      title={addr ? "Switch Phantom wallet" : "Connect Phantom"}
      className="btn-ghost inline-flex min-h-[40px] items-center gap-2 rounded-full px-3 py-2 font-mono text-[11px] tracking-widest sm:min-h-[44px] sm:px-4"
    >
      <PhantomMark className="h-5 w-5 shrink-0 text-white" />
      {busy ? "SIGNING…" : addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "CONNECT"}
    </button>
  );
}
