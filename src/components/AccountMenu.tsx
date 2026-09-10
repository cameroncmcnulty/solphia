"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useOwner } from "@/lib/hooks";
import { CartoonPfp } from "./CartoonPfp";
import { WalletConnect } from "./WalletConnect";

type Desk = { pfp?: string; referralRewardsSol?: number; referredCount?: number };

const LINKS = [
  { href: "/account", label: "Account" },
  { href: "/account#wallets", label: "Trading wallets" },
  { href: "/account#pfp", label: "Change PFP" },
  { href: "/account#launches", label: "Launched coins" },
  { href: "/account#referrals", label: "Referrals" },
];

export function AccountMenu() {
  const owner = useOwner();
  const [open, setOpen] = useState(false);
  const [desk, setDesk] = useState<Desk | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!owner) {
      setDesk(null);
      return;
    }
    fetch(`/api/account?pubkey=${encodeURIComponent(owner)}`)
      .then((r) => r.json())
      .then((j) => setDesk(j))
      .catch(() => {});
  }, [owner]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!owner) return <WalletConnect compact />;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Account"
        className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-void/60 p-0.5 pr-2.5 hover:border-acid/40"
      >
        <CartoonPfp seed={owner} src={desk?.pfp} className="h-9 w-9" />
        <span className="hidden font-mono text-[11px] text-ghost sm:inline">
          {owner.slice(0, 4)}…{owner.slice(-4)}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-violet/30 bg-ink/95 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur"
        >
          <div className="flex items-center gap-3 border-b border-violet/20 px-3 py-3">
            <CartoonPfp seed={owner} src={desk?.pfp} className="h-11 w-11" />
            <div className="min-w-0">
              <div className="truncate font-mono text-xs text-ghost">
                {owner.slice(0, 6)}…{owner.slice(-6)}
              </div>
              <div className="font-mono text-[10px] text-mute">
                {desk?.referredCount || 0} invited · {(desk?.referralRewardsSol || 0).toFixed(4)} SOL
              </div>
            </div>
          </div>
          <nav className="py-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  if (l.href.includes("#")) queueMicrotask(() => window.dispatchEvent(new Event("hashchange")));
                }}
                className="block px-4 py-2.5 text-sm text-mute hover:bg-white/5 hover:text-ghost"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-violet/20 px-3 py-2">
            <WalletConnect compact />
          </div>
        </div>
      )}
    </div>
  );
}
