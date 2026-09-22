const KEY = "solphia_hidden_launches";

export function loadHidden(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((m) => typeof m === "string" && m.length >= 32);
  } catch {
    return [];
  }
}

export function hideLaunch(mint: string) {
  const rest = loadHidden().filter((m) => m !== mint);
  localStorage.setItem(KEY, JSON.stringify([mint, ...rest].slice(0, 80)));
}

export function isHidden(mint?: string | null): boolean {
  if (!mint) return false;
  return loadHidden().includes(mint);
}
