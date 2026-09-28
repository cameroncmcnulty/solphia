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
  return [`https://w3s.link/ipfs/${cid}`, `https://gateway.pinata.cloud/ipfs/${cid}`, `https://ipfs.io/ipfs/${cid}`];
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

function candidates(src?: string, mint?: string): string[] {
  const out: string[] = [];
  const cid = src ? ipfsCid(src) : null;
  if (mint && mint.length >= 32) out.push(`https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`);
  if (cid) out.push(...cidGateways(cid));
  else {
    const raw = rewriteImageUrl(src);
    if (raw.startsWith("https:") || raw.startsWith("data:") || raw.startsWith("/") || raw.startsWith("blob:")) out.push(raw);
  }
  return [...new Set(out.filter(Boolean))];
}

/** Letter stays up until a candidate actually paints. Dexscreener first, 2.5s watchdog per URL. */
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
  const urls = useMemo(() => candidates(src, mint), [src, mint]);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setI(0);
    setShown(false);
  }, [urls]);

  useEffect(() => {
    if (shown || i >= urls.length) return;
    const t = window.setTimeout(() => setI((n) => n + 1), 2500);
    return () => window.clearTimeout(t);
  }, [i, shown, urls.length]);

  const letter = (label || "").replace(/^\$+/, "").trim().slice(0, 1).toUpperCase() || "•";
  const href = urls[i] || "";

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
          onError={() => setI((n) => n + 1)}
          className={`relative z-[1] h-full w-full object-cover transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </span>
  );
}
