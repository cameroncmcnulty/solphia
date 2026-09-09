"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SphaMark } from "./SphaMark";
import { WalletConnect } from "./WalletConnect";

const LINKS = [
  ["/", "Home"],
  ["/launch", "Launch"],
  ["/trading", "Trade"],
  ["/token", "$SPHA"],
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="relative z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-12 md:py-5">
      <Link href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
        <SphaMark className="h-7 w-7" />
        <span className="solphia-flow truncate font-display text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
          SOLPHIA
        </span>
      </Link>
      <nav className="hidden items-center gap-8 lg:flex">
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`text-base ${path === href ? "text-acid" : "text-mute hover:text-ghost"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/launch"
          className="btn-acid hidden min-h-[40px] items-center rounded-full px-4 py-2 text-sm sm:inline-flex sm:min-h-[44px] sm:px-5"
        >
          LAUNCH
        </Link>
        <WalletConnect compact />
      </div>
    </header>
  );
}
