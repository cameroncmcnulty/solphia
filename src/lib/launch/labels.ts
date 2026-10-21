/** Pad must never persist or display these as a real ticker/name. */
export function isPlaceholderLabel(s?: string): boolean {
  const a = (s || "").replace(/\s/g, "").replace(/^\$+/, "").toUpperCase();
  return !a || a === "TOKEN" || a === "UNNAMED" || a === "TKN";
}

/** First 4–8 chars of a mint are not a ticker. */
export function looksLikeMintTicker(label: string, mint?: string): boolean {
  const a = (label || "").replace(/\s/g, "").replace(/^\$+/, "").toUpperCase();
  if (!a || isPlaceholderLabel(a)) return true;
  const b = (mint || "").toUpperCase();
  return Boolean(b) && b.startsWith(a) && a.length >= 4 && a.length <= 8;
}

/** Real ticker only. Mint prefixes and TOKEN stubs become empty. */
export function realTicker(symbol?: string, mint?: string): string {
  const s = (symbol || "").replace(/^\$+/, "").trim();
  if (!s || looksLikeMintTicker(s, mint)) return "";
  return s;
}

export function realName(name?: string, mint?: string): string {
  const n = (name || "").trim();
  if (!n || isPlaceholderLabel(n) || looksLikeMintTicker(n, mint)) return "";
  return n;
}

export function displayTicker(symbol?: string, mint?: string): string {
  const s = realTicker(symbol, mint);
  if (s) return `$${s}`;
  if (mint && mint.length >= 8) return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
  return "";
}

export function preferLiveLabel(next?: string, prev?: string): string {
  const n = (next || "").trim();
  const p = (prev || "").trim();
  if (isPlaceholderLabel(n) && p && !isPlaceholderLabel(p)) return p;
  return n || p;
}
