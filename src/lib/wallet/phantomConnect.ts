import { isSolanaAddress } from "./addr";
import { persistOwner } from "./owner";
import { PHANTOM_PARAMS, decryptBox, type PhAfter } from "./phantomBox";

export type { PhAfter };

export const PHANTOM_REDIRECT = "PHANTOM_REDIRECT";
export const PHANTOM_EVENT = "solphia:phantom";

export function isPhantomRedirect(e: unknown): boolean {
  return e instanceof Error && e.message === PHANTOM_REDIRECT;
}

export function hasPhantomSigner(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { phantom?: { solana?: { isPhantom?: boolean } }; solana?: { isPhantom?: boolean } };
  return Boolean(w.phantom?.solana?.isPhantom || w.solana?.isPhantom);
}

export function inPhantomWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Phantom/i.test(navigator.userAgent || "");
}

export function waitForInjected(ms = 2500): Promise<boolean> {
  if (hasPhantomSigner()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (hasPhantomSigner()) {
        resolve(true);
        return;
      }
      if (Date.now() - start >= ms) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 80);
    };
    window.addEventListener("phantom#initialized", () => resolve(true), { once: true });
    tick();
  });
}

export function signerPage(pathname?: string): boolean {
  const p = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  return p === "/launch" || p === "/swap" || p.startsWith("/launch/") || p.startsWith("/swap/");
}

function readParam(url: URL, key: string): string | null {
  const q = url.searchParams.get(key);
  if (q) return q;
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (!hash) return null;
  return new URLSearchParams(hash.startsWith("?") ? hash.slice(1) : hash).get(key);
}

export function cleanPhantomUrl(url = typeof window !== "undefined" ? new URL(window.location.href) : null): string {
  if (!url) return "/";
  const next = new URL(url.toString());
  for (const k of PHANTOM_PARAMS) next.searchParams.delete(k);
  if (next.hash) {
    const hp = new URLSearchParams(next.hash.replace(/^#/, "").replace(/^\?/, ""));
    let touched = false;
    for (const k of PHANTOM_PARAMS) {
      if (hp.has(k)) {
        hp.delete(k);
        touched = true;
      }
    }
    next.hash = touched ? (hp.toString() ? "#" + hp.toString() : "") : next.hash;
  }
  return next.pathname + next.search + next.hash;
}

export function readPhantomReturn(): {
  ph: string;
  phantom_encryption_public_key: string;
  nonce: string;
  data: string;
  errorCode: string;
  errorMessage: string;
} | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const ph = readParam(url, "ph") || "";
  const nonce = readParam(url, "nonce") || "";
  const data = readParam(url, "data") || "";
  const errorCode = readParam(url, "errorCode") || "";
  const errorMessage = readParam(url, "errorMessage") || "";
  const phantomPk = readParam(url, "phantom_encryption_public_key") || "";
  if (!ph && !nonce && !data && !errorCode) return null;
  return {
    ph,
    phantom_encryption_public_key: phantomPk,
    nonce,
    data,
    errorCode,
    errorMessage,
  };
}

/** Chrome/Safari: open Phantom to connect or sign, then come back to this same page. */
export async function openPhantomUl(opts?: {
  packed?: string;
  extraSecrets?: string[];
  after?: PhAfter;
  pubkey?: string | null;
}): Promise<never> {
  const r = await fetch("/api/phantom", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "open",
      packed: opts?.packed,
      extraSecrets: opts?.extraSecrets,
      after: opts?.after,
      pubkey: opts?.pubkey || undefined,
      redirectPath: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/launch",
    }),
  });
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!r.ok || !j.url) throw new Error(typeof j.error === "string" ? j.error : "Could not open Phantom.");
  window.location.assign(j.url);
  throw new Error(PHANTOM_REDIRECT);
}

export function beginPhantomConnect() {
  void openPhantomUl().catch(() => undefined);
}

export async function completePhantomUl(): Promise<{
  pubkey?: string;
  signature?: string;
  after?: PhAfter;
  url?: string;
  error?: string;
} | null> {
  const got = readPhantomReturn();
  if (!got?.ph && !got?.nonce && !got?.errorCode) return null;
  const lock = "solphia_ph_lock_" + (got.ph || got.nonce || "x");
  try {
    if (sessionStorage.getItem(lock)) return null;
    sessionStorage.setItem(lock, "1");
  } catch {
    /* private mode — still complete once */
  }
  window.history.replaceState({}, "", cleanPhantomUrl());
  const r = await fetch("/api/phantom", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "complete", id: got.ph, ...got }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    pubkey?: string;
    signature?: string;
    after?: PhAfter;
    url?: string;
    error?: string;
  };
  if (typeof j.pubkey === "string" && isSolanaAddress(j.pubkey)) persistOwner(j.pubkey);
  if (!r.ok) return { error: typeof j.error === "string" ? j.error : "Phantom came back empty." };
  return j;
}

/** Legacy client-side connect decrypt. Ignored when the server job (`ph=`) is present. */
export function completePhantomConnect(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    if (readParam(url, "ph")) return null;
    const nonce = readParam(url, "nonce");
    const data = readParam(url, "data");
    const phantomPk = readParam(url, "phantom_encryption_public_key");
    if (!nonce || !data || !phantomPk) return null;
    const sk = sessionStorage.getItem("solphia_ph_sk") || localStorage.getItem("solphia_ph_sk");
    if (!sk) return null;
    const json = decryptBox(sk, phantomPk, nonce, data);
    window.history.replaceState({}, "", cleanPhantomUrl(url));
    const pubkey = json?.public_key || "";
    if (!isSolanaAddress(pubkey)) return null;
    persistOwner(pubkey);
    return pubkey;
  } catch {
    return null;
  }
}
