"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownUp, Home, Megaphone, Rocket, Sparkles } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/shill", label: "Shill", Icon: Megaphone },
  { href: "/launch", label: "Launch", Icon: Rocket },
  { href: "/swap", label: "Swap", Icon: ArrowDownUp },
  { href: "/token", label: "$SPHA", Icon: Sparkles },
] as const;

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0a0a0a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[58px] touch-manipulation flex-col items-center justify-center gap-0.5 pt-1 ${
                active ? "text-[#14f195]" : "text-white/40"
              }`}
            >
              {active && <span className="absolute top-0 h-[3px] w-8 rounded-full bg-acid shadow-[0_0_10px_rgba(20,241,149,0.7)]" />}
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.75} />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
