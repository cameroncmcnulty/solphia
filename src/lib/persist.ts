/**
 * Durable store. Vercel /tmp dies; Upstash/Blob keeps data.
 * Keys are sharded so one user's book save cannot overwrite another.
 */

export const KEYS = {
  state: "solphia:state",
  ops: "solphia:ops",
  traders: "solphia:traders",
  trader: (owner: string) => `solphia:trader:${owner}`,
  backtest: (lev: 1 | 2 | 3) => `solphia:backtest:${lev}`,
  backtestPublic: "solphia:backtest:public",
  launch: "solphia:launch",
  /** Rank, usernames, referrals. Dual-written so a fat tape save cannot be the only copy. */
  launchAccounts: "solphia:launch-accounts",
  /** Google/email login rows. Dual-written so a warm instance cannot drop a session. */
  loginAccounts: "solphia:login-accounts",
  account: (owner: string) => `solphia:account:${owner}`,
  /** JPEG data URL for one wallet. Lives off the fat launch-accounts blob. */
  pfp: (pk: string) => `solphia:pfp:${pk}`,
  /** $SPHA social links. Dual-written so a stale ops save cannot wipe them. */
  sphaSocials: "solphia:spha-socials",
  /** Official $SPHA countdown. Dual-written so a stale ops save cannot wipe the clock. */
  sphaCountdown: "solphia:spha-countdown",
  /** NX lock while the T-30 official mint is in flight. */
  sphaMintLock: "solphia:spha-mint-lock",
  /** Reserved mint keypair so a crashed T-30 send cannot mint a second 200M CA. */
  sphaMintInflight: "solphia:spha-mint-inflight",
  circle: "solphia:circle",
  shill: "solphia:shill",
  mail: "solphia:mail",
  adminOtp: "solphia:admin-otp",
  adminTotp: "solphia:admin-totp",
  signupOtp: "solphia:signup-otp",
  signer: (owner: string) => `solphia:signer:${owner}`,
  projectKeys: "solphia:project-keys",
  phjob: (id: string) => `solphia:ph:${id}`,
  /** Last admin snapshot of SOL in known user + protocol wallets. */
  platformOnchain: "solphia:platform-onchain",
  /** Admin Tools data-driven pad campaign (no secrets). */
  batchLaunch: "solphia:batch-launch",
  /** Launch-wallet secrets for the active Tools campaign. Admin-only. Never log. */
  batchLaunchKeys: "solphia:batch-launch-keys",
  /** NX lock while one campaign launch is in flight. */
  batchLaunchLock: "solphia:batch-launch-lock",
  /** Tickers already used by Tools launches so the next batch does not repeat them. */
  batchLaunchTickers: "solphia:batch-launch-tickers",
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

export async function kvGetJsonOk(
  key: string,
  timeoutMs = 8_000,
): Promise<{ ok: boolean; value: unknown | null }> {
  const kv = kvCreds();
  if (!kv) return { ok: false, value: null };
  try {
    const r = await fetch(`${kv.url}/get/${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${kv.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(Math.max(3_000, timeoutMs)),
    });
    if (!r.ok) return { ok: false, value: null };
    const j = (await r.json()) as { result?: unknown };
    return { ok: true, value: parseJson(j.result) };
  } catch {
    return { ok: false, value: null };
  }
}

export async function kvGetJson(key: string, timeoutMs = 8_000): Promise<unknown | null> {
  const got = await kvGetJsonOk(key, timeoutMs);
  return got.ok ? got.value : null;
}

export async function kvGetJsonRetry(key: string, timeoutMs = 8_000, tries = 3): Promise<unknown | null> {
  let last: unknown | null = null;
  for (let i = 0; i < Math.max(1, tries); i++) {
    const got = await kvGetJsonOk(key, timeoutMs);
    if (got.ok) return got.value;
    last = got.value;
  }
  return last;
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

export async function kvSetEx(key: string, value: unknown, seconds: number): Promise<boolean> {
  const r = await kvCommand(["SET", key, JSON.stringify(value), "EX", Math.max(30, Math.floor(seconds))]);
  return r.ok;
}

export async function kvSetNxEx(key: string, value: unknown, seconds: number): Promise<boolean> {
  const r = await kvCommand(["SET", key, JSON.stringify(value), "NX", "EX", Math.max(30, Math.floor(seconds))]);
  return r.ok && (r.result === "OK" || r.result === true);
}

export async function kvMGetJson(keys: string[]): Promise<(unknown | null)[]> {
  if (!keys.length) return [];
  const kv = kvCreds();
  if (!kv) return keys.map(() => null);
  const cmd = await kvCommand(["MGET", ...keys]);
  const rows = Array.isArray(cmd.result) ? cmd.result : [];
  return keys.map((_, i) => parseJson(rows[i]));
}

/** SCAN MATCH. Empty if the command is unavailable. */
export async function kvScanKeys(match: string, count = 200): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  const seen = new Set<string>();
  for (let n = 0; n < 80; n++) {
    const r = await kvCommand(["SCAN", cursor, "MATCH", match, "COUNT", Math.max(20, count)]);
    if (!r.ok || !Array.isArray(r.result) || r.result.length < 2) break;
    cursor = String(r.result[0] ?? "0");
    const batch = Array.isArray(r.result[1]) ? r.result[1] : [];
    for (const k of batch) {
      const key = String(k);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
    if (cursor === "0") break;
  }
  return keys;
}

export async function kvDel(key: string): Promise<boolean> {
  const r = await kvCommand(["DEL", key]);
  return r.ok;
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

/** Sum Redis MEMORY USAGE for the given keys. 0 if the command is unavailable. */
export async function kvMemoryBytes(keys: string[]): Promise<number> {
  const parts = await Promise.all(
    keys.map(async (k) => {
      const r = await kvCommand(["MEMORY", "USAGE", k]);
      const n = Number(r.result);
      return Number.isFinite(n) && n > 0 ? n : 0;
    }),
  );
  return parts.reduce((a, b) => a + b, 0);
}
