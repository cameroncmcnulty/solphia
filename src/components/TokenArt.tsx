"use client";

import { useEffect, useMemo, useState } from "react";

function ipfsCid(src: string): string | null {
  const ipfs = src.match(/^ipfs:\/\/([^/?#]+)/i);
  if (ipfs) return ipfs[1];
  try {
    const u = new URL(src);
    const parts = u.pathname.split("/ipfs/");
    if (parts.length > 1) return parts[1].split("/")[0] || null;
  } catch {
    /* not a url */
  }
  if (/^[A-Za-z0-9]{46,}$/.test(src)) return src;
  return null;
}

function cidGateways(cid: string): string[] {
  return [`https://gateway.pinata.cloud/ipfs/${cid}`, `https://w3s.link/ipfs/${cid}`, `https://ipfs.io/ipfs/${cid}`];
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

/** Original URL first. Race IPFS mirrors + Dexscreener — never wait on a dead gateway. */
export function artCandidates(src?: string, mint?: string): string[] {
  const out: string[] = [];
  const raw = (src || "").trim();
  if (!raw && !(mint && mint.length >= 32)) return [];
  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("/")) return [raw];
  const cid = raw ? ipfsCid(raw) : null;
  if (raw.startsWith("https:")) out.push(raw);
  if (cid) {
    for (const g of cidGateways(cid)) if (!out.includes(g)) out.push(g);
  }
  if (mint && mint.length >= 32) {
    const dex = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
    if (!out.includes(dex)) out.push(dex);
  }
  return out;
}

const won = new Map<string, string>();

function race(urls: string[]): Promise<string> {
  const key = urls.join("\n");
  const hit = won.get(key);
  if (hit) return Promise.resolve(hit);
  if (urls.length === 1) {
    won.set(key, urls[0]!);
    return Promise.resolve(urls[0]!);
  }
  if (!urls.length) return Promise.resolve("");
  return new Promise((resolve) => {
    let left = urls.length;
    let done = false;
    const finish = (u: string) => {
      if (done) return;
      done = true;
      if (u) won.set(key, u);
      resolve(u);
    };
    for (const u of urls) {
      const img = new Image();
      img.onload = () => finish(u);
      img.onerror = () => {
        left -= 1;
        if (left <= 0) finish("");
      };
      img.src = u;
    }
    window.setTimeout(() => finish(urls[0] || ""), 1800);
  });
}

export function TokenArt({
  src,
  mint,
  label,
  className,
  eager,
}: {
  src?: string;
  mint?: string;
  label?: string;
  className?: string;
  eager?: boolean;
}) {
  const urls = useMemo(() => artCandidates(src, mint), [src, mint]);
  const [href, setHref] = useState(urls[0] || "");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let stop = false;
    setShown(false);
    const cached = won.get(urls.join("\n"));
    setHref(cached || urls[0] || "");
    if (cached || urls.length <= 1) return;
    void race(urls).then((u) => {
      if (!stop && u) setHref(u);
    });
    return () => {
      stop = true;
    };
  }, [urls]);

  const letter = (label || "").replace(/^\$+/, "").trim().slice(0, 1).toUpperCase() || "•";

  return (
    <span className={`relative isolate inline-block shrink-0 overflow-hidden bg-violet/25 ${className || ""}`}>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm text-ghost/75" aria-hidden>
        {letter}
      </span>
      {href ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={href}
          alt=""
          referrerPolicy="no-referrer"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setShown(true)}
          onError={() => {
            const next = urls[urls.indexOf(href) + 1];
            if (next) setHref(next);
          }}
          className={`relative z-[1] h-full w-full object-cover ${shown ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </span>
  );
}
