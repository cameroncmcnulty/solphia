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

function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function slowIpfsHost(raw: string): boolean {
  const host = hostOf(raw);
  return SLOW_IPFS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** Browser never waits on these — they 403 or hang. Proxy still tries them. */
function skipBrowserHost(raw: string, aggressive = false): boolean {
  const host = hostOf(raw);
  if (!host) return true;
  if (slowIpfsHost(raw)) return true;
  if (host === "4everland.io" || host.endsWith(".4everland.io")) return true;
  if (host === "gmgn.ai" || host.endsWith(".gmgn.ai")) return true;
  if (aggressive) {
    if (host === "pbs.twimg.com" || host.endsWith(".twimg.com")) return true;
    if (host.includes("axiom")) return true;
    if (host === "usepaid.app" || host.endsWith(".usepaid.app")) return true;
  }
  return false;
}

function mintFallbacks(mint: string): string[] {
  return [
    `https://images.pump.fun/coin-image/${mint}?variant=600x600`,
    `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`,
    `https://cdn.dexscreener.com/ds-data/tokens/solana/${mint}.png`,
  ];
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
    for (const u of mintFallbacks(mint)) if (!out.includes(u)) out.push(u);
  }
  return unique(out);
}

export function unwrapArtSrc(src?: string): { src: string; mint?: string } {
  const raw = (src || "").trim();
  if (!raw.startsWith("/api/token-art") && !raw.startsWith("/api/media")) return { src: raw };
  try {
    const u = new URL(raw, "https://solphia.io");
    return {
      src: u.searchParams.get("u") || "",
      mint: u.searchParams.get("m") || u.searchParams.get("mint") || undefined,
    };
  } catch {
    return { src: raw };
  }
}

/** Same-origin fallback for hosts that hotlink-block. Not the first src — 80 lambdas stall the list. */
export function displayArtSrc(src?: string, mint?: string): string {
  const got = unwrapArtSrc(src);
  const raw = got.src;
  const m = mint || got.mint;
  if (!raw && !(m && m.length >= 32)) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("/") && !raw.startsWith("/api/") && !raw.startsWith("//")) return raw;
  const q = new URLSearchParams();
  if (m && m.length >= 32) q.set("m", m);
  if (raw && raw.length < 1500 && /^https:\/\//i.test(raw)) q.set("u", raw);
  if (![...q.keys()].length) return "";
  return `/api/token-art?${q.toString()}`;
}

/** JSON/img src: IPFS becomes pump.mypinata. Never our proxy. */
export function publicImage(src?: string): string {
  const raw = unwrapArtSrc(src).src || (src || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  return rewriteImageUrl(raw) || raw;
}

/** What the <img> should actually request. Fast public hosts, then our proxy — never hang on ipfs.io.
 *  Mobile WebKit hotlink-blocks twitter/axiom; preferProxy puts same-origin `/api/token-art` first. */
export function browserArtUrls(src?: string, mint?: string, opts?: { preferProxy?: boolean }): string[] {
  const got = unwrapArtSrc(src);
  const raw = got.src;
  const m = mint && mint.length >= 32 ? mint : got.mint;
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return [raw];
  if (raw.startsWith("/") && !raw.startsWith("/api/") && !raw.startsWith("//")) return [raw];
  const all = artCandidates(raw, m).filter((u) => u.startsWith("https:") && !skipBrowserHost(u, Boolean(opts?.preferProxy)));
  const primary = all.filter((u) => !/dexscreener\.com/i.test(u));
  const dex = all.filter((u) => /dexscreener\.com/i.test(u));
  const proxy = displayArtSrc(raw, m);
  if (opts?.preferProxy && proxy.startsWith("/api/")) {
    return unique([proxy, ...primary, ...dex]);
  }
  const out = [...primary];
  if (proxy.startsWith("/api/") && !out.includes(proxy)) out.push(proxy);
  for (const u of dex) if (!out.includes(u)) out.push(u);
  return unique(out);
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

function sniffMime(buf: Uint8Array, declared: string): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  const head = new TextDecoder().decode(buf.slice(0, 80)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
  const mime = declared.split(";")[0]!.trim().toLowerCase();
  if (mime.startsWith("image/") && mime !== "image/svg+xml") return mime;
  return null;
}

export async function fetchFirstImage(urls: string[], timeoutMs = 2200): Promise<ArtBytes | null> {
  const list = urls.filter((u) => /^https:\/\//i.test(u)).slice(0, 6);
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
        cache: "no-store",
      })
        .then(async (r) => {
          if (!r.ok) throw new Error("no");
          const declared = (r.headers.get("content-type") || "").split(";")[0]!.trim().toLowerCase();
          const buf = new Uint8Array(await r.arrayBuffer());
          if (buf.byteLength < 32 || buf.byteLength > 3_000_000) throw new Error("no");
          const mime = sniffMime(buf, declared);
          if (!mime) throw new Error("no");
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
  if (!hit) {
    return {
      "cache-control": "no-store",
      "cdn-cache-control": "no-store",
      "vercel-cdn-cache-control": "no-store",
    };
  }
  const value = "public, max-age=3600, s-maxage=604800, stale-while-revalidate=604800";
  return {
    "cache-control": value,
    "cdn-cache-control": value,
    "vercel-cdn-cache-control": value,
  };
}
