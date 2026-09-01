async function getRaw(url: string, timeoutMs: number, accept: string) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        accept,
        "user-agent": "Solphia/0.2 (+https://solphia.io)",
      },
      cache: "no-store",
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      return { ok: false as const, ms, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true as const, ms, status: res.status, res };
  } catch (err) {
    return { ok: false as const, ms: Date.now() - t0, error: err instanceof Error ? err.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T>(url: string, timeoutMs = 8000): Promise<{ ok: boolean; ms: number; data?: T; error?: string; status?: number }> {
  const r = await getRaw(url, timeoutMs, "application/json");
  if (!r.ok) return r;
  try {
    const data = (await r.res.json()) as T;
    return { ok: true, ms: r.ms, status: r.status, data };
  } catch {
    return { ok: false, ms: r.ms, status: r.status, error: "invalid json" };
  }
}

export async function getText(url: string, timeoutMs = 8000): Promise<{ ok: boolean; ms: number; data?: string; error?: string; status?: number }> {
  const r = await getRaw(url, timeoutMs, "text/html,text/plain");
  if (!r.ok) return r;
  try {
    const data = await r.res.text();
    return { ok: true, ms: r.ms, status: r.status, data };
  } catch {
    return { ok: false, ms: r.ms, status: r.status, error: "invalid body" };
  }
}

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
