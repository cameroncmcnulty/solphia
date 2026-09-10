"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SphaMark } from "./SphaMark";
import { AccountMenu } from "./AccountMenu";
import { WalletConnect } from "./WalletConnect";
import { useOwner } from "@/lib/hooks";

const LINKS = [
  ["/", "Home"],
  ["/launch", "Launch"],
  ["/trading", "Trade"],
  ["/token", "$SPHA"],
];

export function Nav() {
  const path = usePathname();
  const owner = useOwner();
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-violet/20 bg-void/80 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl md:px-12 md:py-5">
      <Link href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
        <SphaMark className="h-7 w-7" />
        <span className="solphia-flow truncate font-display text-base font-bold tracking-tight sm:text-xl md:text-2xl">
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
        <div className="md:hidden">{!owner ? <WalletConnect compact /> : null}</div>
        <div className="hidden md:block">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
