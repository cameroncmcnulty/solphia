"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { artCandidates, browserArtUrls, rewriteImageUrl } from "@/lib/token/art";

export { artCandidates, rewriteImageUrl };

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
  const urls = useMemo(() => browserArtUrls(src, mint), [src, mint]);
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    setI(0);
    setOk(false);
  }, [urls]);
  const href = urls[i] || "";
  useEffect(() => {
    setOk(false);
  }, [href]);
  useEffect(() => {
    if (ok || !href || i >= urls.length - 1) return;
    const el = imgRef.current;
    if (!el) return;
    let t: number | undefined;
    const skip = () => setI((n) => (n === i ? n + 1 : n));
    const arm = () => {
      if (t != null) return;
      t = window.setTimeout(skip, 4000);
    };
    if (el.complete) {
      if (el.naturalWidth > 0) {
        setOk(true);
        return;
      }
      skip();
      return;
    }
    el.addEventListener("loadstart", arm);
    if (el.currentSrc) arm();
    return () => {
      el.removeEventListener("loadstart", arm);
      if (t != null) window.clearTimeout(t);
    };
  }, [href, ok, i, urls.length]);
  const letter = (label || "").replace(/^\$+/, "").trim().slice(0, 1).toUpperCase() || "•";

  return (
    <span className={`relative isolate inline-block shrink-0 overflow-hidden bg-violet/25 ${className || ""}`}>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm text-ghost/75" aria-hidden>
        {letter}
      </span>
      {href ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={href}
          alt=""
          referrerPolicy="no-referrer"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
          onLoad={() => setOk(true)}
          onError={() => setI((n) => n + 1)}
          className="relative z-[1] h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}
