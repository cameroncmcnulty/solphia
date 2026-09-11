"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useAdmin } from "../AdminProvider";

type Speed = { id: string; label: string; ms: number | null; ok: boolean; detail?: string };
type Sample = {
  t: number;
  tickAgeMs: number;
  storeBytes: number;
  rpcMs: number | null;
  jupMs: number | null;
  pinataMs?: number | null;
  storeMs?: number | null;
  pinataBytes: number | null;
  pinataFiles: number | null;
  source?: "tick" | "probe";
};
type Tier = { id: string; label: string; price: string; limits: Record<string, number>; notes: string };
type Svc = {
  id: string;
  name: string;
  why: string;
  tier: Tier;
  next: Tier | null;
  options: { id: string; label: string; price: string }[];
};

type Pack = {
  ok: boolean;
  at: number;
  speeds: Speed[];
  pinata: { ok: boolean; files: number; bytes: number; configured: boolean; error?: string };
  storeBytes: number;
  tickAgeMs: number;
  services: Svc[];
  log24h: Sample[];
  log7d: Sample[];
  cronTicks24h?: number;
  keys: { helius: boolean; xai: boolean; pinata: boolean; signer: boolean; smtp?: boolean };
};

function fmtBytes(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} GB`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
}

function mean(points: Sample[], pick: (s: Sample) => number | null): number | null {
  const xs = points.map(pick).filter((n): n is number => n != null && n >= 0);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function lastOf(points: Sample[], pick: (s: Sample) => number | null): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const n = pick(points[i]);
    if (n != null && n >= 0) return n;
  }
  return null;
}

function Gauge({
  label,
  used,
  max,
  unit,
  warn,
}: {
  label: string;
  used: number;
  max: number;
  unit: string;
  warn?: boolean;
}) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPct(max > 0 ? Math.min(1, used / max) : 0));
    return () => cancelAnimationFrame(id);
  }, [used, max]);
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const hot = pct >= 0.8 || warn;
  const tone = hot ? "#ff4d7a" : pct >= 0.55 ? "#ffb020" : "#14f195";
  return (
    <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
      <div className="font-mono text-[10px] tracking-[0.22em] text-mute">{label}</div>
      <div className="mt-3 flex items-center gap-4">
        <svg width="118" height="118" viewBox="0 0 118 118" aria-hidden>
          <circle cx="59" cy="59" r={r} fill="none" stroke="rgba(153,69,255,0.16)" strokeWidth="9" />
          <circle
            cx="59"
            cy="59"
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 59 59)"
            style={{
              transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease",
              filter: `drop-shadow(0 0 10px ${tone})`,
            }}
          />
          <text x="59" y="64" textAnchor="middle" fill="#f7f4ff" fontSize="18" fontFamily="IBM Plex Mono, monospace">
            {Math.round(pct * 100)}%
          </text>
        </svg>
        <div>
          <div className="font-display text-2xl text-ghost sm:text-3xl">
            {unit === "bytes" ? fmtBytes(used) : used.toLocaleString()}
          </div>
          <div className="mt-1 font-mono text-[11px] text-mute">
            of {unit === "bytes" ? fmtBytes(max) : max.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spark({
  points,
  pick,
  color,
  format = "ms",
}: {
  points: Sample[];
  pick: (s: Sample) => number | null;
  color: string;
  format?: "ms" | "bytes" | "count";
}) {
  const gid = useId().replace(/:/g, "");
  const xs = points.map(pick).filter((n): n is number => n != null && n >= 0);
  const w = 320;
  const h = 88;
  const show = (n: number) => {
    if (format === "bytes") return fmtBytes(n);
    if (format === "count") return n.toLocaleString();
    return `${Math.round(n)} ms`;
  };
  if (xs.length < 2) {
    return (
      <div className="relative h-[88px]">
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="h-[88px] w-full" aria-hidden>
          <path
            d={`M4 44 C 60 22, 110 66, 160 44 S 250 22, 316 44`}
            fill="none"
            stroke={color}
            strokeOpacity="0.22"
            strokeWidth="2"
            strokeDasharray="5 7"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-mute">
          Run probes — the line fills in
        </div>
      </div>
    );
  }
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = max - min || Math.abs(max) * 0.08 || 1;
  const d = xs
    .map((v, i) => {
      const x = 4 + (i / (xs.length - 1)) * (w - 8);
      const y = 10 + ((max - v) / span) * (h - 22);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const last = xs[xs.length - 1];
  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="h-[88px] w-full" aria-hidden>
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${w - 4} ${h} L4 ${h} Z`} fill={`url(#g-${gid})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-mute">
        <span>min {show(min)}</span>
        <span className="text-ghost">now {show(last)}</span>
        <span>max {show(max)}</span>
      </div>
    </div>
  );
}

function usageFor(id: string, pack: Pack | null): { used: number; max: number; unit: "bytes" | "count" } | null {
  if (!pack) return null;
  const svc = pack.services.find((s) => s.id === id);
  if (!svc) return null;
  if (id === "pinata") {
    return { used: pack.pinata.bytes || 0, max: (svc.tier.limits.storageGb || 1) * 1_000_000_000, unit: "bytes" };
  }
  if (id === "upstash") {
    return { used: pack.storeBytes || 0, max: (svc.tier.limits.storageMb || 256) * 1_000_000, unit: "bytes" };
  }
  if (id === "vercel") {
    return { used: pack.cronTicks24h || 0, max: Math.max(1, svc.tier.limits.cronPerDay || 1), unit: "count" };
  }
  return null;
}

export function HealthSection() {
  const { data } = useAdmin();
  const [pack, setPack] = useState<Pack | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState<"24h" | "7d">("24h");

  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/health", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "health failed");
      setPack(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "health failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setTier(id: string, tier: string) {
    await fetch("/api/admin/health", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tiers: { [id]: tier } }),
    });
    load();
  }

  const log = range === "24h" ? pack?.log24h || [] : pack?.log7d || [];
  const pinata = pack?.services.find((s) => s.id === "pinata");
  const upstash = pack?.services.find((s) => s.id === "upstash");
  const pinMax = (pinata?.tier.limits.storageGb || 1) * 1_000_000_000;
  const pinFilesMax = pinata?.tier.limits.files || 500;
  const redisMax = (upstash?.tier.limits.storageMb || 256) * 1_000_000;
  const pinBytes = pack?.pinata.bytes || 0;
  const pinFiles = pack?.pinata.files || 0;
  const storeBytes = pack?.storeBytes || 0;

  const vercel = pack?.services.find((s) => s.id === "vercel");
  const cronCap = vercel?.tier.limits.cronPerDay || 1;
  const cronTicks = pack?.cronTicks24h || 0;
  const maxAgeMs = cronCap <= 2 ? 26 * 3600_000 : 180_000;
  const tickFresh = Boolean(pack && pack.tickAgeMs >= 0 && pack.tickAgeMs < maxAgeMs);

  const avgRpc = useMemo(() => mean(log, (s) => s.rpcMs), [log]);
  const avgJup = useMemo(() => mean(log, (s) => s.jupMs), [log]);
  const peakStore = useMemo(() => {
    const xs = log.map((s) => s.storeBytes).filter((n) => n > 0);
    return xs.length ? Math.max(...xs) : storeBytes;
  }, [log, storeBytes]);
  const lastPin = useMemo(() => lastOf(log, (s) => s.pinataBytes), [log]);
  const slowest = Math.max(1, ...(pack?.speeds || []).map((s) => s.ms || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-mute">SITE HEALTH</div>
          <h2 className="mt-1 font-display text-3xl text-ghost">How close we are to the ceiling</h2>
          <p className="mt-1 max-w-xl text-sm text-mute">
            Storage, RPC, cron, and the APIs she depends on. Pick the plan you actually pay for so the gauges match
            reality.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-full border border-violet/25 p-0.5">
            {(["24h", "7d"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setRange(k)}
                className={`rounded-full px-3 py-1 font-mono text-[11px] ${range === k ? "bg-acid/20 text-acid" : "text-mute"}`}
              >
                {k === "24h" ? "24 HR" : "7 DAY"}
              </button>
            ))}
          </div>
          <button type="button" onClick={load} disabled={busy} className="btn-ghost rounded-full px-4 py-2 font-mono text-[11px] disabled:opacity-40">
            {busy ? "Probing…" : "Run probes"}
          </button>
        </div>
      </div>
      {err && <p className="font-mono text-sm text-blood">{err}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-violet/15 bg-void/30 px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.18em] text-mute">AVG RPC · {range.toUpperCase()}</div>
          <div className="mt-1 font-display text-2xl text-acid">{avgRpc == null ? "—" : `${Math.round(avgRpc)} ms`}</div>
        </div>
        <div className="rounded-2xl border border-violet/15 bg-void/30 px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.18em] text-mute">AVG JUPITER · {range.toUpperCase()}</div>
          <div className="mt-1 font-display text-2xl text-ghost">{avgJup == null ? "—" : `${Math.round(avgJup)} ms`}</div>
        </div>
        <div className="rounded-2xl border border-violet/15 bg-void/30 px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.18em] text-mute">PEAK STATE · {range.toUpperCase()}</div>
          <div className="mt-1 font-display text-2xl text-ghost">{fmtBytes(peakStore)}</div>
        </div>
        <div className="rounded-2xl border border-violet/15 bg-void/30 px-4 py-3">
          <div className="font-mono text-[10px] tracking-[0.18em] text-mute">PINATA NOW</div>
          <div className="mt-1 font-display text-2xl text-ghost">{fmtBytes(lastPin ?? pinBytes)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Gauge label="PINATA STORAGE" used={pinBytes} max={pinMax} unit="bytes" warn={!pack?.pinata.configured} />
        <Gauge label="PINATA FILES" used={pinFiles} max={pinFilesMax} unit="count" />
        <Gauge label="APP STATE" used={storeBytes} max={redisMax} unit="bytes" />
        <Gauge label="CRON TICKS / 24H" used={cronTicks} max={Math.max(1, cronCap)} unit="count" />
        <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">ENGINE</div>
          <div className={`mt-4 font-display text-3xl ${tickFresh ? "text-acid" : "text-blood"}`}>
            {pack ? (tickFresh ? "ON SCHEDULE" : "LATE") : "…"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-mute">
            {pack && pack.tickAgeMs >= 0
              ? cronCap <= 2
                ? `${Math.max(0, Math.round(pack.tickAgeMs / 3600_000))}h since last tick · Hobby is daily`
                : `${Math.round(pack.tickAgeMs / 1000)}s since tick · Pro should be minutes`
              : "no tick yet"}
            {data?.durableKind ? ` · store ${data.durableKind}` : ""}
          </div>
        </div>
        <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">KEYS ON THE SERVER</div>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <span className={pack?.keys.helius ? "text-acid" : "text-blood"}>Helius {pack?.keys.helius ? "on" : "off"}</span>
            <span className={pack?.keys.pinata ? "text-acid" : "text-mute"}>Pinata {pack?.keys.pinata ? "on" : "off"}</span>
            <span className={pack?.keys.signer ? "text-acid" : "text-mute"}>Signer {pack?.keys.signer ? "on" : "off"}</span>
            <span className={pack?.keys.xai ? "text-acid" : "text-mute"}>xAI {pack?.keys.xai ? "on" : "off"}</span>
            <span className={pack?.keys.smtp ? "text-acid" : "text-mute"}>SMTP {pack?.keys.smtp ? "on" : "off"}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] tracking-[0.22em] text-mute">USAGE TIMELINE · {range.toUpperCase()}</div>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-violet/20 bg-void/40 p-4">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">PINATA STORAGE</div>
            <Spark points={log} pick={(s) => s.pinataBytes} color="#ffb020" format="bytes" />
          </div>
          <div className="rounded-3xl border border-violet/20 bg-void/40 p-4">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">PINATA FILES</div>
            <Spark points={log} pick={(s) => s.pinataFiles} color="#c9a8ff" format="count" />
          </div>
          <div className="rounded-3xl border border-violet/20 bg-void/40 p-4">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">APP STATE</div>
            <Spark points={log} pick={(s) => s.storeBytes} color="#9945ff" format="bytes" />
          </div>
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] tracking-[0.22em] text-mute">SPEED · {range.toUpperCase()}</div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-violet/20 bg-void/40 p-4">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">RPC LATENCY</div>
            <Spark points={log} pick={(s) => s.rpcMs} color="#14f195" />
          </div>
          <div className="rounded-3xl border border-violet/20 bg-void/40 p-4">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">JUPITER</div>
            <Spark points={log} pick={(s) => s.jupMs} color="#80eaff" />
          </div>
          <div className="rounded-3xl border border-violet/20 bg-void/40 p-4">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">PINATA</div>
            <Spark points={log} pick={(s) => s.pinataMs ?? null} color="#ffb020" />
          </div>
          <div className="rounded-3xl border border-violet/20 bg-void/40 p-4">
            <div className="font-mono text-[10px] tracking-[0.2em] text-mute">DURABLE STORE</div>
            <Spark points={log} pick={(s) => s.storeMs ?? null} color="#9945ff" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
        <div className="font-mono text-[10px] tracking-[0.2em] text-mute">SPEED TEST</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(pack?.speeds || []).map((s) => (
            <div key={s.id} className="rounded-2xl border border-violet/15 px-3 py-3">
              <div className="font-mono text-[10px] text-mute">{s.label}</div>
              <div className={`font-display text-2xl ${s.ok ? "text-acid" : "text-blood"}`}>
                {s.ms == null ? "—" : s.ok ? `${s.ms} ms` : "fail"}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet/15">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: s.ms && s.ok ? `${Math.max(6, (s.ms / slowest) * 100)}%` : "0%",
                    background: s.ok ? "#14f195" : "#ff4d7a",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
              {s.detail && <div className="mt-1 truncate font-mono text-[10px] text-mute">{s.detail}</div>}
            </div>
          ))}
        </div>
        {pack?.pinata && !pack.pinata.configured && (
          <p className="mt-3 text-sm text-mute">
            Pinata is wired, but no JWT is on the server yet. In Vercel set <span className="font-mono text-ghost">PINATA_JWT</span>{" "}
            from pinata.cloud → API Keys (the long token, not just the 20-character id).
          </p>
        )}
        {pack?.pinata?.configured && pack.pinata.error && (
          <p className="mt-3 text-sm text-blood">Pinata auth failed: {pack.pinata.error}. Use the full JWT.</p>
        )}
      </div>

      <div>
        <div className="font-mono text-[10px] tracking-[0.22em] text-acid">GROWTH CHEAT SHEET</div>
        <p className="mt-1 max-w-2xl text-sm text-mute">
          What we run today, the ceiling, and the next paid step. Flip the tier when you actually upgrade so the gauges
          move with you.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(pack?.services || []).map((s) => {
            const u = usageFor(s.id, pack);
            const pct = u && u.max > 0 ? Math.min(1, u.used / u.max) : 0;
            return (
              <div key={s.id} className="rounded-3xl border border-acid/20 bg-acid/[0.04] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-2xl text-ghost">{s.name}</div>
                    <p className="mt-1 text-sm text-mute">{s.why}</p>
                  </div>
                  {s.next && (
                    <div className="shrink-0 rounded-full border border-acid/30 bg-acid/10 px-2 py-1 font-mono text-[10px] text-acid">
                      NEXT {s.next.label}
                    </div>
                  )}
                </div>
                <select
                  value={s.tier.id}
                  onChange={(e) => setTier(s.id, e.target.value)}
                  className="mt-4 w-full rounded-full border border-violet/30 bg-void px-3 py-2 font-mono text-[11px] text-ghost"
                >
                  {s.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label} · {o.price}
                    </option>
                  ))}
                </select>
                {u && (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-violet/15">
                      <div
                        className="h-full rounded-full bg-acid"
                        style={{ width: `${pct * 100}%`, transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)" }}
                      />
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-mute">
                      {u.unit === "bytes" ? `${fmtBytes(u.used)} / ${fmtBytes(u.max)}` : `${u.used} / ${u.max}`}
                    </div>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-1 font-mono text-[11px] text-mute">
                  {Object.entries(s.tier.limits)
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <div key={k}>
                        {k} {v.toLocaleString()}
                      </div>
                    ))}
                </div>
                <p className="mt-3 text-[13px] text-mute">{s.tier.notes}</p>
                <p className="mt-2 text-sm text-acid">{s.next ? `${s.next.label} · ${s.next.price}` : "top of the ladder"}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
