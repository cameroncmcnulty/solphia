"use client";

export function SphaMark({ className = "h-7 w-7", float = true }: { className?: string; float?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/spha-mark.png?v=2"
      alt=""
      draggable={false}
      className={`${float ? "mark-float " : ""}shrink-0 object-contain ${className}`}
    />
  );
}
