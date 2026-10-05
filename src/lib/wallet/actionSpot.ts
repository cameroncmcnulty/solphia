const KEY = "solphia:action-spot";
const MAX_AGE_MS = 3 * 60 * 1000;

export type ActionSpot = {
  id: string;
  y: number;
  path: string;
  at: number;
};

export function spotFromAfter(after?: { kind?: string; partner?: boolean } | null): string | undefined {
  if (!after?.kind) return undefined;
  if (after.kind === "claim") return after.partner ? "protocol-fees" : "creator-fees";
  if (after.kind === "swap" || after.kind === "jup_swap") return "swap-widget";
  if (after.kind === "launch_config" || after.kind === "launch_pool") return "solphia-launch";
  return undefined;
}

export function spotIsFresh(at: number, now = Date.now()): boolean {
  return now - at >= 0 && now - at < MAX_AGE_MS;
}

export function markActionSpot(id?: string) {
  if (typeof window === "undefined") return;
  try {
    const prev = readActionSpot();
    const next: ActionSpot = {
      id: (id || prev?.id || "").slice(0, 80),
      y: window.scrollY || 0,
      path: window.location.pathname,
      at: Date.now(),
    };
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

export function readActionSpot(): ActionSpot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<ActionSpot>;
    if (!j || typeof j.at !== "number" || !spotIsFresh(j.at)) return null;
    return {
      id: typeof j.id === "string" ? j.id : "",
      y: typeof j.y === "number" ? j.y : 0,
      path: typeof j.path === "string" ? j.path : "",
      at: j.at,
    };
  } catch {
    return null;
  }
}

export function clearActionSpot() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export function scrollToSpot(id?: string | null, y?: number) {
  if (typeof document === "undefined") return;
  const target = (id || "").trim();
  const go = (n = 0) => {
    const el = target ? document.getElementById(target) : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (n < 20) {
      requestAnimationFrame(() => go(n + 1));
      return;
    }
    if (typeof y === "number" && Number.isFinite(y)) {
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };
  requestAnimationFrame(() => go());
}

export function restoreActionSpot() {
  const spot = readActionSpot();
  if (!spot) return null;
  if (spot.path && typeof window !== "undefined" && window.location.pathname !== spot.path) return null;
  scrollToSpot(spot.id, spot.y);
  return spot;
}
