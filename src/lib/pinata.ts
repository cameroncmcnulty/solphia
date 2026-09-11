/**
 * Pinata IPFS. Auth from env only — never commit keys.
 * Prefer PINATA_JWT (dashboard → API Keys). PINATA_API_KEY is accepted as Bearer
 * for older keys; PINATA_API_SECRET pairs with the legacy header pair.
 */

const PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const USAGE_URL = "https://api.pinata.cloud/data/userPinnedDataTotal";
const GATEWAY = (process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");

export function pinataConfigured(): boolean {
  return Boolean((process.env.PINATA_JWT || process.env.PINATA_API_KEY || "").trim());
}

function authHeaders(): Record<string, string> {
  const jwt = (process.env.PINATA_JWT || "").trim();
  const key = (process.env.PINATA_API_KEY || "").trim();
  const secret = (process.env.PINATA_API_SECRET || "").trim();
  if (jwt) return { authorization: `Bearer ${jwt}` };
  if (key && secret) return { pinata_api_key: key, pinata_secret_api_key: secret };
  if (key) return { authorization: `Bearer ${key}` };
  return {};
}

export type PinataUsage = {
  ok: boolean;
  files: number;
  bytes: number;
  error?: string;
};

export async function pinataUsage(): Promise<PinataUsage> {
  if (!pinataConfigured()) return { ok: false, files: 0, bytes: 0, error: "not_configured" };
  try {
    const r = await fetch(USAGE_URL, {
      headers: { accept: "application/json", ...authHeaders() },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json().catch(() => ({}))) as {
      pin_count?: number;
      pin_size_total?: number;
      error?: { reason?: string; details?: string };
      message?: string;
    };
    if (!r.ok) {
      return { ok: false, files: 0, bytes: 0, error: j.error?.reason || j.message || `http_${r.status}` };
    }
    return { ok: true, files: Number(j.pin_count) || 0, bytes: Number(j.pin_size_total) || 0 };
  } catch (e) {
    return { ok: false, files: 0, bytes: 0, error: e instanceof Error ? e.message : "fetch_failed" };
  }
}

export async function pinDataUrl(dataUrl: string, name: string): Promise<{ cid: string; url: string } | null> {
  if (!pinataConfigured() || !dataUrl.startsWith("data:")) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUrl.slice(5, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = (meta.split(";")[0] || "image/png").trim();
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 32 || buf.length > 4_000_000) return null;
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buf)], { type: mime });
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  form.append("file", blob, `${name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "token"}.${ext}`);
  form.append("pinataMetadata", JSON.stringify({ name: `solphia-${name.slice(0, 24)}` }));
  try {
    const r = await fetch(PIN_URL, {
      method: "POST",
      headers: authHeaders(),
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    const j = (await r.json().catch(() => ({}))) as { IpfsHash?: string };
    if (!r.ok || !j.IpfsHash) return null;
    return { cid: j.IpfsHash, url: `${GATEWAY}/${j.IpfsHash}` };
  } catch {
    return null;
  }
}
