import { bytesToB64, b64ToBytes } from "../solana/wire";

const MAGIC = "solphia-vault-v1";
const ITER = 210_000;

export type Cipher = {
  v: 1;
  iter: number;
  salt: string;
  iv: string;
  ct: string;
};

function cryptoOk(): Crypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("This browser cannot encrypt a wallet locally.");
  return c;
}

function rand(n: number): Uint8Array {
  const out = new Uint8Array(n);
  cryptoOk().getRandomValues(out);
  return out;
}

function src(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function derivePinKey(pin: string, salt: Uint8Array, iter = ITER): Promise<CryptoKey> {
  const c = cryptoOk();
  const base = await c.subtle.importKey("raw", src(new TextEncoder().encode(pin)), "PBKDF2", false, ["deriveKey"]);
  return c.subtle.deriveKey(
    { name: "PBKDF2", salt: src(salt), iterations: iter, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function wrapWithPin(pin: string, plain: Uint8Array): Promise<Cipher> {
  const c = cryptoOk();
  const salt = rand(16);
  const iv = rand(12);
  const key = await derivePinKey(pin, salt);
  const ct = new Uint8Array(await c.subtle.encrypt({ name: "AES-GCM", iv: src(iv) }, key, src(plain)));
  return { v: 1, iter: ITER, salt: bytesToB64(salt), iv: bytesToB64(iv), ct: bytesToB64(ct) };
}

export async function unwrapWithPin(pin: string, cipher: Cipher): Promise<Uint8Array> {
  if (!cipher || cipher.v !== 1 || !cipher.ct) throw new Error("Wallet backup on this device is unreadable.");
  const c = cryptoOk();
  const key = await derivePinKey(pin, b64ToBytes(cipher.salt), cipher.iter || ITER);
  try {
    const pt = await c.subtle.decrypt(
      { name: "AES-GCM", iv: src(b64ToBytes(cipher.iv)) },
      key,
      src(b64ToBytes(cipher.ct)),
    );
    return new Uint8Array(pt);
  } catch {
    throw new Error("Wrong PIN.");
  }
}

export async function pinVerifier(pin: string): Promise<Cipher> {
  return wrapWithPin(pin, new TextEncoder().encode(MAGIC));
}

export async function pinMatches(pin: string, verifier: Cipher): Promise<boolean> {
  try {
    const pt = await unwrapWithPin(pin, verifier);
    return new TextDecoder().decode(pt) === MAGIC;
  } catch {
    return false;
  }
}

export function pinOk(pin: string): boolean {
  return /^[0-9]{4,8}$/.test(pin.trim());
}

export function encodeSecretPayload(opts: { secret: Uint8Array; mnemonic?: string; pubkey: string }): Uint8Array {
  const body = JSON.stringify({
    pubkey: opts.pubkey,
    secret: bytesToB64(opts.secret),
    mnemonic: opts.mnemonic || undefined,
  });
  return new TextEncoder().encode(body);
}

export function decodeSecretPayload(bytes: Uint8Array): { secret: Uint8Array; mnemonic?: string; pubkey: string } {
  const j = JSON.parse(new TextDecoder().decode(bytes)) as { secret?: string; mnemonic?: string; pubkey?: string };
  if (typeof j.secret !== "string" || typeof j.pubkey !== "string") throw new Error("Wallet backup on this device is unreadable.");
  return {
    pubkey: j.pubkey,
    secret: b64ToBytes(j.secret),
    mnemonic: typeof j.mnemonic === "string" ? j.mnemonic : undefined,
  };
}
