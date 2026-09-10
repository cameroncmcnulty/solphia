"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CircleUser, Home, Rocket, Sparkles } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/launch", label: "Launch", Icon: Rocket },
  { href: "/trading", label: "Trade", Icon: Activity },
  { href: "/token", label: "$SPHA", Icon: Sparkles },
  { href: "/account", label: "You", Icon: CircleUser },
] as const;

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-violet/30 bg-void/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[58px] touch-manipulation flex-col items-center justify-center gap-0.5 pt-1 ${
                active ? "text-acid" : "text-mute"
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
