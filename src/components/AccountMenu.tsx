"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CircleUser, Gift, Rocket, Users } from "lucide-react";
import { useOwner } from "@/lib/hooks";
import { CartoonPfp } from "./CartoonPfp";
import { PhantomMark } from "./PhantomMark";
import { WalletConnect, switchPhantom } from "./WalletConnect";

type Desk = { pfp?: string; username?: string };

const LINKS = [
  { href: "/account", label: "Account", Icon: CircleUser },
  { href: "/account#launches", label: "Launched coins", Icon: Rocket },
  { href: "/account#referrals", label: "Referrals", Icon: Users },
  { href: "/circle?welcome=1", label: "Founders Circle", Icon: Gift },
];

export function AccountMenu() {
  const owner = useOwner();
  const [open, setOpen] = useState(false);
  const [desk, setDesk] = useState<Desk | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || btn.current?.contains(t)) return;
      setOpen(false);
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

  function toggle() {
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setOpen((v) => !v);
  }

  if (!owner) return <WalletConnect />;

  const menu = open && mounted && createPortal(
    <div
      ref={box}
      role="menu"
      style={{ top: pos.top, right: pos.right }}
      className="fixed z-[90] w-64 overflow-hidden rounded-2xl border border-violet/30 bg-ink/95 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-violet/20 px-3 py-3">
        <CartoonPfp seed={owner} src={desk?.pfp} className="h-11 w-11" />
        <div className="min-w-0">
          <div className="truncate font-mono text-xs text-ghost">
            {desk?.username ? `@${desk.username}` : `${owner.slice(0, 6)}…${owner.slice(-6)}`}
          </div>
          <div className="truncate font-mono text-[10px] text-mute">
            {owner.slice(0, 4)}…{owner.slice(-4)}
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
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-mute hover:bg-white/5 hover:text-ghost"
          >
            <l.Icon className="h-4 w-4 shrink-0 text-acid" />
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await switchPhantom();
            } finally {
              setBusy(false);
              setOpen(false);
            }
          }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-mute hover:bg-white/5 hover:text-ghost disabled:opacity-40"
        >
          <PhantomMark className="h-4 w-4 shrink-0 text-white" />
          {busy ? "Opening Phantom…" : "Switch wallet"}
        </button>
      </nav>
    </div>,
    document.body,
  );

  return (
    <div className="relative z-[80]">
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Account"
        className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-void/60 p-0.5 pr-2.5 hover:border-acid/40"
      >
        <CartoonPfp seed={owner} src={desk?.pfp} className="h-9 w-9" />
        <span className="hidden font-mono text-[11px] text-ghost sm:inline">
          {desk?.username ? `@${desk.username}` : `${owner.slice(0, 4)}…${owner.slice(-4)}`}
        </span>
      </button>
      {menu}
    </div>
  );
}
