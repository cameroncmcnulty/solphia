"use client";

import { useEffect, useRef, useState } from "react";
import { SphaMark } from "./SphaMark";
import { AUTH_EVENT, peekAccount, refreshAccount } from "@/lib/auth/client";
import { forgetOwner, loadOwner, persistOwner } from "@/lib/wallet/owner";
import { beginPhantomConnect, completePhantomConnect, completePhantomUl, injectedProvider, openPhantomLink, PHANTOM_EVENT, readPhantomReturn } from "@/lib/wallet/phantomConnect";
import { dropPhantomWallets, ensurePhantomStub, phantomIsOwner } from "@/lib/wallet/vault";
import { ownerIsEmbedded, syncOwnerToSignedInAccount } from "@/lib/wallet/identity";
import { openAccountGate, openConnect } from "./wallet/WalletHost";

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
  return (injectedProvider() as Provider | null) || null;
}

function blockedPhantomOwner(pubkey: string | null | undefined): boolean {
  return Boolean(pubkey && kickedPhantomPubkeys().includes(pubkey));
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
  beginPhantomConnect();
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
    ensurePhantomStub(pubkey);
    return pubkey;
  } catch {
    const cur = found.publicKey?.toString() || previous;
    if (cur) persistOwner(cur);
    return cur;
  } finally {
    switching = false;
  }
}

const PHANTOM_KICK = "solphia_kick_phantom";

function kickedPhantomPubkeys(): string[] {
  try {
    const raw = window.localStorage.getItem(PHANTOM_KICK);
    const j = JSON.parse(raw || "[]") as unknown;
    return Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function rememberKickedPhantom(pubkeys: string[]) {
  try {
    window.localStorage.setItem(PHANTOM_KICK, JSON.stringify([...new Set([...kickedPhantomPubkeys(), ...pubkeys])]));
  } catch {
    /* private mode */
  }
}

/** Phantom is a send rail. Drop it as identity without wiping the account session. */
function kickPhantomIdentity(injectedPk: string | null, opts?: { prompt?: boolean }) {
  const owner = loadOwner();
  const wasPhantom = phantomIsOwner(injectedPk);
  const dropped = dropPhantomWallets();
  const ownerWasPhantom =
    wasPhantom || Boolean(owner && dropped.includes(owner)) || Boolean(owner && kickedPhantomPubkeys().includes(owner));
  if (!ownerWasPhantom && !dropped.length) return false;
  const pubkeys = [...new Set([...dropped, ownerWasPhantom ? owner : null].filter(Boolean))] as string[];
  rememberKickedPhantom(pubkeys);
  for (const pubkey of pubkeys) {
    void fetch("/api/auth/wallets", {
      method: "DELETE",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pubkey }),
    }).catch(() => undefined);
  }
  if (ownerWasPhantom && !ownerIsEmbedded(owner)) {
    forgetOwner();
    void fetch("/api/wallet/remember", { method: "DELETE", credentials: "include" }).catch(() => undefined);
  }
  if (opts?.prompt && ownerWasPhantom && !peekAccount()?.id) {
    window.setTimeout(() => openAccountGate(), 0);
  } else {
    syncOwnerToSignedInAccount();
  }
  return ownerWasPhantom;
}

/** Keep the account session alive. Wallet follows that account; Phantom is not identity. */
export function WalletKeepalive() {
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null;
    kickPhantomIdentity(phantom()?.publicKey?.toString() || null, { prompt: true });

    const align = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      kickPhantomIdentity(phantom()?.publicKey?.toString() || null);
      const acct = await refreshAccount();
      if (!acct?.id) {
        if (loadOwner()) forgetOwner();
        return;
      }
      const saved = syncOwnerToSignedInAccount();
      if (saved && blockedPhantomOwner(saved)) forgetOwner();
    };

    const ingestReturn = () => {
      if (!readPhantomReturn()) return;
      void completePhantomUl()
        .then((j) => {
          if (!j) return;
          if (j.url) {
            openPhantomLink(j.url, j.app);
            return;
          }
          window.dispatchEvent(new CustomEvent(PHANTOM_EVENT, { detail: j }));
        })
        .catch(() => undefined);
    };
    completePhantomConnect();
    ingestReturn();
    void align();

    poll = setInterval(() => void align(), 8000);

    const onShow = () => {
      void align();
      ingestReturn();
    };
    const onAuth = () => {
      if (!peekAccount()?.id) {
        if (loadOwner()) forgetOwner();
        return;
      }
      syncOwnerToSignedInAccount();
    };
    window.addEventListener(AUTH_EVENT, onAuth);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("online", onShow);
    return () => {
      if (poll) clearInterval(poll);
      window.removeEventListener(AUTH_EVENT, onAuth);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("online", onShow);
    };
  }, []);
  return null;
}

export function WalletConnect({ compact: _compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        openConnect();
        window.setTimeout(() => {
          if (mounted.current) setBusy(false);
        }, 400);
      }}
      title="Sign in"
      className="relative z-[70] btn-ghost inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 font-mono text-[10px] tracking-widest sm:h-11 sm:gap-2 sm:px-4 sm:text-[11px]"
    >
      <SphaMark className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
      <span className="whitespace-nowrap">{busy ? "…" : "CONNECT"}</span>
    </button>
  );
}
