/** Encode/decode tx bytes without WebKit atob throwing "string did not match the expected pattern". */

export function bytesToB64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

export function b64ToBytes(raw: unknown): Uint8Array {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Transaction missing from the server. Try again.");
  }
  const s = raw.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const pad = s.length % 4 === 0 ? s : s + "=".repeat(4 - (s.length % 4));
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(pad) || pad.length < 8) {
    throw new Error("Launch transaction was corrupted. Try again.");
  }
  try {
    if (typeof Buffer !== "undefined") return Uint8Array.from(Buffer.from(pad, "base64"));
    const bin = atob(pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    throw new Error("Launch transaction was corrupted. Try again.");
  }
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
