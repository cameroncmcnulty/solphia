/**
 * Durable JSON store for Vercel.
 * Filesystem `/tmp` dies on every cold start — that is why treasury/users/paper reset.
 * When Upstash/Vercel KV or Blob is configured, state survives deploys.
 */

const STATE_KEY = "solphia:state";
const BLOB_PATH = "solphia-state.json";

export type DurableKind = "fs" | "upstash" | "blob";

function kvCreds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function blobToken(): string {
  return process.env.BLOB_READ_WRITE_TOKEN || "";
}

export function durableKind(): DurableKind {
  if (kvCreds()) return "upstash";
  if (blobToken()) return "blob";
  return "fs";
}

export function durableConfigured(): boolean {
  return durableKind() !== "fs";
}

export async function pullRemoteState(): Promise<unknown | null> {
  const kv = kvCreds();
  if (kv) {
    const r = await fetch(`${kv.url}/get/${encodeURIComponent(STATE_KEY)}`, {
      headers: { authorization: `Bearer ${kv.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { result?: string | null };
    if (!j.result) return null;
    return typeof j.result === "string" ? JSON.parse(j.result) : j.result;
  }
  const blob = blobToken();
  if (blob) {
    const r = await fetch(`https://blob.vercel-storage.com/${BLOB_PATH}`, {
      headers: { authorization: `Bearer ${blob}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) return null;
    return r.json();
  }
  return null;
}

export async function pushRemoteState(state: unknown): Promise<boolean> {
  const body = JSON.stringify(state);
  const kv = kvCreds();
  if (kv) {
    const r = await fetch(`${kv.url}/set/${encodeURIComponent(STATE_KEY)}`, {
      method: "POST",
      headers: { authorization: `Bearer ${kv.token}`, "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return r.ok;
  }
  const blob = blobToken();
  if (blob) {
    const r = await fetch(`https://blob.vercel-storage.com/${BLOB_PATH}?pathname=${encodeURIComponent(BLOB_PATH)}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${blob}`,
        "x-api-version": "7",
        "x-content-type": "application/json",
        "x-add-random-suffix": "false",
        "x-allow-overwrite": "true",
      },
      body,
      signal: AbortSignal.timeout(12_000),
    });
    return r.ok;
  }
  return false;
}
