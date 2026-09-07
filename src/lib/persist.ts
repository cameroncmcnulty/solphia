/**
 * Durable store. Vercel /tmp dies; Upstash/Blob keeps data.
 * Keys are sharded so one user's book save cannot overwrite another.
 */

export const KEYS = {
  state: "solphia:state",
  ops: "solphia:ops",
  traders: "solphia:traders",
  trader: (owner: string) => `solphia:trader:${owner}`,
};

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

async function kvCommand(args: (string | number)[]): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const kv = kvCreds();
  if (!kv) return { ok: false, error: "no_kv" };
  const r = await fetch(kv.url, {
    method: "POST",
    headers: { authorization: `Bearer ${kv.token}`, "content-type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const j = (await r.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!r.ok) return { ok: false, error: j.error || `http_${r.status}` };
  return { ok: true, result: j.result };
}

function parseJson(raw: unknown): unknown | null {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export async function kvGetJson(key: string): Promise<unknown | null> {
  const kv = kvCreds();
  if (!kv) return null;
  const r = await fetch(`${kv.url}/get/${encodeURIComponent(key)}`, {
    headers: { authorization: `Bearer ${kv.token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { result?: unknown };
  return parseJson(j.result);
}

export async function kvSetJson(key: string, value: unknown): Promise<boolean> {
  const kv = kvCreds();
  if (!kv) return false;
  const r = await fetch(`${kv.url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${kv.token}` },
    body: JSON.stringify(value),
    signal: AbortSignal.timeout(12_000),
  });
  return r.ok;
}

export async function kvMGetJson(keys: string[]): Promise<(unknown | null)[]> {
  if (!keys.length) return [];
  const kv = kvCreds();
  if (!kv) return keys.map(() => null);
  const cmd = await kvCommand(["MGET", ...keys]);
  const rows = Array.isArray(cmd.result) ? cmd.result : [];
  return keys.map((_, i) => parseJson(rows[i]));
}

export async function kvSadd(key: string, member: string): Promise<void> {
  await kvCommand(["SADD", key, member]);
}

export async function kvSmembers(key: string): Promise<string[]> {
  const cmd = await kvCommand(["SMEMBERS", key]);
  return Array.isArray(cmd.result) ? cmd.result.map(String) : [];
}

/** Legacy monolith blob (migration source). */
export async function pullRemoteState(): Promise<unknown | null> {
  const sharded = await kvGetJson(KEYS.ops);
  if (sharded) return sharded;
  const kv = kvCreds();
  if (kv) return kvGetJson(KEYS.state);
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
  if (kvCreds()) return kvSetJson(KEYS.ops, state);
  const blob = blobToken();
  if (!blob) return false;
  const r = await fetch(`https://blob.vercel-storage.com/${BLOB_PATH}?pathname=${encodeURIComponent(BLOB_PATH)}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${blob}`,
      "x-api-version": "7",
      "x-content-type": "application/json",
      "x-add-random-suffix": "false",
      "x-allow-overwrite": "true",
    },
    body: JSON.stringify(state),
    signal: AbortSignal.timeout(12_000),
  });
  return r.ok;
}
