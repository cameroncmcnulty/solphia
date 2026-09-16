"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const path = usePathname();
  if (path.startsWith("/admin") || path === "/shill" || path.startsWith("/shill/")) return null;
  return (
    <footer className="relative z-10 px-4 pb-10 pt-24 md:px-12">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[10px] tracking-[0.14em] text-mute/40">
        <Link href="/legal#terms" className="hover:text-mute">
          Terms
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal#privacy" className="hover:text-mute">
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal" className="hover:text-mute">
          Risk
        </Link>
      </div>
    </footer>
  );
}
