/** Official $SPHA public countdown. Empty launchAt means Coming soon — never mint. */

export const SPHA_MINT_LEAD_MS = 10 * 60_000;
export const SPHA_COUNTDOWN_MIN_MS = SPHA_MINT_LEAD_MS + 30_000;

export type SphaCountdownStatus = "soon" | "armed" | "minting" | "minted" | "live" | "failed";

export type SphaCountdownLaunch = {
  mint: string;
  network: "devnet" | "mainnet-beta";
  name: string;
  symbol: string;
  supply: number;
  launchedAt: number;
  sigs: string[];
  allocations: { id: string; wallet: string; tokens: number }[];
  image?: string;
  blurb?: string;
  uri?: string;
  website?: string;
  config?: string;
};

export type SphaCountdown = {
  launchAt: number;
  mintLeadMs: number;
  armedAt: number;
  status: SphaCountdownStatus;
  pendingMint?: string;
  pendingConfig?: string;
  pendingSigs?: string[];
  pendingLaunch?: SphaCountdownLaunch | null;
  error?: string;
  revealedAt?: number;
  mintingAt?: number;
  at: number;
};

export type SphaPublicPhase = "soon" | "counting" | "live";

export type SphaPublicCountdown = {
  phase: SphaPublicPhase;
  launchAt: number;
  remainingMs: number;
  mintLeadMs: number;
  serverNow: number;
};

const STATUS_RANK: Record<SphaCountdownStatus, number> = {
  soon: 0,
  armed: 1,
  failed: 2,
  minting: 3,
  minted: 4,
  live: 5,
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function statusOf(v: unknown): SphaCountdownStatus {
  if (v === "armed" || v === "minting" || v === "minted" || v === "live" || v === "failed" || v === "soon") return v;
  return "soon";
}

export function emptySphaCountdown(): SphaCountdown {
  return {
    launchAt: 0,
    mintLeadMs: SPHA_MINT_LEAD_MS,
    armedAt: 0,
    status: "soon",
    pendingLaunch: null,
    at: 0,
  };
}

export function normalizeSphaCountdown(raw: Partial<SphaCountdown> | null | undefined): SphaCountdown {
  const base = emptySphaCountdown();
  if (!raw || typeof raw !== "object") return base;
  const launchAt = Math.max(0, Math.floor(num(raw.launchAt)));
  const pendingMint = str(raw.pendingMint);
  const status = statusOf(raw.status);
  return {
    launchAt,
    mintLeadMs: num(raw.mintLeadMs) > 0 ? Math.floor(num(raw.mintLeadMs)) : SPHA_MINT_LEAD_MS,
    armedAt: Math.max(0, Math.floor(num(raw.armedAt))),
    status: launchAt <= 0 && status !== "live" && !pendingMint ? "soon" : status,
    pendingMint: pendingMint || undefined,
    pendingConfig: str(raw.pendingConfig) || undefined,
    pendingSigs: Array.isArray(raw.pendingSigs) ? raw.pendingSigs.map(String).filter(Boolean).slice(0, 8) : undefined,
    pendingLaunch: raw.pendingLaunch && typeof raw.pendingLaunch === "object" ? raw.pendingLaunch : null,
    error: str(raw.error) || undefined,
    revealedAt: num(raw.revealedAt) > 0 ? Math.floor(num(raw.revealedAt)) : undefined,
    mintingAt: num(raw.mintingAt) > 0 ? Math.floor(num(raw.mintingAt)) : undefined,
    at: Math.max(0, Math.floor(num(raw.at))),
  };
}

export function parseSphaCountdown(raw: unknown): SphaCountdown | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nested =
    o.sphaCountdown && typeof o.sphaCountdown === "object"
      ? (o.sphaCountdown as Record<string, unknown>)
      : "launchAt" in o || "status" in o || "pendingMint" in o
        ? o
        : null;
  if (!nested) return null;
  const stamped = num(nested.at ?? o.sphaCountdownAt ?? o.at);
  const filled = num(nested.launchAt) > 0 || Boolean(str(nested.pendingMint)) || statusOf(nested.status) === "live";
  const at = stamped > 0 ? stamped : filled ? num(o.opsUpdatedAt) || 1 : 0;
  return normalizeSphaCountdown({ ...(nested as Partial<SphaCountdown>), at });
}

/** Newer stamp wins. Equal stamps keep the more advanced status and any pending CA. */
export function mergeSphaCountdown(local: SphaCountdown, remote: SphaCountdown): SphaCountdown {
  const L = normalizeSphaCountdown(local);
  const R = normalizeSphaCountdown(remote);
  const la = L.at;
  const ra = R.at;
  if (ra > la) return preferPending(R, L);
  if (la > ra) return preferPending(L, R);
  const winner = STATUS_RANK[R.status] > STATUS_RANK[L.status] ? R : L;
  const other = winner === R ? L : R;
  return preferPending(winner, other);
}

function preferPending(primary: SphaCountdown, fallback: SphaCountdown): SphaCountdown {
  const pendingMint = primary.pendingMint || fallback.pendingMint;
  if (!pendingMint) return primary;
  return {
    ...primary,
    pendingMint,
    pendingConfig: primary.pendingConfig || fallback.pendingConfig,
    pendingSigs: primary.pendingSigs?.length ? primary.pendingSigs : fallback.pendingSigs,
    pendingLaunch: primary.pendingLaunch || fallback.pendingLaunch || null,
    status:
      primary.status === "soon" && pendingMint
        ? fallback.status === "live"
          ? "live"
          : "minted"
        : primary.status,
  };
}

export function sphaMintAt(c: SphaCountdown | null | undefined): number {
  const row = normalizeSphaCountdown(c);
  if (!(row.launchAt > 0)) return 0;
  return Math.max(0, row.launchAt - (row.mintLeadMs || SPHA_MINT_LEAD_MS));
}

export function sphaInMintWindow(c: SphaCountdown | null | undefined, now = Date.now()): boolean {
  const row = normalizeSphaCountdown(c);
  if (!(row.launchAt > 0)) return false;
  if (row.status === "live") return false;
  return now >= sphaMintAt(row);
}

export function sphaTimedOut(c: SphaCountdown | null | undefined, now = Date.now()): boolean {
  const row = normalizeSphaCountdown(c);
  return row.launchAt > 0 && now >= row.launchAt;
}

export function publicSphaCountdown(
  c: SphaCountdown | null | undefined,
  publicMint: string,
  now = Date.now(),
): SphaPublicCountdown {
  const row = normalizeSphaCountdown(c);
  const mint = (publicMint || "").trim();
  const mintLeadMs = row.mintLeadMs || SPHA_MINT_LEAD_MS;
  if (mint || row.status === "live") {
    return { phase: "live", launchAt: row.launchAt || row.revealedAt || 0, remainingMs: 0, mintLeadMs, serverNow: now };
  }
  if (!(row.launchAt > 0)) {
    return { phase: "soon", launchAt: 0, remainingMs: 0, mintLeadMs, serverNow: now };
  }
  return {
    phase: "counting",
    launchAt: row.launchAt,
    remainingMs: Math.max(0, row.launchAt - now),
    mintLeadMs,
    serverNow: now,
  };
}

export function splitRemaining(ms: number): { d: number; h: number; m: number; s: number } {
  const t = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(t / 86400),
    h: Math.floor((t % 86400) / 3600),
    m: Math.floor((t % 3600) / 60),
    s: t % 60,
  };
}

export function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}
