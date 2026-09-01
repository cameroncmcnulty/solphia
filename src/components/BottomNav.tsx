"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/", "Home"],
  ["/terminal", "Trade"],
  ["/copy", "Copy"],
  ["/auto", "Auto"],
  ["/dev", "Dev"],
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-violet/30 bg-void/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {TABS.map(([href, label]) => {
          const active = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[52px] items-center justify-center font-mono text-[10px] tracking-[0.18em] ${
                active ? "text-acid" : "text-mute"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
