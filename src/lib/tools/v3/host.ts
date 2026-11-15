/** Isolated V3 memecoin hostnames. ticker.solphia.io — never reuse protocol hosts. */

export const V3_ROOT_HOST = "solphia.io";

const RESERVED = new Set([
  "www",
  "www2",
  "api",
  "app",
  "admin",
  "mail",
  "cdn",
  "static",
  "solphia",
  "spha",
  "token",
  "launch",
  "swap",
  "wallet",
  "ftp",
  "ns",
  "ns1",
  "ns2",
  "m",
  "c",
  "r",
  "shill",
  "circle",
  "account",
  "pricing",
  "legal",
  "faq",
  "trading",
  "auto",
  "copy",
  "alerts",
  "sniper",
  "migrate",
  "terminal",
  "subscribe",
]);

export function v3HandleOf(symbol: string): string {
  const h = (symbol || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 24);
  if (!h || RESERVED.has(h)) return `coin${h}`.replace(/[^a-z0-9]/g, "").slice(0, 24) || "coin";
  return h;
}

export function isReservedV3Host(handle: string): boolean {
  return RESERVED.has((handle || "").toLowerCase());
}

export function v3WebsiteOf(symbol: string): string {
  return `https://${v3HandleOf(symbol)}.${V3_ROOT_HOST}`;
}

export function v3PathOf(symbol: string): string {
  return `/m/${v3HandleOf(symbol)}`;
}

export function v3HostFromHeader(host: string): string {
  const hostname = (host || "").split(":")[0].trim().toLowerCase();
  if (hostname.endsWith(`.${V3_ROOT_HOST}`)) {
    return hostname.slice(0, -(V3_ROOT_HOST.length + 1));
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") return "";
  return "";
}
