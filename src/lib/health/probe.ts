import { HELIUS_API_KEY, rpcUrl, XAI_API_KEY } from "../config";
import { signerConfigured } from "../live/crypto";
import { pinataConfigured, pinataUsage } from "../pinata";
import { durableConfigured, durableKind } from "../persist";
import { pushBounded } from "../store";
import type { AppState } from "../types";
import { SERVICES, tierOf, type HealthTiers, type ServiceId } from "./catalog";

export type HealthSample = {
  t: number;
  tickAgeMs: number;
  storeBytes: number;
  rpcMs: number | null;
  jupMs: number | null;
  pinataBytes: number | null;
  pinataFiles: number | null;
};

export type SpeedRow = { id: string; label: string; ms: number | null; ok: boolean; detail?: string };

export const HEALTH_LOG_MAX = 700;

async function ping(url: string, init?: RequestInit): Promise<{ ok: boolean; ms: number; status: number }> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    return { ok: r.ok, ms: Date.now() - t0, status: r.status };
  } catch {
    return { ok: false, ms: Date.now() - t0, status: 0 };
  }
}

export function estimateStoreBytes(state: AppState): number {
  try {
    return Buffer.byteLength(JSON.stringify({
      paper: state.paper,
      traders: Object.keys(state.traders || {}).length,
      launch: state.launch ? { coins: state.launch.coins?.length || 0 } : null,
      users: (state.users || []).length,
      healthLog: (state.healthLog || []).length,
    }));
  } catch {
    return 0;
  }
}

export function recordHealthSample(state: AppState, sample: HealthSample) {
  if (!state.healthLog) state.healthLog = [];
  const last = state.healthLog[state.healthLog.length - 1];
  if (last && sample.t - last.t < 10 * 60_000) {
    state.healthLog[state.healthLog.length - 1] = sample;
    return;
  }
  pushBounded(state.healthLog, sample, HEALTH_LOG_MAX);
}

export async function probeHealth(state: AppState): Promise<{
  speeds: SpeedRow[];
  pinata: { ok: boolean; files: number; bytes: number; configured: boolean; error?: string };
  storeBytes: number;
  tickAgeMs: number;
  sample: HealthSample;
}> {
  const rpc = rpcUrl();
  const [rpcPing, jupPing, dexPing, pin] = await Promise.all([
    ping(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
    }),
    ping("https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=50"),
    ping("https://api.dexscreener.com/latest/dex/search?q=SOL"),
    pinataUsage(),
  ]);
  const storeBytes = estimateStoreBytes(state);
  const tickAgeMs = state.lastTickAt ? Date.now() - state.lastTickAt : -1;
  const speeds: SpeedRow[] = [
    { id: "rpc", label: "Solana RPC", ms: rpcPing.ms, ok: rpcPing.ok, detail: HELIUS_API_KEY ? "Helius" : "public" },
    { id: "jup", label: "Jupiter", ms: jupPing.ms, ok: jupPing.ok },
    { id: "dex", label: "Dexscreener", ms: dexPing.ms, ok: dexPing.ok },
    {
      id: "pinata",
      label: "Pinata",
      ms: pin.ok ? 1 : pin.error === "not_configured" ? null : 0,
      ok: pin.ok,
      detail: pin.error,
    },
    {
      id: "store",
      label: "Durable store",
      ms: durableConfigured() ? 1 : null,
      ok: durableConfigured(),
      detail: durableKind(),
    },
  ];
  const sample: HealthSample = {
    t: Date.now(),
    tickAgeMs,
    storeBytes,
    rpcMs: rpcPing.ok ? rpcPing.ms : null,
    jupMs: jupPing.ok ? jupPing.ms : null,
    pinataBytes: pin.ok ? pin.bytes : null,
    pinataFiles: pin.ok ? pin.files : null,
  };
  return {
    speeds,
    pinata: { ok: pin.ok, files: pin.files, bytes: pin.bytes, configured: pinataConfigured(), error: pin.error },
    storeBytes,
    tickAgeMs,
    sample,
  };
}

export function inferredTiers(): HealthTiers {
  return {
    vercel: process.env.VERCEL_ENV && process.env.VERCEL ? "hobby" : "hobby",
    upstash: durableKind() === "upstash" ? "free" : durableKind() === "blob" ? "payg" : "free",
    helius: HELIUS_API_KEY ? "free" : "free",
    pinata: pinataConfigured() ? "free" : "free",
    xai: XAI_API_KEY ? "grok" : "none",
    signer: signerConfigured() ? "on" : "off",
  };
}

export function mergeTiers(saved?: HealthTiers | null): HealthTiers {
  return { ...inferredTiers(), ...(saved || {}) };
}

export function windowSamples(log: HealthSample[], ms: number): HealthSample[] {
  const cut = Date.now() - ms;
  return (log || []).filter((s) => s.t >= cut);
}

export { SERVICES, tierOf };
export type { ServiceId };
