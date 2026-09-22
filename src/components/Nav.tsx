"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SphaMark } from "./SphaMark";
import { AccountMenu } from "./AccountMenu";

const LINKS = [
  ["/", "Home"],
  ["/shill", "Shill"],
  ["/launch", "Launch"],
  ["/swap", "Swap"],
  ["/token", "$SPHA"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/10 bg-[#04000a]/90 px-4 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl md:px-12 md:py-4">
      <Link href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
        <SphaMark className="h-7 w-7" />
        <span className="truncate text-[17px] font-semibold tracking-tight text-white sm:text-xl md:text-2xl">
          SOLPHIA
        </span>
      </Link>
      <nav className="hidden items-center gap-7 lg:flex">
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`text-[15px] font-medium ${path === href || (href !== "/" && path.startsWith(href)) ? "text-white" : "text-white/40 hover:text-white"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <AccountMenu />
      </div>
    </header>
  );
}
