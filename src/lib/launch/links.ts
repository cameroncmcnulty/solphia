export type SocialKind = "website" | "x" | "telegram" | "discord";

/** Turn a handle, invite, or URL into an https link. Empty if it cannot be trusted. */
export function socialHref(kind: SocialKind, raw?: string): string {
  const s = (raw || "").trim().slice(0, 180);
  if (!s) return "";
  if (kind === "x") {
    let h = s.replace(/^https?:\/\//i, "").replace(/^(www\.)?/i, "");
    h = h.replace(/^(x|twitter)\.com\//i, "").replace(/^@/, "");
    h = h.split(/[/?#\s]/)[0] || "";
    if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) return "";
    return `https://x.com/${h}`;
  }
  if (kind === "telegram") {
    let h = s.replace(/^https?:\/\//i, "").replace(/^(www\.)?/i, "");
    h = h.replace(/^(t\.me|telegram\.me|telegram\.org)\//i, "").replace(/^@/, "");
    h = h.split(/[/?#\s]/)[0] || "";
    if (!/^[A-Za-z0-9_]{3,32}$/.test(h)) return "";
    return `https://t.me/${h}`;
  }
  if (kind === "discord") {
    const invite = s.match(/(?:discord\.gg|discord\.com\/invite)\/([A-Za-z0-9-]+)/i);
    if (invite?.[1]) return `https://discord.gg/${invite[1]}`;
    const code = s.replace(/^@/, "").split(/[/?#\s]/)[0] || "";
    if (/^[A-Za-z0-9-]{3,32}$/.test(code)) return `https://discord.gg/${code}`;
    return "";
  }
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.toString().slice(0, 180);
  } catch {
    return "";
  }
}
