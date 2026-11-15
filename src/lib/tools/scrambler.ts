/**
 * Solana multi-hop funding obfuscation for Data Launcher V2.
 * Generates ephemeral hop paths, jittered amounts/delays, and optional warmup.
 * Secrets are never discarded from the vault — hops are one-shot, keys stay for incinerator reclaim.
 */

export const SCRAMBLER_HOPS_MIN = 4;
export const SCRAMBLER_HOPS_MAX = 7;
export const SCRAMBLER_HOPS_DEFAULT_MIN = 4;
export const SCRAMBLER_HOPS_DEFAULT_MAX = 7;
export const AMOUNT_JITTER_MIN = 0.05;
export const AMOUNT_JITTER_MAX = 0.15;
/** Default hop delay range. */
export const DELAY_MS_MIN = 10_000;
export const DELAY_MS_MAX = 10 * 60_000;
export const WARMUP_CYCLES_MIN = 2;
export const WARMUP_CYCLES_MAX = 5;
export const WARMUP_SOL_MIN = 0.01;
export const WARMUP_SOL_MAX = 0.05;
/** Keep this much SOL in the final wallet so launch rent cannot be eaten by warmup. */
export const WARMUP_KEEP_SOL = 0.05;
/** Old hop/final wallets reclaim mint-account rent here, then EXTRACT sends SOL to treasury. */
export const INCINERATOR_URL = "https://sol-incinerator.com/tools";
export const WARMUP_DELAY_MS_MIN = 8_000;
export const WARMUP_DELAY_MS_MAX = 45_000;

export type ScramblerOpts = {
  hopsMin: number;
  hopsMax: number;
  delayMinMs: number;
  delayMaxMs: number;
  branch: boolean;
  warmup: boolean;
  warmupMints: string[];
};

export const DEFAULT_SCRAMBLER: ScramblerOpts = {
  hopsMin: SCRAMBLER_HOPS_DEFAULT_MIN,
  hopsMax: SCRAMBLER_HOPS_DEFAULT_MAX,
  delayMinMs: DELAY_MS_MIN,
  delayMaxMs: DELAY_MS_MAX,
  branch: true,
  warmup: false,
  warmupMints: [],
};

export type HopRole = "hop" | "final";

export type HopPlanNode = {
  role: HopRole;
  hopIndex: number;
  /** Shared prefix hop so several finals branch off the same early legs. */
  shared: boolean;
  sharedSlot?: number;
};

export type HopPathPlan = {
  pathId: string;
  tokenId: string;
  topology: "linear" | "branch";
  hops: number;
  nodes: HopPlanNode[];
};

function rand(): number {
  return Math.random();
}

export function randRange(min: number, max: number): number {
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  if (hi === lo) return lo;
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  return a + rand() * (b - a);
}

export function clampHops(min: number, max: number): { min: number; max: number } {
  const a = Math.max(1, Math.min(12, Math.floor(Number(min) || SCRAMBLER_HOPS_DEFAULT_MIN)));
  const b = Math.max(a, Math.min(12, Math.floor(Number(max) || SCRAMBLER_HOPS_DEFAULT_MAX)));
  return { min: a, max: b };
}

export function hopCount(min = SCRAMBLER_HOPS_DEFAULT_MIN, max = SCRAMBLER_HOPS_DEFAULT_MAX): number {
  const { min: lo, max: hi } = clampHops(min, max);
  return lo + Math.floor(rand() * (hi - lo + 1));
}

export function clampDelayMs(minMs: number, maxMs: number): { minMs: number; maxMs: number } {
  const a = Math.max(1_000, Math.min(30 * 60_000, Math.floor(Number(minMs) || DELAY_MS_MIN)));
  const b = Math.max(a, Math.min(30 * 60_000, Math.floor(Number(maxMs) || DELAY_MS_MAX)));
  return { minMs: a, maxMs: b };
}

function mixNoise(n: number, span: number): number {
  const noise = Math.floor(randRange(1, Math.max(2, span)));
  return n + (rand() < 0.5 ? noise : -noise);
}

/**
 * ±5–15% variance around `base` lamports. Never a round 0.01 / 0.1 / 1 SOL.
 * Never returns the exact base. Unique per call.
 */
export function jitterLamports(base: number, opts?: { minPct?: number; maxPct?: number; used?: Set<number> }): number {
  const raw = Math.max(1, Math.floor(Number(base) || 0));
  const minPct = opts?.minPct ?? AMOUNT_JITTER_MIN;
  const maxPct = opts?.maxPct ?? AMOUNT_JITTER_MAX;
  const pct = randRange(minPct, maxPct);
  const sign = rand() < 0.5 ? -1 : 1;
  let next = Math.floor(raw * (1 + sign * pct));
  if (next < 1) next = Math.max(1, Math.floor(raw * (1 - minPct)));
  const ROUND_01 = 10_000_000;
  const ROUND_1 = 1_000_000_000;
  const used = opts?.used;
  for (let i = 0; i < 12; i++) {
    const round = next % ROUND_01 === 0 || next % ROUND_1 === 0 || next === raw || (used && used.has(next));
    if (!round) break;
    next = Math.max(1, mixNoise(next === raw ? Math.floor(raw * (1 + (sign < 0 ? -1 : 1) * minPct)) : next, 88_861));
  }
  if (next === raw) next = raw + 1_337_017;
  if (next % ROUND_01 === 0) next += 3_713;
  used?.add(next);
  return Math.max(1, next);
}

