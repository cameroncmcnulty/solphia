/**
 * Pinata IPFS. Auth from env only — never commit keys.
 * Prefer PINATA_JWT. PINATA_API_KEY + PINATA_API_SECRET is the header pair fallback.
 */

const PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const USAGE_URL = "https://api.pinata.cloud/data/userPinnedDataTotal";
const GATEWAY = (process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");

const DIRECT_IMG = [
  "dd.dexscreener.com",
  "cdn.dexscreener.com",
  "image.solanatracker.io",
  "ipfs.io",
  "cloudflare-ipfs.com",
  "nftstorage.link",
  "arweave.net",
  "shdw-drive.genesysgo.net",
];

function directImage(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host.endsWith(".mypinata.cloud") || host.endsWith(".ipfs.nftstorage.link")) return true;
    return DIRECT_IMG.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Same-origin proxy so Pinata/IPFS images actually render in the app. */
export function displayMedia(url?: string | null): string {
  const raw = (url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:image/")) return raw;
  if (raw.startsWith("/api/media")) return raw;
  if (!/^https?:\/\//i.test(raw)) return raw;
  if (directImage(raw)) return raw;
  return `/api/media?u=${encodeURIComponent(raw)}`;
}

/** Public gateway URL for metadata URIs and Dexscreener. Not the /api/media proxy. */
export function pinataPublicUrl(cid: string): string {
  return `${GATEWAY}/${cid}`;
}

/** Phantom-friendly IPFS URL. CID with ?ext= so wallets do not assume the wrong type. */
export function ipfsMetadataUrl(cid: string, ext?: string): string {
  const q = ext ? `?ext=${ext}` : "";
  return `https://ipfs.io/ipfs/${cid}${q}`;
}

export function pinataConfigured(): boolean {
  const jwt = (process.env.PINATA_JWT || "").trim();
  const key = (process.env.PINATA_API_KEY || "").trim();
  const secret = (process.env.PINATA_API_SECRET || "").trim();
  return Boolean(jwt || (key && secret));
}

function authHeaders(): Record<string, string> {
  const jwt = (process.env.PINATA_JWT || "").trim();
  const key = (process.env.PINATA_API_KEY || "").trim();
  const secret = (process.env.PINATA_API_SECRET || "").trim();
  if (jwt) return { authorization: `Bearer ${jwt}` };
  if (key && secret) return { pinata_api_key: key, pinata_secret_api_key: secret };
  return {};
}

export type PinataUsage = {
  ok: boolean;
  files: number;
  bytes: number;
  ms: number;
  error?: string;
};

export async function pinataUsage(): Promise<PinataUsage> {
  if (!pinataConfigured()) return { ok: false, files: 0, bytes: 0, ms: 0, error: "not_configured" };
  const t0 = Date.now();
  try {
    const r = await fetch(USAGE_URL, {
      headers: { accept: "application/json", ...authHeaders() },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const ms = Date.now() - t0;
    const j = (await r.json().catch(() => ({}))) as {
      pin_count?: number;
      pin_size_total?: number;
      error?: { reason?: string; details?: string };
      message?: string;
    };
    if (!r.ok) {
      return { ok: false, files: 0, bytes: 0, ms, error: j.error?.reason || j.message || `http_${r.status}` };
    }
    return { ok: true, files: Number(j.pin_count) || 0, bytes: Number(j.pin_size_total) || 0, ms };
  } catch (e) {
    return { ok: false, files: 0, bytes: 0, ms: Date.now() - t0, error: e instanceof Error ? e.message : "fetch_failed" };
  }
}

function fileName(name: string, type: string) {
  const ext = type.includes("json") ? "json" : type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  return `${name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "token"}.${ext}`;
}

async function pinOnce(bytes: Buffer, type: string, name: string): Promise<{ cid: string; url: string } | null> {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  const file = fileName(name, type);
  const jwt = (process.env.PINATA_JWT || "").trim();

  const v2 = new FormData();
  v2.append("file", blob, file);
  v2.append("pinataMetadata", JSON.stringify({ name: `solphia-${name.slice(0, 24)}` }));
  try {
    const r = await fetch(PIN_URL, {
      method: "POST",
      headers: authHeaders(),
      body: v2,
      signal: AbortSignal.timeout(25_000),
    });
    const j = (await r.json().catch(() => ({}))) as { IpfsHash?: string };
    if (r.ok && j.IpfsHash) return { cid: j.IpfsHash, url: pinataPublicUrl(j.IpfsHash) };
  } catch {
    /* try v3 */
  }

  if (!jwt) return null;
  const v3 = new FormData();
  v3.append("file", blob, file);
  v3.append("network", "public");
  try {
    const r = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}` },
      body: v3,
      signal: AbortSignal.timeout(25_000),
    });
    const j = (await r.json().catch(() => ({}))) as { data?: { cid?: string }; IpfsHash?: string };
    const cid = j.data?.cid || j.IpfsHash;
    if (r.ok && cid) return { cid, url: pinataPublicUrl(cid) };
  } catch {
    return null;
  }
  return null;
}

export async function pinBytes(
  buf: Buffer | Uint8Array,
  mime: string,
  name: string,
): Promise<{ cid: string; url: string } | null> {
  if (!pinataConfigured()) return null;
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (bytes.length < 32 || bytes.length > 4_000_000) return null;
  const type = (mime || "image/jpeg").split(";")[0].trim() || "image/jpeg";
  for (let i = 0; i < 3; i++) {
    const got = await pinOnce(bytes, type, name);
    if (got?.cid) return got;
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

export async function pinJson(value: unknown, name: string): Promise<{ cid: string; url: string } | null> {
  const body = JSON.stringify(value);
  if (body.length < 8 || body.length > 400_000) return null;
  return pinBytes(Buffer.from(body, "utf8"), "application/json", name);
}

export async function pinDataUrl(dataUrl: string, name: string): Promise<{ cid: string; url: string } | null> {
  if (!dataUrl.startsWith("data:")) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUrl.slice(5, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = (meta.split(";")[0] || "image/png").trim();
  return pinBytes(Buffer.from(b64, "base64"), mime, name);
}
