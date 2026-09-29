"use client";

import { useEffect, useMemo, useState } from "react";
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
  useEffect(() => {
    setI(0);
  }, [urls]);
  const href = urls[i] || "";
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
          fetchPriority={eager ? "high" : "low"}
          onError={() => setI((n) => n + 1)}
          className="relative z-[1] h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}
