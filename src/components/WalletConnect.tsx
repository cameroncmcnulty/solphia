"use client";

import { useEffect, useState } from "react";

type Provider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signMessage?: (msg: Uint8Array, enc?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
};

declare global {
  interface Window {
    phantom?: { solana?: Provider };
    solflare?: Provider;
    solana?: Provider;
  }
}

function pick(): { name: string; provider: Provider } | null {
  if (typeof window === "undefined") return null;
  if (window.phantom?.solana?.isPhantom) return { name: "Phantom", provider: window.phantom.solana };
  if (window.solflare?.isSolflare) return { name: "Solflare", provider: window.solflare };
  if (window.solana) return { name: window.solana.isPhantom ? "Phantom" : "Wallet", provider: window.solana };
  return null;
}

export function WalletConnect({ compact = false }: { compact?: boolean }) {
  const [addr, setAddr] = useState<string | null>(null);
  const [label, setLabel] = useState("CONNECT");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const found = pick();
    if (found?.provider.publicKey) {
      const pubkey = found.provider.publicKey.toString();
      setAddr(pubkey);
      localStorage.setItem("solphia_owner", pubkey);
      window.dispatchEvent(new CustomEvent("solphia-owner", { detail: pubkey }));
    }
  }, []);

  async function connect() {
    const found = pick();
    if (!found) {
      const target = encodeURIComponent(window.location.href);
      window.location.href = `https://phantom.app/ul/browse/${target}?ref=https://solphia.io`;
      return;
    }
    setBusy(true);
    try {
      const res = await found.provider.connect();
      const pubkey = res.publicKey.toString();
      setAddr(pubkey);
      localStorage.setItem("solphia_owner", pubkey);
      window.dispatchEvent(new CustomEvent("solphia-owner", { detail: pubkey }));
      const nonceRes = await fetch("/api/session");
      const nonceJson = await nonceRes.json();
      if (found.provider.signMessage) {
        const msg = new TextEncoder().encode(
          `SOLPHIA wants you to sign in.\nOrigin: ${window.location.origin.replace(/\/$/, "") === "http://localhost:3100" ? "https://solphia.io" : document.querySelector("meta[property='og:url']")?.getAttribute("content") || "https://solphia.io"}\nAddress: ${pubkey}\nNonce: ${nonceJson.nonce}\nThis proves wallet control. Solphia never asks for your seed.`,
        );
        // Use the exact server message:
        const serverMsg = nonceJson.message.replace("YOUR_WALLET", pubkey);
        const encoded = new TextEncoder().encode(serverMsg);
        const signed = await found.provider.signMessage(encoded, "utf8");
        const sig = signed && typeof signed === "object" && "signature" in signed ? signed.signature : (signed as Uint8Array);
        const b64 = btoa(String.fromCharCode(...Array.from(sig)));
        await fetch("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pubkey, signature: b64 }),
        });
        void msg;
      }
    } catch {
      setLabel("REJECTED");
    } finally {
      setBusy(false);
    }
  }

  if (addr) {
    return (
      <div className="font-mono text-[11px] tracking-widest text-cyan">
        {compact ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : `${label === "CONNECT" ? "LINKED" : label} ${addr.slice(0, 4)}…${addr.slice(-4)}`}
      </div>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={connect}
      className="btn-ghost inline-flex min-h-[40px] items-center rounded-full px-3 py-2 font-mono text-[11px] sm:min-h-[44px] sm:px-4"
    >
      {busy ? "Signing…" : "Connect"}
    </button>
  );
}
