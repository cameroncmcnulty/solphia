"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SphaMark } from "./SphaMark";
import { AccountMenu } from "./AccountMenu";
import { ToolsSheet } from "./ToolsSheet";

const LINKS = [
  ["/", "Home"],
  ["/shill", "Shill"],
  ["/token", "$SPHA"],
] as const;

const TOOLS = ["/trading", "/launch", "/swap"];

export function Nav() {
  const path = usePathname();
  const [tools, setTools] = useState(false);
  const toolsOn = TOOLS.some((h) => path === h || path.startsWith(h + "/"));
  return (
    <>
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
              className={`text-base ${path === href || (href !== "/" && path.startsWith(href)) ? "text-acid" : "text-mute hover:text-ghost"}`}
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setTools(true)}
            className={`text-base ${toolsOn ? "text-acid" : "text-mute hover:text-ghost"}`}
          >
            Tools
          </button>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <AccountMenu />
        </div>
      </header>
      <ToolsSheet open={tools} onClose={() => setTools(false)} />
    </>
  );
}
