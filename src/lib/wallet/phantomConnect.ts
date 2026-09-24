import { isSolanaAddress } from "./addr";
import { persistOwner } from "./owner";
import { PHANTOM_PARAMS, decryptBox, isPhJob, isPhSession, type PhAfter, type PhJob, type PhSession } from "./phantomBox";

export type { PhAfter };

export const PHANTOM_REDIRECT = "PHANTOM_REDIRECT";
export const PHANTOM_EVENT = "solphia:phantom";

export function isPhantomRedirect(e: unknown): boolean {
  return e instanceof Error && e.message === PHANTOM_REDIRECT;
}

type Injected = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  signTransaction?: (tx: unknown) => Promise<unknown>;
  connect?: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
};

export function injectedProvider(): Injected | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { phantom?: { solana?: Injected }; solana?: Injected };
  const p = w.phantom?.solana || (w.solana?.isPhantom ? w.solana : null);
  if (!p) return null;
  if (p.isPhantom || typeof p.signTransaction === "function" || typeof p.connect === "function") return p;
  return null;
}

export function hasPhantomSigner(): boolean {
  return Boolean(injectedProvider());
}

export function inPhantomWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Phantom/i.test(ua)) return true;
  // New Phantom in-app browser often uses a stock WebKit UA but still injects.
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
  return mobile && Boolean((window as unknown as { phantom?: { solana?: unknown } }).phantom?.solana);
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

/** https://phantom.app/ul/v1/connect loads Phantom's download page in Chrome. phantom:// opens the app. */
export function phantomAppUrl(httpsUl: string): string {
  return httpsUl.replace(/^https:\/\/phantom\.app\/ul\//i, "phantom://");
}

export function openPhantomLink(httpsUl: string, appUl?: string) {
  const app = appUl || phantomAppUrl(httpsUl);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Android/i.test(ua)) {
    try {
      const u = new URL(httpsUl);
      const rest = u.pathname.replace(/^\/ul\//, "") + u.search;
      window.location.href = `intent://${rest}#Intent;scheme=phantom;package=app.phantom;S.browser_fallback_url=${encodeURIComponent(httpsUl)};end`;
      return;
    } catch {
      /* use custom scheme */
    }
  }
  window.location.href = app;
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

const SESS_KEY = "solphia_ph_session";
const JOB_KEY = "solphia_ph_job";

function saveLocalSession(s: PhSession) {
  const raw = JSON.stringify(s);
  try {
    localStorage.setItem(SESS_KEY, raw);
  } catch {
    /* quota */
  }
  try {
    sessionStorage.setItem(SESS_KEY, raw);
  } catch {
    /* ITP */
  }
}

function loadLocalSession(): PhSession | null {
  try {
    const raw = localStorage.getItem(SESS_KEY) || sessionStorage.getItem(SESS_KEY);
    const j = raw ? JSON.parse(raw) : null;
    return isPhSession(j) ? j : null;
  } catch {
    return null;
  }
}

function saveLocalJob(job: PhJob) {
  try {
    localStorage.setItem(JOB_KEY, JSON.stringify(job));
  } catch {
    /* quota — job without image still fits */
  }
}

function loadLocalJob(): PhJob | null {
  try {
    const raw = localStorage.getItem(JOB_KEY);
    const j = raw ? JSON.parse(raw) : null;
    return isPhJob(j) ? j : null;
  } catch {
    return null;
  }
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
      session: loadLocalSession(),
      redirectPath: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/launch",
    }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    url?: string;
    app?: string;
    error?: string;
    job?: PhJob;
    session?: PhSession;
  };
  if (j.job && isPhJob(j.job)) saveLocalJob(j.job);
  if (j.session && isPhSession(j.session)) saveLocalSession(j.session);
  if (!r.ok || !j.url) throw new Error(typeof j.error === "string" ? j.error : "Could not open Phantom.");
  openPhantomLink(j.url, j.app);
  throw new Error(PHANTOM_REDIRECT);
}

export function beginPhantomConnect() {
  void openPhantomUl().catch(() => undefined);
}

let completing: string | null = null;

export async function completePhantomUl(): Promise<{
  pubkey?: string;
  signature?: string;
  after?: PhAfter;
  url?: string;
  app?: string;
  error?: string;
} | null> {
  const got = readPhantomReturn();
  if (!got?.ph && !got?.nonce && !got?.errorCode) return null;
  const key = got.ph || got.nonce || "x";
  if (completing === key) return null;
  completing = key;
  const backup = loadLocalJob();
  try {
    const r = await fetch("/api/phantom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        id: got.ph,
        ...got,
        job: backup && backup.id === got.ph ? backup : undefined,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      pubkey?: string;
      signature?: string;
      after?: PhAfter;
      url?: string;
      app?: string;
      error?: string;
      session?: PhSession;
      job?: PhJob;
    };
    if (typeof j.pubkey === "string" && isSolanaAddress(j.pubkey)) persistOwner(j.pubkey);
    if (j.session && isPhSession(j.session)) saveLocalSession(j.session);
    if (j.job && isPhJob(j.job)) saveLocalJob(j.job);
    if (!r.ok) {
      completing = null;
      return { error: typeof j.error === "string" ? j.error : "Phantom came back empty." };
    }
    window.history.replaceState({}, "", cleanPhantomUrl());
    return j;
  } catch (e) {
    completing = null;
    throw e;
  }
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
