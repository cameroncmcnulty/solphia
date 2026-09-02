"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./WalletConnect";

const LINKS = [
  ["/", "Home"],
  ["/trading", "Launch"],
  ["/pricing", "Pricing"],
  ["/faq", "FAQ"],
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="relative z-30 flex items-center justify-between gap-2 px-4 py-3 md:gap-4 md:px-12 md:py-5">
      <Link href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-acid shadow-[0_0_14px_#14F195]" />
        <span className="solphia-flow font-display text-xl font-bold tracking-tight md:text-2xl">SOLPHIA</span>
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
          href="/trading"
          className="btn-acid inline-flex min-h-[40px] items-center rounded-full px-3 py-2 text-[11px] sm:min-h-[44px] sm:px-5 sm:text-sm"
        >
          LAUNCH BOT
        </Link>
        <WalletConnect compact />
      </div>
    </header>
  );
}
