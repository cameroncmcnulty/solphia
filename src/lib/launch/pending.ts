const KEY = "solphia_pending_launches";
const DAY = 24 * 60 * 60 * 1000;

export type PendingLaunch = {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  at: number;
  sig?: string;
};

export function loadPending(): PendingLaunch[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    const now = Date.now();
    return raw.filter((p) => p && typeof p.mint === "string" && now - Number(p.at) < DAY);
  } catch {
    return [];
  }
}

export function savePending(p: PendingLaunch) {
  const rest = loadPending().filter((x) => x.mint !== p.mint);
  localStorage.setItem(KEY, JSON.stringify([p, ...rest].slice(0, 12)));
}

export function clearPending(mint: string) {
  localStorage.setItem(KEY, JSON.stringify(loadPending().filter((x) => x.mint !== mint)));
}
