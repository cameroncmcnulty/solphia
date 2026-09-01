"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./WalletConnect";

const LINKS = [
  ["/", "ORIGIN"],
  ["/terminal", "TERMINAL"],
  ["/copy", "COPY"],
  ["/sniper", "SNIPER"],
  ["/migrate", "MIGRATE"],
  ["/alerts", "ALERTS"],
  ["/subscribe", "0.15 SOL"],
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="relative z-30 flex items-center justify-between gap-4 px-5 py-4 md:px-8">
      <Link href="/" className="font-display text-xl tracking-[0.35em] text-ghost">
        SOLPHIA
      </Link>
      <nav className="hidden items-center gap-5 md:flex">
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`font-mono text-[10px] tracking-[0.28em] ${path === href ? "text-acid" : "text-mute hover:text-cyan"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <WalletConnect compact />
    </header>
  );
}