/** Delay inside the configured range, with extra jitter so hops are never perfectly timed. */
export function jitterDelayMs(minMs: number, maxMs: number, used?: Set<number>): number {
  const { minMs: lo, maxMs: hi } = clampDelayMs(minMs, maxMs);
  let d = Math.floor(randRange(lo, hi));
  d = Math.floor(d * (1 + randRange(-0.08, 0.12)));
  d = Math.max(lo, Math.min(hi, d));
  for (let i = 0; i < 8; i++) {
    const round = d % 10_000 === 0 || d % 30_000 === 0 || d % 60_000 === 0 || (used && used.has(d));
    if (!round) break;
    const bump = Math.floor(randRange(317, 4_903));
    d = d + bump > hi ? Math.max(lo, d - bump) : d + bump;
    d = Math.max(lo, Math.min(hi, d));
  }
  if (d % 10_000 === 0 || d % 30_000 === 0 || d % 60_000 === 0) d = d >= hi ? d - 1_337 : d + 1_337;
  used?.add(d);
  return d;
}

export function warmupSol(): number {
  const n = randRange(WARMUP_SOL_MIN, WARMUP_SOL_MAX);
  const noisy = Math.round(n * 1e9) / 1e9;
  if (noisy === 0.01 || noisy === 0.02 || noisy === 0.03 || noisy === 0.04 || noisy === 0.05) {
    return Math.round((n + 0.001337) * 1e9) / 1e9;
  }
  return noisy;
}

export function warmupCycles(): number {
  return WARMUP_CYCLES_MIN + Math.floor(rand() * (WARMUP_CYCLES_MAX - WARMUP_CYCLES_MIN + 1));
}

export function normalizeScrambler(raw?: Partial<ScramblerOpts> | null): ScramblerOpts {
  const hops = clampHops(raw?.hopsMin ?? DEFAULT_SCRAMBLER.hopsMin, raw?.hopsMax ?? DEFAULT_SCRAMBLER.hopsMax);
  const delay = clampDelayMs(raw?.delayMinMs ?? DEFAULT_SCRAMBLER.delayMinMs, raw?.delayMaxMs ?? DEFAULT_SCRAMBLER.delayMaxMs);
  const mints = Array.isArray(raw?.warmupMints)
    ? raw!.warmupMints.map((m) => String(m || "").trim()).filter((m) => m.length >= 32 && m.length <= 44)
    : [];
  return {
    hopsMin: hops.min,
    hopsMax: hops.max,
    delayMinMs: delay.minMs,
    delayMaxMs: delay.maxMs,
    branch: raw?.branch !== false,
    warmup: Boolean(raw?.warmup),
    warmupMints: [...new Set(mints)].slice(0, 24),
  };
}

/**
 * One path per final wallet. Optional shared prefix (0–2 hops) so several
 * finals branch instead of sharing the exact same route.
 */
export function buildHopForest(
  tokenIds: string[],
  opts?: { hopsMin?: number; hopsMax?: number; branch?: boolean },
): HopPathPlan[] {
  const ids = tokenIds.filter(Boolean);
  const hops = clampHops(opts?.hopsMin ?? SCRAMBLER_HOPS_DEFAULT_MIN, opts?.hopsMax ?? SCRAMBLER_HOPS_DEFAULT_MAX);
  const branch = opts?.branch !== false && ids.length > 1;
  const sharedPrefix = branch ? Math.floor(randRange(0, 3)) : 0;
  return ids.map((tokenId, i) => {
    let n = hopCount(hops.min, hops.max);
    if (i % 3 === 1 && n < hops.max) n += 1;
    if (i % 3 === 2 && n > hops.min) n -= 1;
    n = Math.max(hops.min, Math.min(hops.max, n));
    const topology: HopPathPlan["topology"] = sharedPrefix > 0 ? "branch" : "linear";
    const nodes: HopPlanNode[] = [];
    for (let h = 0; h < n; h++) {
      const shared = h < sharedPrefix;
      nodes.push({
        role: "hop",
        hopIndex: h,
        shared,
        sharedSlot: shared ? h : undefined,
      });
    }
    nodes.push({ role: "final", hopIndex: n, shared: false });
    return {
      pathId: `p_${tokenId}_${n}_${sharedPrefix}`,
      tokenId,
      topology,
      hops: n,
      nodes,
    };
  });
}

export type VaultRole = "hop" | "final";

export type VaultEntry = {
  secret: string;
  role: VaultRole;
  createdAt: number;
  campaignId?: string;
  tokenId?: string;
  pathId?: string;
  hopIndex?: number;
};

export type WalletVault = Record<string, VaultEntry>;

/** Merge-only. Existing secrets win. Empty packs cannot wipe the vault. */
export function mergeVault(prev: WalletVault, incoming: WalletVault): WalletVault {
  const a = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
  const b = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {};
  const merged: WalletVault = { ...a };
  for (const [pk, row] of Object.entries(b)) {
    if (!pk || !row || typeof row !== "object" || !row.secret) continue;
    const old = merged[pk];
    if (old?.secret) {
      merged[pk] = {
        ...row,
        ...old,
        secret: old.secret,
        createdAt: old.createdAt || row.createdAt || Date.now(),
      };
    } else {
      merged[pk] = {
        secret: row.secret,
        role: row.role === "final" ? "final" : "hop",
        createdAt: Number(row.createdAt) || Date.now(),
        campaignId: row.campaignId,
        tokenId: row.tokenId,
        pathId: row.pathId,
        hopIndex: Number(row.hopIndex) || 0,
      };
    }
  }
  return merged;
}

export function vaultSecrets(vault: WalletVault): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [pk, row] of Object.entries(vault || {})) {
    if (pk && row?.secret) out[pk] = row.secret;
  }
  return out;
}

export function pickWarmupMint(list: string[], fallback?: string[]): string | null {
  const pool = [...(list || []), ...(fallback || [])].map((m) => String(m || "").trim()).filter((m) => m.length >= 32);
  if (!pool.length) return null;
  return pool[Math.floor(rand() * pool.length)] || null;
}
