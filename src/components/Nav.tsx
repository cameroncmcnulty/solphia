"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./WalletConnect";

const LINKS = [
  ["/", "Home"],
  ["/terminal", "Terminal"],
  ["/copy", "Copy"],
  ["/auto", "Auto"],
  ["/pricing", "Pricing"],
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="relative z-30 flex items-center justify-between gap-4 border-b border-violet/20 px-5 py-4 md:px-8">
      <Link href="/" className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-acid shadow-[0_0_12px_#14F195]" />
        <span className="font-display text-lg tracking-[0.32em] text-ghost">SOLPHIA</span>
      </Link>
      <nav className="hidden items-center gap-6 lg:flex">
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`font-mono text-[11px] tracking-[0.22em] ${
              path === href ? "text-acid" : "text-mute hover:text-ghost"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <WalletConnect compact />
    </header>
  );
}
