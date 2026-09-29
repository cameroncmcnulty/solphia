"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { artCandidates, browserArtUrls, rewriteImageUrl } from "@/lib/token/art";

export { artCandidates, rewriteImageUrl };

function isPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
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
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [preferProxy, setPreferProxy] = useState(false);
  const [inView, setInView] = useState(Boolean(eager));
  const urls = useMemo(() => browserArtUrls(src, mint, { preferProxy }), [src, mint, preferProxy]);
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setPreferProxy(isPhone());
  }, []);

  useEffect(() => {
    if (eager || inView) {
      setInView(true);
      return;
    }
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, inView]);

  useEffect(() => {
    setI(0);
    setOk(false);
  }, [urls]);

  const href = inView ? urls[i] || "" : "";

  useEffect(() => {
    setOk(false);
  }, [href]);

  useEffect(() => {
    if (ok || !href) return;
    const skip = () => setI((n) => (n === i ? n + 1 : n));
    const wait = href.startsWith("/api/") ? 6000 : 2500;
    const t = window.setTimeout(() => {
      const el = imgRef.current;
      if (el && el.complete && el.naturalWidth > 1) {
        setOk(true);
        return;
      }
      skip();
    }, wait);
    return () => window.clearTimeout(t);
  }, [href, ok, i]);

  const letter = (label || "").replace(/^\$+/, "").trim().slice(0, 1).toUpperCase() || "•";

  return (
    <span ref={wrapRef} className={`relative isolate inline-block shrink-0 overflow-hidden bg-violet/25 ${className || ""}`}>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm text-ghost/75" aria-hidden>
        {letter}
      </span>
      {href ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={href}
          ref={imgRef}
          src={href}
          alt=""
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          fetchPriority={eager || preferProxy ? "high" : "low"}
          onLoad={() => {
            const el = imgRef.current;
            if (el && el.naturalWidth > 1) setOk(true);
            else setI((n) => n + 1);
          }}
          onError={() => setI((n) => n + 1)}
          className="relative z-[1] h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}
