"use client";

export function SphaMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/spha-mark.png?v=2"
      alt=""
      draggable={false}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
