"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../AdminProvider";

type Speed = { id: string; label: string; ms: number | null; ok: boolean; detail?: string };
type Sample = {
  t: number;
  tickAgeMs: number;
  storeBytes: number;
  rpcMs: number | null;
  jupMs: number | null;
  pinataBytes: number | null;
  pinataFiles: number | null;
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
  keys: { helius: boolean; xai: boolean; pinata: boolean; signer: boolean };
};

function fmtBytes(n: number) {
  if (!(n > 0)) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} GB`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
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
  const pct = max > 0 ? Math.min(1, used / max) : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const hot = pct >= 0.8 || warn;
  const tone = hot ? "#ff4d7a" : pct >= 0.55 ? "#ffb020" : "#14f195";
  return (
    <div className="rounded-2xl border border-violet/20 bg-void/40 p-4">
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{label}</div>
      <div className="mt-3 flex items-center gap-4">
        <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden>
          <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(153,69,255,0.18)" strokeWidth="8" />
          <circle
            cx="54"
            cy="54"
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 54 54)"
          />
          <text x="54" y="58" textAnchor="middle" fill="#f7f4ff" fontSize="16" fontFamily="IBM Plex Mono, monospace">
            {Math.round(pct * 100)}%
          </text>
        </svg>
        <div>
          <div className="font-display text-2xl text-ghost">
            {unit === "bytes" ? fmtBytes(used) : used.toLocaleString()}
          </div>
          <div className="font-mono text-[11px] text-mute">
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
}: {
  points: Sample[];
  pick: (s: Sample) => number | null;
  color: string;
}) {
  const xs = points.map(pick).filter((n): n is number => n != null && n >= 0);
  const w = 280;
  const h = 72;
  if (xs.length < 2) {
    return <div className="flex h-[72px] items-center font-mono text-[11px] text-mute">Need a few samples…</div>;
  }
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = max - min || Math.abs(max) * 0.08 || 1;
  const d = xs
    .map((v, i) => {
      const x = 4 + (i / (xs.length - 1)) * (w - 8);
      const y = 8 + ((max - v) / span) * (h - 16);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="h-[72px] w-full" aria-hidden>
      <path d={`${d} L${w - 4} ${h} L4 ${h} Z`} fill={color} fillOpacity="0.14" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
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

  const tickFresh = (pack?.tickAgeMs || 0) >= 0 && (pack?.tickAgeMs || 9e99) < 90_000;

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Gauge label="PINATA STORAGE" used={pinBytes} max={pinMax} unit="bytes" warn={!pack?.pinata.configured} />
        <Gauge label="PINATA FILES" used={pinFiles} max={pinFilesMax} unit="count" />
        <Gauge label="APP STATE" used={storeBytes} max={redisMax} unit="bytes" />
        <div className="rounded-2xl border border-violet/20 bg-void/40 p-4">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">ENGINE</div>
          <div className={`mt-4 font-display text-3xl ${tickFresh ? "text-acid" : "text-blood"}`}>
            {pack ? (tickFresh ? "LIVE" : "STALE") : "…"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-mute">
            {pack && pack.tickAgeMs >= 0 ? `${Math.round(pack.tickAgeMs / 1000)}s since tick` : "no tick yet"}
            {data?.durableKind ? ` · store ${data.durableKind}` : ""}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-violet/20 bg-void/40 p-4">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">RPC LATENCY · {range.toUpperCase()}</div>
          <Spark points={log} pick={(s) => s.rpcMs} color="#14f195" />
        </div>
        <div className="rounded-2xl border border-violet/20 bg-void/40 p-4">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">JUPITER · {range.toUpperCase()}</div>
          <Spark points={log} pick={(s) => s.jupMs} color="#80eaff" />
        </div>
        <div className="rounded-2xl border border-violet/20 bg-void/40 p-4">
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute">STATE SIZE · {range.toUpperCase()}</div>
          <Spark points={log} pick={(s) => s.storeBytes} color="#9945ff" />
        </div>
      </div>

      <div className="rounded-2xl border border-violet/20 bg-void/40 p-4">
        <div className="font-mono text-[10px] tracking-[0.2em] text-mute">SPEED TEST</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(pack?.speeds || []).map((s) => (
            <div key={s.id} className="rounded-xl border border-violet/15 px-3 py-2">
              <div className="font-mono text-[10px] text-mute">{s.label}</div>
              <div className={`font-display text-xl ${s.ok ? "text-acid" : "text-blood"}`}>
                {s.ms == null ? "—" : s.ok ? `${s.ms} ms` : "fail"}
              </div>
              {s.detail && <div className="truncate font-mono text-[10px] text-mute">{s.detail}</div>}
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

      <div className="rounded-3xl border border-acid/25 bg-acid/[0.05] p-5">
        <div className="font-mono text-[10px] tracking-[0.22em] text-acid">GROWTH CHEAT SHEET</div>
        <p className="mt-1 text-sm text-mute">
          What we run today, the ceiling, and the next paid step. Flip the tier when you actually upgrade so the gauges
          move with you.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="font-mono text-[10px] tracking-[0.16em] text-mute">
              <tr>
                <th className="pb-2 pr-3">Service</th>
                <th className="pb-2 pr-3">Now</th>
                <th className="pb-2 pr-3">Ceiling</th>
                <th className="pb-2 pr-3">Next</th>
                <th className="pb-2">Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {(pack?.services || []).map((s) => (
                <tr key={s.id} className="border-t border-violet/15 align-top">
                  <td className="py-3 pr-3">
                    <div className="font-display text-lg text-ghost">{s.name}</div>
                    <div className="text-[12px] text-mute">{s.why}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      value={s.tier.id}
                      onChange={(e) => setTier(s.id, e.target.value)}
                      className="rounded-full border border-violet/30 bg-void px-3 py-1 font-mono text-[11px] text-ghost"
                    >
                      {s.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label} · {o.price}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-mute">
                    {Object.entries(s.tier.limits)
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <div key={k}>
                          {k} {v.toLocaleString()}
                        </div>
                      ))}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-acid">
                    {s.next ? `${s.next.label} · ${s.next.price}` : "top"}
                  </td>
                  <td className="py-3 text-[13px] text-mute">{s.tier.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
