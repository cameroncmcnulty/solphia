"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CircleUser, Gift, Rocket, Users, Wallet } from "lucide-react";
import { useOwner } from "@/lib/hooks";
import { CartoonPfp } from "./CartoonPfp";
import { WalletConnect } from "./WalletConnect";
import { openAccountGate, openWalletOnboard, openWalletSwitcher } from "./wallet/WalletHost";
import { useActiveWallet } from "@/lib/wallet/useVault";
import { logoutAccount, peekAccount, refreshAccount, AUTH_EVENT } from "@/lib/auth/client";

type Desk = { pfp?: string; username?: string };

const LINKS = [
  { href: "/wallet", label: "Wallet", Icon: Wallet },
  { href: "/account", label: "Account", Icon: CircleUser },
  { href: "/account#launches", label: "Launched coins", Icon: Rocket },
  { href: "/account#referrals", label: "Referrals", Icon: Users },
  { href: "/circle?welcome=1", label: "Founders Circle", Icon: Gift },
];

export function AccountMenu() {
  const owner = useOwner();
  const vault = useActiveWallet();
  const [open, setOpen] = useState(false);
  const [desk, setDesk] = useState<Desk | null>(null);
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(() => Boolean(peekAccount()?.id));
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => {
      const a = peekAccount();
      setEmail(a?.email || "");
      setSignedIn(Boolean(a?.id));
    };
    sync();
    void refreshAccount().then((a) => {
      setEmail(a?.email || "");
      setSignedIn(Boolean(a?.id));
    });
    window.addEventListener(AUTH_EVENT, sync);
    return () => window.removeEventListener(AUTH_EVENT, sync);
  }, []);

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
    if (r) {
      const nav = 58;
      const menuH = 380;
      const vv = window.visualViewport?.height || window.innerHeight;
      let top = r.bottom + 8;
      if (top + menuH > vv - nav) top = Math.max(8, r.top - menuH - 8);
      setPos({ top, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((v) => !v);
  }

  if (!signedIn) return <WalletConnect />;

  const seed = owner || email || "account";
  const nickname = desk?.username
    ? `@${desk.username}`
    : vault?.nickname || (owner ? `${owner.slice(0, 4)}…${owner.slice(-4)}` : email || "Account");

  const menu = open && mounted && createPortal(
    <div
      ref={box}
      role="menu"
      style={{ top: pos.top, right: pos.right }}
      className="fixed z-[90] w-64 overflow-hidden rounded-2xl border border-violet/30 bg-ink/95 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 border-b border-violet/20 px-3 py-3">
        <CartoonPfp seed={seed} src={desk?.pfp} className="h-11 w-11" />
        <div className="min-w-0">
          <div className="truncate font-mono text-xs text-ghost">{nickname}</div>
          <div className="truncate font-mono text-[10px] text-mute">
            {email || (owner ? `${owner.slice(0, 4)}…${owner.slice(-4)}` : "Signed in")}
            {vault?.kind === "embedded" ? " · Solphia" : ""}
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
          onClick={() => {
            setOpen(false);
            openWalletSwitcher();
          }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-mute hover:bg-white/5 hover:text-ghost"
        >
          <Wallet className="h-4 w-4 shrink-0 text-acid" />
          Switch wallet
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            openWalletOnboard();
          }}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-mute hover:bg-white/5 hover:text-ghost"
        >
          <Wallet className="h-4 w-4 shrink-0 text-acid" />
          Add wallet
        </button>
        {signedIn ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logoutAccount();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-mute hover:bg-white/5 hover:text-ghost"
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openAccountGate();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-mute hover:bg-white/5 hover:text-ghost"
          >
            Sign in
          </button>
        )}
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
        <CartoonPfp seed={seed} src={desk?.pfp} className="h-9 w-9" />
        <span className="hidden max-w-[7rem] truncate font-mono text-[11px] text-ghost sm:inline">{nickname}</span>
      </button>
      {menu}
    </div>
  );
}
