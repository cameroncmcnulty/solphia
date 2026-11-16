/** Official $SPHA public countdown. Empty launchAt means Coming soon — never mint. */

/** Admin-only mint / CA window before public T-0. */
export const SPHA_MINT_LEAD_MS = 30 * 60_000;
export const SPHA_COUNTDOWN_MIN_MS = SPHA_MINT_LEAD_MS + 30_000;
/** Local fs-only rehearsal. Never used on a durable (Redis) store. */
export const SPHA_REHEARSAL_MS = 2 * 60_000;
export const SPHA_REHEARSAL_LEAD_MS = 45_000;

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
  /** Local TESTSPHA clock. Persist skips Redis when this is set. */
  rehearsal?: boolean;
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
    rehearsal: Boolean(raw.rehearsal) || undefined,
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

/** Public site: no CA, no live clock. Token is not live. */
export function sealedPublicSphaCountdown(now = Date.now()): SphaPublicCountdown {
  return {
    phase: "soon",
    launchAt: 0,
    remainingMs: 0,
    mintLeadMs: SPHA_MINT_LEAD_MS,
    serverNow: now,
  };
}

/** Keep an armed public clock. A stale soon/empty poll must not wipe launchAt. */
export function mergeSphaPublicPack<T extends {
  phase: SphaPublicPhase;
  mint: string;
  countdown: SphaPublicCountdown;
}>(prev: T, next: T): T {
  const mint = (next.mint || prev.mint || "").trim();
  const launchAt = next.countdown.launchAt > 0 ? next.countdown.launchAt : prev.countdown.launchAt;
  const mintLeadMs = next.countdown.mintLeadMs || prev.countdown.mintLeadMs || SPHA_MINT_LEAD_MS;
  const serverNow = next.countdown.serverNow || prev.countdown.serverNow || Date.now();
  const live = Boolean(mint) || next.phase === "live" || prev.phase === "live";
  const phase: SphaPublicPhase = live ? "live" : launchAt > 0 ? "counting" : "soon";
  return {
    ...next,
    mint,
    phase,
    countdown: {
      phase,
      launchAt,
      remainingMs: live ? 0 : launchAt > 0 ? Math.max(0, launchAt - serverNow) : 0,
      mintLeadMs,
      serverNow,
    },
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

/** Public clock label in Mountain time (MST in November). */
export function formatSphaLaunchWhen(ms: number, timeZone = "America/Denver"): string {
  if (!(ms > 0)) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toUTCString();
  }
}

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const LAUNCH_STEP_MS = 5 * 60_000;

export type LaunchPresetId = "1h" | "2h" | "6h" | "tonight" | "tomorrow" | "1d" | "3d";

export function toLocalDateValue(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toLocalTimeValue(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Browser-local value for <input type="datetime-local">. */
export function toDatetimeLocalValue(ms: number): string {
  const date = toLocalDateValue(ms);
  const time = toLocalTimeValue(ms);
  return date && time ? `${date}T${time}` : "";
}

/** Local wall clock. Avoids `new Date("YYYY-MM-DDTHH:MM")` Safari / TZ parsing. */
export function fromLocalDateTime(date: string, time: string): number {
  const d = LOCAL_DATE_RE.exec((date || "").trim());
  const t = LOCAL_TIME_RE.exec((time || "").trim());
  if (!d || !t) return 0;
  const y = Number(d[1]);
  const mo = Number(d[2]);
  const day = Number(d[3]);
  const h = Number(t[1]);
  const mi = Number(t[2]);
  if (mo < 1 || mo > 12 || day < 1 || day > 31 || h > 23 || mi > 59) return 0;
  const dt = new Date(y, mo - 1, day, h, mi, 0, 0);
  if (
    !Number.isFinite(dt.getTime()) ||
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== day ||
    dt.getHours() !== h ||
    dt.getMinutes() !== mi
  ) {
    return 0;
  }
  return dt.getTime();
}

/** Next 5-minute mark at least `minLeadMs` from now so T-30 has a window. */
export function defaultLaunchAt(now = Date.now(), minLeadMs = SPHA_COUNTDOWN_MIN_MS): number {
  const floor = Math.max(0, now) + Math.max(0, minLeadMs);
  return Math.ceil(floor / LAUNCH_STEP_MS) * LAUNCH_STEP_MS;
}

export function countdownLeadOk(launchAt: number, now = Date.now(), minLeadMs = SPHA_COUNTDOWN_MIN_MS): boolean {
  return launchAt > now + minLeadMs - 1_000;
}

export function localTimeZoneShort(now = Date.now(), timeZone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date(now));
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

function dropSeconds(ms: number): number {
  const d = new Date(ms);
  d.setSeconds(0, 0);
  return d.getTime();
}

export function applyLaunchPreset(id: LaunchPresetId, now = Date.now(), minLeadMs = SPHA_COUNTDOWN_MIN_MS): number {
  const d = new Date(now);
  const y = d.getFullYear();
  const mo = d.getMonth();
  const day = d.getDate();
  const atLeast = now + minLeadMs - 1_000;
  if (id === "1h") return dropSeconds(now + 60 * 60_000);
  if (id === "2h") return dropSeconds(now + 2 * 60 * 60_000);
  if (id === "6h") return dropSeconds(now + 6 * 60 * 60_000);
  if (id === "1d") return dropSeconds(now + 24 * 60 * 60_000);
  if (id === "3d") return dropSeconds(now + 3 * 24 * 60 * 60_000);
  if (id === "tonight") {
    const tonight = new Date(y, mo, day, 20, 0, 0, 0).getTime();
    return tonight > atLeast ? tonight : tonight + 86_400_000;
  }
  const noon = new Date(y, mo, day + 1, 12, 0, 0, 0).getTime();
  return noon > atLeast ? noon : noon + 86_400_000;
}
