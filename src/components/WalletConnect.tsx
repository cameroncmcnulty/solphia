"use client";

import { useEffect, useState } from "react";
import { PhantomMark } from "./PhantomMark";

type Provider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
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

export function WalletConnect({ compact = false }: { compact?: boolean }) {
  const [addr, setAddr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const found = phantom();
    if (found?.publicKey) {
      const pubkey = found.publicKey.toString();
      setAddr(pubkey);
      localStorage.setItem("solphia_owner", pubkey);
      window.dispatchEvent(new CustomEvent("solphia-owner", { detail: pubkey }));
    }
  }, []);

  async function connect() {
    const found = phantom();
    if (!found) {
      const target = encodeURIComponent(window.location.href);
      window.location.href = `https://phantom.app/ul/browse/${target}?ref=https://solphia.io`;
      return;
    }
    setBusy(true);
    try {
      const res = await found.connect();
      const pubkey = res.publicKey.toString();
      setAddr(pubkey);
      localStorage.setItem("solphia_owner", pubkey);
      window.dispatchEvent(new CustomEvent("solphia-owner", { detail: pubkey }));
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
      setAddr(null);
    } finally {
      setBusy(false);
    }
  }

  if (addr) {
    return (
      <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest text-cyan">
        <PhantomMark className="h-4 w-4 shrink-0" />
        {compact ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : `PHANTOM ${addr.slice(0, 4)}…${addr.slice(-4)}`}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={connect}
      className="btn-ghost inline-flex min-h-[40px] items-center gap-2 rounded-full px-3 py-2 font-mono text-[11px] sm:min-h-[44px] sm:px-4"
    >
      <PhantomMark className="h-4 w-4 shrink-0" />
      {busy ? "Signing…" : compact ? "Phantom" : "Connect Phantom"}
    </button>
  );
}
