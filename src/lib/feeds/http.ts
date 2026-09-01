export async function getJson<T>(url: string, timeoutMs = 8000): Promise<{ ok: boolean; ms: number; data?: T; error?: string; status?: number }> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        accept: "application/json",
        "user-agent": "Solphia/0.1 (+https://solphia.io)",
      },
      cache: "no-store",
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      return { ok: false, ms, status: res.status, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, ms, status: res.status, data };
  } catch (err) {
    return { ok: false, ms: Date.now() - t0, error: err instanceof Error ? err.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
