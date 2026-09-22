import nacl from "tweetnacl";
import { isSolanaAddress } from "./addr";
import { persistOwner } from "./owner";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function b58enc(bytes: Uint8Array): string {
  if (!bytes.length) return "";
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  return "1".repeat(zeros) + digits.reverse().map((d) => B58[d]).join("");
}

function b58dec(s: string): Uint8Array {
  const bytes = [0];
  for (const ch of s) {
    const val = B58.indexOf(ch);
    if (val < 0) throw new Error("bad b58");
    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 255;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  let zeros = 0;
  while (zeros < s.length && s[zeros] === "1") zeros += 1;
  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[out.length - 1 - i] = bytes[i];
  return out;
}

const SK = "solphia_ph_sk";
const PARAMS = ["phantom_encryption_public_key", "nonce", "data", "errorCode", "errorMessage"] as const;

function phantomInjected(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.phantom?.solana;
  return Boolean(p?.isPhantom || window.solana?.isPhantom);
}

function cleanUrl(): URL {
  const url = new URL(window.location.href);
  for (const k of PARAMS) url.searchParams.delete(k);
  return url;
}

/** Phantom Connect UL: approve in the app, then HTTPS redirect back to this browser. Never browse-in-Phantom. */
export function beginPhantomConnect() {
  const kp = nacl.box.keyPair();
  sessionStorage.setItem(SK, b58enc(kp.secretKey));
  const redirect = encodeURIComponent(cleanUrl().toString());
  const app = encodeURIComponent(`${window.location.origin}/`);
  const dapp = encodeURIComponent(b58enc(kp.publicKey));
  window.location.assign(
    `https://phantom.app/ul/v1/connect?app_url=${app}&dapp_encryption_public_key=${dapp}&redirect_link=${redirect}&cluster=mainnet-beta`,
  );
}

export function completePhantomConnect(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const err = url.searchParams.get("errorCode");
  const phantomPk = url.searchParams.get("phantom_encryption_public_key");
  const nonce = url.searchParams.get("nonce");
  const data = url.searchParams.get("data");
  const touched = err || phantomPk || nonce || data;
  if (touched) {
    window.history.replaceState({}, "", cleanUrl().toString());
  }
  if (err || !phantomPk || !nonce || !data) return null;
  const sk = sessionStorage.getItem(SK);
  if (!sk) return null;
  try {
    const shared = nacl.box.before(b58dec(phantomPk), b58dec(sk));
    const opened = nacl.box.open.after(b58dec(data), b58dec(nonce), shared);
    if (!opened) return null;
    const json = JSON.parse(new TextDecoder().decode(opened)) as { public_key?: string };
    const pubkey = json.public_key || "";
    if (!isSolanaAddress(pubkey)) return null;
    persistOwner(pubkey);
    sessionStorage.removeItem(SK);
    return pubkey;
  } catch {
    return null;
  }
}

export function connectOrDeepLink(injectedConnect: () => Promise<void>) {
  if (phantomInjected()) return injectedConnect();
  beginPhantomConnect();
  return Promise.resolve();
}
