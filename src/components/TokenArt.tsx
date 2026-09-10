"use client";

import { useEffect, useState } from "react";

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

export function rewriteImageUrl(src?: string): string {
  if (!src) return "";
  const s = src.trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:") || s.startsWith("/")) return s;
  const cid = ipfsCid(s);
  if (cid) return `https://pump.mypinata.cloud/ipfs/${cid}`;
  return s;
}

function proxyUrl(src: string): string {
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) return src;
  return `/api/media?u=${encodeURIComponent(src)}`;
}

/** Letter stays up until the remote art actually paints. Direct URL first so 48 rows do not stampede the proxy. */
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
  const direct = rewriteImageUrl(src);
  const dex = mint ? `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png` : "";
  const [mode, setMode] = useState<"direct" | "proxy" | "dex" | "off">(direct ? "direct" : dex ? "dex" : "off");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setMode(direct ? "direct" : dex ? "dex" : "off");
    setShown(false);
  }, [direct, dex]);

  const letter = (label || "").replace(/^\$+/, "").trim().slice(0, 1).toUpperCase() || "•";
  const href = mode === "direct" ? direct : mode === "proxy" && direct ? proxyUrl(direct) : mode === "dex" ? dex : "";

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
            if (mode === "direct" && direct.startsWith("https:")) setMode("proxy");
            else if (mode !== "dex" && dex) setMode("dex");
            else setMode("off");
          }}
          className={`relative z-[1] h-full w-full object-cover transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </span>
  );
}
