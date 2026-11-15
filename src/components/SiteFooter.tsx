"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isReservedV3Host, v3HostFromHeader } from "@/lib/tools/v3/host";

export function SiteFooter() {
  const path = usePathname();
  if (path.startsWith("/admin") || path === "/shill" || path.startsWith("/shill/")) return null;
  if (path === "/m" || path.startsWith("/m/")) return null;
  if (typeof window !== "undefined") {
    const sub = v3HostFromHeader(window.location.host);
    if (sub && !isReservedV3Host(sub) && !sub.includes(".")) return null;
  }
  return (
    <footer className="relative z-10 px-4 pb-10 pt-16 md:px-12">
      <div className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/30">
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
