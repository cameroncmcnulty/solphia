/** Encode/decode tx bytes. Never use atob/Buffer base64 on the client — WebKit throws
 *  "The string did not match the expected pattern" for that. */

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToB64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    out += ABC[a >> 2];
    out += ABC[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? ABC[((b & 15) << 2) | (c >> 6)] : "=";
    out += i + 2 < bytes.length ? ABC[c & 63] : "=";
  }
  return out;
}

export function b64ToBytes(raw: unknown): Uint8Array {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Transaction missing from the server. Try again.");
  }
  const s = raw.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(s) || s.length < 8) {
    throw new Error("Launch transaction was corrupted. Try again.");
  }
  const clean = s.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let n = 0;
  for (let i = 0; i + 1 < clean.length; i += 4) {
    const a = ABC.indexOf(clean[i]!);
    const b = ABC.indexOf(clean[i + 1]!);
    const c = i + 2 < clean.length ? ABC.indexOf(clean[i + 2]!) : 0;
    const d = i + 3 < clean.length ? ABC.indexOf(clean[i + 3]!) : 0;
    if (a < 0 || b < 0 || (i + 2 < clean.length && c < 0) || (i + 3 < clean.length && d < 0)) {
      throw new Error("Launch transaction was corrupted. Try again.");
    }
    out[n++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length) out[n++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < clean.length) out[n++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, n);
}

export function asTxB64(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 32) return value.trim();
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.transaction === "string") return o.transaction.trim();
    if (typeof o.tx === "string") return o.tx.trim();
  }
  throw new Error("Server did not return a launch transaction. Try again.");
}
