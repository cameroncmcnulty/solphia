import nacl from "tweetnacl";
import { isSolanaAddress } from "./addr";
import { persistOwner } from "./owner";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SK = "solphia_ph_sk";
const PARAMS = ["phantom_encryption_public_key", "nonce", "data", "errorCode", "errorMessage"] as const;

function b58enc(bytes: Uint8Array): string {
  if (!bytes.length) return "";
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  let n = BigInt("0x" + hex);
  let out = "";
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out || "1";
}

function b58dec(s: string): Uint8Array {
  let n = 0n;
  for (const ch of s) {
    const v = B58.indexOf(ch);
    if (v < 0) throw new Error("bad b58");
    n = n * 58n + BigInt(v);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const body = hex === "00" || hex === "" ? new Uint8Array(0) : Uint8Array.from(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  let zeros = 0;
  while (zeros < s.length && s[zeros] === "1") zeros += 1;
  const out = new Uint8Array(zeros + body.length);
  out.set(body, zeros);
  return out;
}

function readParam(url: URL, key: string): string | null {
  const q = url.searchParams.get(key);
  if (q) return q;
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (!hash) return null;
  return new URLSearchParams(hash.startsWith("?") ? hash.slice(1) : hash).get(key);
}

function cleanUrl(url: URL): string {
  const next = new URL(url.toString());
  for (const k of PARAMS) next.searchParams.delete(k);
  if (next.hash) {
    const hp = new URLSearchParams(next.hash.replace(/^#/, "").replace(/^\?/, ""));
    let touched = false;
    for (const k of PARAMS) {
      if (hp.has(k)) {
        hp.delete(k);
        touched = true;
      }
    }
    next.hash = touched ? (hp.toString() ? "#" + hp.toString() : "") : next.hash;
  }
  return next.pathname + next.search + next.hash;
}

function storeSecret(raw: string) {
  try {
    localStorage.setItem(SK, raw);
  } catch {
    /* private mode */
  }
  try {
    sessionStorage.setItem(SK, raw);
  } catch {
    /* ITP */
  }
}

function loadSecret(): string | null {
  try {
    return sessionStorage.getItem(SK) || localStorage.getItem(SK);
  } catch {
    return null;
  }
}

function dropSecret() {
  try {
    sessionStorage.removeItem(SK);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(SK);
  } catch {
    /* ignore */
  }
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

/** Open this exact URL inside Phantom so signTransaction is available. Never reload if already in the app. */
export function openThisPageInPhantom() {
  if (hasPhantomSigner() || inPhantomWebView()) return;
  const href = window.location.href.split("#")[0];
  const target = encodeURIComponent(href);
  const ref = encodeURIComponent(`${window.location.origin}/`);
  window.location.assign(`https://phantom.app/ul/browse/${target}?ref=${ref}`);
}

export function signerPage(pathname?: string): boolean {
  const p = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  return p === "/launch" || p === "/swap" || p.startsWith("/launch/") || p.startsWith("/swap/");
}

export function beginPhantomConnect() {
  const kp = nacl.box.keyPair();
  storeSecret(b58enc(kp.secretKey));
  const here = new URL(window.location.href);
  for (const k of PARAMS) here.searchParams.delete(k);
  const redirect = encodeURIComponent(here.toString());
  const app = encodeURIComponent(`${window.location.origin}/`);
  const dapp = encodeURIComponent(b58enc(kp.publicKey));
  window.location.assign(
    `https://phantom.app/ul/v1/connect?app_url=${app}&dapp_encryption_public_key=${dapp}&redirect_link=${redirect}&cluster=mainnet-beta`,
  );
}

export function completePhantomConnect(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const err = readParam(url, "errorCode");
  const phantomPk = readParam(url, "phantom_encryption_public_key");
  const nonce = readParam(url, "nonce");
  const data = readParam(url, "data");
  if (err || !phantomPk || !nonce || !data) return null;
  const sk = loadSecret();
  if (!sk) return null;
  try {
    const shared = nacl.box.before(b58dec(phantomPk), b58dec(sk));
    const opened = nacl.box.open.after(b58dec(data), b58dec(nonce), shared);
    if (!opened) return null;
    const json = JSON.parse(new TextDecoder().decode(opened)) as { public_key?: string };
    const pubkey = json.public_key || "";
    if (!isSolanaAddress(pubkey)) return null;
    persistOwner(pubkey);
    dropSecret();
    window.history.replaceState({}, "", cleanUrl(url));
    return pubkey;
  } catch {
    return null;
  }
}
