"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./WalletConnect";

const LINKS = [
  ["/", "Home"],
  ["/terminal", "Trade"],
  ["/auto", "Auto"],
  ["/pricing", "Pricing"],
  ["/faq", "FAQ"],
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="relative z-30 flex items-center justify-between gap-4 px-5 py-5 md:px-12">
      <Link href="/" className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-acid shadow-[0_0_14px_#14F195]" />
        <span className="solphia-flow font-display text-2xl font-bold tracking-tight">SOLPHIA</span>
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
      <div className="flex items-center gap-3">
        <Link href="/auto" className="btn-acid hidden min-h-[44px] rounded-full px-5 py-2 text-sm sm:inline-flex sm:items-center">
          Get started
        </Link>
        <WalletConnect compact />
      </div>
    </header>
  );
}
