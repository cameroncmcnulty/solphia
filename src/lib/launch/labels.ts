/** Pad must never persist or display these as a real ticker/name. */
export function isPlaceholderLabel(s?: string): boolean {
  const a = (s || "").replace(/\s/g, "").replace(/^\$+/, "").toUpperCase();
  return !a || a === "TOKEN" || a === "UNNAMED" || a === "TKN";
}

export function preferLiveLabel(next?: string, prev?: string): string {
  const n = (next || "").trim();
  const p = (prev || "").trim();
  if (isPlaceholderLabel(n) && p && !isPlaceholderLabel(p)) return p;
  return n || p;
}
