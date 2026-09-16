"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CircleUser, Home, Rocket, Sparkles } from "lucide-react";
import { ToolsSheet } from "./ToolsSheet";

export function BottomNav() {
  const path = usePathname();
  const [tools, setTools] = useState(false);
  const toolsOn = ["/trading", "/launch", "/swap"].some((h) => path === h || path.startsWith(h + "/"));
  const tabs = [
    { href: "/", label: "Home", Icon: Home },
    { href: "/shill", label: "Shill", Icon: Rocket },
    { href: "tools", label: "Tools", Icon: Activity },
    { href: "/token", label: "$SPHA", Icon: Sparkles },
    { href: "/account", label: "You", Icon: CircleUser },
  ] as const;
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-violet/30 bg-[#17212b]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {tabs.map(({ href, label, Icon }) => {
            const active = href === "tools" ? toolsOn : href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
            if (href === "tools") {
              return (
                <button
                  key="tools"
                  type="button"
                  onClick={() => setTools(true)}
                  className={`relative flex min-h-[58px] touch-manipulation flex-col items-center justify-center gap-0.5 pt-1 ${
                    active ? "text-acid" : "text-mute"
                  }`}
                >
                  {active && <span className="absolute top-0 h-[3px] w-8 rounded-full bg-acid shadow-[0_0_10px_rgba(20,241,149,0.7)]" />}
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.75} />
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                </button>
              );
            }
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
      <ToolsSheet open={tools} onClose={() => setTools(false)} />
    </>
  );
}
