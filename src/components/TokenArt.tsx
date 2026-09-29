"use client";

import { useEffect, useMemo, useState } from "react";
import { artCandidates, displayArtSrc, rewriteImageUrl } from "@/lib/token/art";

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
  const href = useMemo(() => displayArtSrc(src, mint), [src, mint]);
  const [shown, setShown] = useState(false);
  const [dead, setDead] = useState(false);
  useEffect(() => {
    setShown(false);
    setDead(false);
  }, [href]);
  const letter = (label || "").replace(/^\$+/, "").trim().slice(0, 1).toUpperCase() || "•";

  return (
    <span className={`relative isolate inline-block shrink-0 overflow-hidden bg-violet/25 ${className || ""}`}>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm text-ghost/75" aria-hidden>
        {letter}
      </span>
      {href && !dead ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={href}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
          onLoad={() => setShown(true)}
          onError={() => setDead(true)}
          className={`relative z-[1] h-full w-full object-cover ${shown ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </span>
  );
}
