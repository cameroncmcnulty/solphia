"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  BadgeDollarSign,
  Bot,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Palette,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  Wallet,
  X,
} from "lucide-react";
import { SphaMark } from "@/components/SphaMark";
import {
  ADMIN_GROUPS,
  adminSection,
  filterAdminNav,
  type AdminIcon,
  type AdminNavItem,
  type AdminSectionId,
} from "@/lib/admin/nav";
import { age } from "./ui";
import { useAdmin } from "./AdminProvider";

const ICONS: Record<AdminIcon, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  desk: Activity,
  traders: Bot,
  spha: BadgeDollarSign,
  launch: Rocket,
  content: Palette,
  backtest: LineChart,
  system: Settings2,
  wallets: Wallet,
};

export function AdminShell({ children }: { children: ReactNode }) {
  const { data, section, go, busy, note, noteErr, streamOn, now, patch, reload, logout } = useAdmin();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = adminSection(section);
  const jumpFirst = () => {
    const first = filterAdminNav(q)[0];
    if (!first) return;
    go(first.id);
    setQ("");
    setOpen(false);
  };

  useEffect(() => {
    setOpen(false);
  }, [section]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!data) return null;

  const p = data.paper;
  const pair = data.pair;
  const ticking = data.lastTickAt > 0 && now - data.lastTickAt < 60_000;
  const tickAge = data.lastTickAt ? age(now - data.lastTickAt) : "never";
  const session =
    pair?.session === "cash" ? "cash" : pair?.session === "weekend" ? "weekend" : pair?.session === "after_hours" ? "after hours" : "—";

  return (
    <div className="relative flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-ink/90 lg:flex">
        <Brand />
        <NavSearch q={q} setQ={setQ} onJump={jumpFirst} />
        <AdminNavList
          q={q}
          section={section}
          onGo={(id) => {
            go(id);
            setQ("");
          }}
        />
        <SidebarFooter onLogout={logout} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-void/70" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r border-line bg-ink">
            <div className="flex items-center justify-between px-4 py-4">
              <Brand compact />
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-mute hover:text-ghost" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <NavSearch q={q} setQ={setQ} onJump={jumpFirst} />
            <AdminNavList
              q={q}
              section={section}
              onGo={(id) => {
                go(id);
                setQ("");
                setOpen(false);
              }}
            />
            <SidebarFooter onLogout={logout} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-void/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6">
            <button
              type="button"
              className="rounded-full border border-line p-2 text-mute hover:text-ghost lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open admin menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] tracking-[0.24em] text-violet">ADMIN · {current.group.toUpperCase()}</p>
              <h1 className="truncate font-display text-xl text-ghost md:text-2xl">{current.label}</h1>
              <p className="hidden truncate text-xs text-mute sm:block">{current.hint}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className={`h-2 w-2 rounded-full ${streamOn || ticking ? "bg-acid shadow-[0_0_10px_#14F195]" : "bg-mute"}`} />
              <span className="hidden font-mono text-[10px] text-mute sm:inline">STREAM {streamOn ? "ON" : "POLL"}</span>
              <span className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${p.killed ? "bg-blood/20 text-blood" : "bg-acid/15 text-acid"}`}>
                {p.killed ? "STOPPED" : "PAPER"}
              </span>
              <button
                type="button"
                onClick={() => patch({ liveTrading: !data.liveTrading })}
                disabled={busy}
                className={`rounded-full px-3 py-1.5 font-mono text-[11px] ${data.liveTrading ? "bg-cyan/15 text-cyan" : "border border-line text-mute"}`}
              >
                {data.liveTrading ? "LIVE ON" : "LIVE OFF"}
              </button>
              <span className="hidden rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-cyan md:inline">
                {ticking ? "tick live" : "tick stale"} · {tickAge}
              </span>
              <span className="hidden rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-mute lg:inline">{session}</span>
              <button
                type="button"
                onClick={() => reload()}
                disabled={busy}
                className="btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
              <button type="button" onClick={logout} className="hidden rounded-full border border-line px-3 py-1.5 text-xs text-mute sm:inline">
                Log out
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 pt-4 md:px-6">
          {!data.durable && (
            <p className="mb-3 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
              Vercel /tmp wipes on every cold start. Add Upstash Redis (Storage tab) so treasury and seats survive deploys.
            </p>
          )}
          {note && (
            <p className={`mb-3 rounded-2xl border px-4 py-3 text-sm ${noteErr ? "border-blood/30 bg-blood/10 text-blood" : "border-acid/30 bg-acid/10 text-acid"}`}>
              {note}
            </p>
          )}
        </div>

        <main className="flex-1 px-4 pb-24 pt-1 md:px-6 md:pb-12">{children}</main>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? "" : "px-4 py-5"}`}>
      <SphaMark className="h-7 w-7" />
      <div className="min-w-0">
        <div className="truncate font-display text-base font-bold tracking-tight text-ghost">SOLPHIA</div>
        <div className="font-mono text-[10px] tracking-[0.22em] text-mute">ADMIN DESK</div>
      </div>
    </div>
  );
}

function NavSearch({ q, setQ, onJump }: { q: string; setQ: (v: string) => void; onJump: () => void }) {
  return (
    <label className="mx-3 mb-3 flex items-center gap-2 rounded-full border border-line bg-void px-3 py-2">
      <Search size={14} className="shrink-0 text-mute" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onJump();
          }
        }}
        placeholder="Jump to a tool…"
        className="w-full bg-transparent font-mono text-xs text-ghost outline-none placeholder:text-mute"
      />
    </label>
  );
}

function AdminNavList({
  q,
  section,
  onGo,
}: {
  q: string;
  section: string;
  onGo: (id: AdminSectionId) => void;
}) {
  const { data } = useAdmin();
  const matches = useMemo(() => filterAdminNav(q), [q]);
  const grouped = ADMIN_GROUPS.map((g) => ({
    ...g,
    items: matches.filter((n) => n.group === g.id),
  })).filter((g) => g.items.length > 0);

  return (
    <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
      {grouped.length === 0 && <p className="px-3 py-6 text-center text-xs text-mute">No tools match “{q}”.</p>}
      {grouped.map((g) => (
        <div key={g.id} className="mb-4">
          <div className="px-3 pb-1 pt-2">
            <div className="font-mono text-[10px] tracking-[0.28em] text-mute">{g.label.toUpperCase()}</div>
            {!q && <div className="text-[11px] text-mute/70">{g.blurb}</div>}
          </div>
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                active={section === item.id}
                badge={"badge" in item && item.badge ? item.badge(data!) : null}
                onClick={() => onGo(item.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavRow({
  item,
  active,
  badge,
  onClick,
}: {
  item: AdminNavItem;
  active: boolean;
  badge?: string | number | null;
  onClick: () => void;
}) {
  const Icon = ICONS[item.icon];
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
          active ? "bg-acid/15 text-acid" : "text-mute hover:bg-white/5 hover:text-ghost"
        }`}
      >
        <Icon size={16} strokeWidth={1.75} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badge != null && badge !== "" && (
          <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${active ? "bg-acid/20 text-acid" : "bg-white/5 text-mute"}`}>
            {badge}
          </span>
        )}
      </button>
    </li>
  );
}

function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="mt-auto space-y-1 border-t border-line px-3 py-3">
      <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-mute hover:bg-white/5 hover:text-ghost">
        View site
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-mute hover:bg-white/5 hover:text-ghost"
      >
        <LogOut size={14} />
        Log out
      </button>
    </div>
  );
}
