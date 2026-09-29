/** Token art URLs. Browser never talks to Pinata/IPFS directly — those hang for seconds. */

const SLOW_IPFS_HOSTS = [
  "ipfs.io",
  "gateway.pinata.cloud",
  "w3s.link",
  "dweb.link",
  "nftstorage.link",
  "cloudflare-ipfs.com",
  "cf-ipfs.com",
];

export function ipfsCid(src: string): string | null {
  const ipfs = src.match(/^ipfs:\/\/([^/?#]+)/i);
  if (ipfs) return ipfs[1] || null;
  try {
    const u = new URL(src);
    const parts = u.pathname.split("/ipfs/");
    if (parts.length > 1) return (parts[1] || "").split("/")[0] || null;
  } catch {
    /* not a url */
  }
  if (/^[A-Za-z0-9]{46,}$/.test(src)) return src;
  return null;
}

function dedicatedPinata(): string {
  const raw = (typeof process !== "undefined" && process.env.PINATA_GATEWAY ? process.env.PINATA_GATEWAY : "").trim();
  if (!raw) return "";
  const base = raw.replace(/\/$/, "");
  if (/gateway\.pinata\.cloud\/ipfs$/i.test(base)) return "";
  return base;
}

export function cidGateways(cid: string): string[] {
  const out: string[] = [];
  const dedicated = dedicatedPinata();
  if (dedicated) out.push(`${dedicated}/${cid}`);
  out.push(`https://pump.mypinata.cloud/ipfs/${cid}`);
  out.push(`https://4everland.io/ipfs/${cid}`);
  out.push(`https://gateway.pinata.cloud/ipfs/${cid}`);
  return unique(out);
}

function unique(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function slowIpfsHost(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return SLOW_IPFS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function rewriteImageUrl(src?: string): string {
  if (!src) return "";
  const s = src.trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:") || s.startsWith("/")) return s;
  const cid = ipfsCid(s);
  if (cid) return cidGateways(cid)[0]!;
  return s;
}

/** Fast hosts first. Never lead with ipfs.io / public Pinata — those 403 or take ~7s. */
export function artCandidates(src?: string, mint?: string): string[] {
  const out: string[] = [];
  const raw = (src || "").trim();
  if (!raw && !(mint && mint.length >= 32)) return [];
  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("/")) return [raw];
  const cid = raw ? ipfsCid(raw) : null;
  if (cid) {
    for (const g of cidGateways(cid)) out.push(g);
  }
  if (raw.startsWith("https:")) {
    if (slowIpfsHost(raw) || cid) {
      if (!out.includes(raw)) out.push(raw);
    } else {
      out.unshift(raw);
    }
  }
  if (mint && mint.length >= 32) {
    const dex = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
    if (!out.includes(dex)) out.push(dex);
  }
  return unique(out);
}

/** Same-origin so the list is one cached request per token, not 4 hanging gateways. */
export function displayArtSrc(src?: string, mint?: string): string {
  const raw = (src || "").trim();
  if (!raw && !(mint && mint.length >= 32)) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("/api/token-art") || raw.startsWith("/api/media")) return raw;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  const q = new URLSearchParams();
  if (mint && mint.length >= 32) q.set("m", mint);
  if (raw && raw.length < 1500 && /^https:\/\//i.test(raw)) q.set("u", raw);
  if (![...q.keys()].length) return "";
  return `/api/token-art?${q.toString()}`;
}

const FETCH_HEADERS = {
  accept: "image/avif,image/webp,image/*,*/*;q=0.8",
  "user-agent": "Solphia/1.0 (+https://solphia.io)",
};

export type ArtBytes = { body: Uint8Array; mime: string; url: string };

const wonUrl = new Map<string, string>();

function artKey(urls: string[]): string {
  return urls.join("\n");
}

export async function fetchFirstImage(urls: string[], timeoutMs = 2200): Promise<ArtBytes | null> {
  const list = urls.filter((u) => /^https:\/\//i.test(u)).slice(0, 5);
  if (!list.length) return null;
  const key = artKey(list);
  const remembered = wonUrl.get(key);
  const order = remembered ? [remembered, ...list.filter((u) => u !== remembered)] : list;

  const ctrls = order.map(() => new AbortController());
  return new Promise((resolve) => {
    let left = order.length;
    let done = false;
    const finish = (v: ArtBytes | null) => {
      if (done) return;
      done = true;
      for (const c of ctrls) c.abort();
      resolve(v);
    };
    order.forEach((u, i) => {
      const timer = setTimeout(() => ctrls[i]!.abort(), timeoutMs);
      fetch(u, {
        signal: ctrls[i]!.signal,
        headers: FETCH_HEADERS,
        redirect: "follow",
        cache: "force-cache",
      })
        .then(async (r) => {
          if (!r.ok) throw new Error("no");
          const mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0]!.trim().toLowerCase();
          if (!mime.startsWith("image/") || mime.includes("svg")) throw new Error("no");
          const buf = new Uint8Array(await r.arrayBuffer());
          if (buf.byteLength < 32 || buf.byteLength > 2_500_000) throw new Error("no");
          wonUrl.set(key, u);
          finish({ body: buf, mime, url: u });
        })
        .catch(() => {
          left -= 1;
          if (left <= 0) finish(null);
        })
        .finally(() => clearTimeout(timer));
    });
  });
}

export function artCacheHeaders(hit: boolean): Record<string, string> {
  const ttl = hit ? 604800 : 60;
  const swr = hit ? 604800 : 120;
  const value = `public, max-age=${hit ? 3600 : 30}, s-maxage=${ttl}, stale-while-revalidate=${swr}`;
  return {
    "cache-control": value,
    "cdn-cache-control": value,
    "vercel-cdn-cache-control": value,
  };
}
