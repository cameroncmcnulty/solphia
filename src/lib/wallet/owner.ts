import { isSolanaAddress } from "./addr";

export const OWNER_KEY = "solphia_owner";
export const OWNER_EVENT = "solphia-owner";
/** Safari first-party cap is ~400 days. Sliding refresh on every wake. */
export const OWNER_MAX_AGE = 60 * 60 * 24 * 400;

export function parseOwnerCookie(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const cut = part.trim();
    const eq = cut.indexOf("=");
    if (eq < 0) continue;
    if (cut.slice(0, eq) !== OWNER_KEY) continue;
    let raw = cut.slice(eq + 1).trim();
    try {
      raw = decodeURIComponent(raw);
    } catch {
      /* keep raw */
    }
    return isSolanaAddress(raw) ? raw : null;
  }
  return null;
}

export function ownerSetCookie(pubkey: string, secure: boolean): string {
  const parts = [
    `${OWNER_KEY}=${encodeURIComponent(pubkey)}`,
    "Path=/",
    `Max-Age=${OWNER_MAX_AGE}`,
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function ownerClearCookie(secure: boolean): string {
  const parts = [`${OWNER_KEY}=`, "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function readStore(store: Storage | undefined): string | null {
  if (!store) return null;
  try {
    const v = store.getItem(OWNER_KEY);
    return v && isSolanaAddress(v) ? v : null;
  } catch {
    return null;
  }
}

function writeStore(store: Storage | undefined, pubkey: string | null) {
  if (!store) return;
  try {
    if (pubkey) store.setItem(OWNER_KEY, pubkey);
    else store.removeItem(OWNER_KEY);
  } catch {
    /* private mode / ITP */
  }
}

/** Read pubkey from session → local → cookie → boot script. Never throws. */
export function loadOwner(): string | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { __SOLPHIA_OWNER?: string | null };
  const fromSession = readStore(window.sessionStorage);
  if (fromSession) return fromSession;
  const fromLocal = readStore(window.localStorage);
  if (fromLocal) return fromLocal;
  try {
    const fromCookie = parseOwnerCookie(document.cookie);
    if (fromCookie) return fromCookie;
  } catch {
    /* ignore */
  }
  const boot = w.__SOLPHIA_OWNER;
  return boot && isSolanaAddress(boot) ? boot : null;
}

let rememberTimer: ReturnType<typeof setTimeout> | null = null;

function rememberOnServer(pubkey: string) {
  if (typeof fetch === "undefined") return;
  if (rememberTimer) clearTimeout(rememberTimer);
  rememberTimer = setTimeout(() => {
    fetch("/api/wallet/remember", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pubkey }),
      keepalive: true,
    }).catch(() => undefined);
  }, 40);
}

export function persistOwner(
  pubkey: string,
  opts?: { announce?: boolean; server?: boolean },
): void {
  if (!isSolanaAddress(pubkey) || typeof window === "undefined") return;
  const w = window as Window & { __SOLPHIA_OWNER?: string | null };
  w.__SOLPHIA_OWNER = pubkey;
  writeStore(window.localStorage, pubkey);
  writeStore(window.sessionStorage, pubkey);
  try {
    document.cookie = ownerSetCookie(pubkey, location.protocol === "https:");
  } catch {
    /* ignore */
  }
  if (opts?.announce !== false) {
    window.dispatchEvent(new CustomEvent(OWNER_EVENT, { detail: pubkey }));
  }
  if (opts?.server !== false) rememberOnServer(pubkey);
}

/** Only for an explicit user switch that has already written the next key — not for backgrounding. */
export function forgetOwner(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __SOLPHIA_OWNER?: string | null };
  w.__SOLPHIA_OWNER = null;
  writeStore(window.localStorage, null);
  writeStore(window.sessionStorage, null);
  try {
    document.cookie = ownerClearCookie(location.protocol === "https:");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(OWNER_EVENT, { detail: null }));
}

export const OWNER_HYDRATE_SCRIPT = `(function(){try{var k=${JSON.stringify(OWNER_KEY)};var pk=null;var m=document.cookie.match(new RegExp("(?:^|; )"+k+"=([^;]*)"));if(m){try{pk=decodeURIComponent(m[1])}catch(e){pk=m[1]}}if(!pk){try{pk=sessionStorage.getItem(k)||localStorage.getItem(k)}catch(e){}}if(!pk)return;window.__SOLPHIA_OWNER=pk;try{localStorage.setItem(k,pk);sessionStorage.setItem(k,pk)}catch(e){}}catch(e){}})();`;
