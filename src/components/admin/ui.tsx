import type { ReactNode } from "react";
import type { AdminDesk } from "@/lib/admin/types";

export function mergeDesk(prev: AdminDesk | null, next: AdminDesk): AdminDesk {
  if (!prev) return next;
  const prevMax = prev.promos.reduce((m, p) => Math.max(m, p.at), 0);
  const nextMax = next.promos.reduce((m, p) => Math.max(m, p.at), 0);
  const promos = (prevMax > nextMax ? prev.promos : next.promos).map((p) => {
    const older = prev.promos.find((x) => x.id === p.id);
    return { ...p, dataUrl: p.dataUrl || older?.dataUrl };
  });
  return {
    ...next,
    promos,
    backtest: next.backtest || prev.backtest,
    backtestLev2: next.backtestLev2 || prev.backtestLev2,
    backtestLev3: next.backtestLev3 || prev.backtestLev3,
  };
}

export function Stat({ k, v, sub, good }: { k: string; v: string; sub: string; good?: boolean }) {
  return (
    <div className="panel rounded-2xl p-4">
      <div className="font-mono text-[10px] tracking-[0.3em] text-mute">{k}</div>
      <div className={`mt-1 font-display text-2xl md:text-3xl ${good === false ? "text-blood" : "text-ghost"}`}>{v}</div>
      <div className="font-mono text-[10px] text-mute">{sub}</div>
    </div>
  );
}

export function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-line bg-void/40 px-4 py-3">
      <div className="font-mono text-[10px] tracking-[0.2em] text-mute">{k}</div>
      <div className="mt-1 font-display text-xl text-ghost">{v}</div>
    </div>
  );
}

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-mute">{k}</span>
      <span className="text-ghost">{v}</span>
    </div>
  );
}

export function Panel({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <section className="panel rounded-2xl p-5">
      <div className="font-mono text-[10px] tracking-[0.3em] text-mute">{kicker}</div>
      {children}
    </section>
  );
}

export function money(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
  return `$${abs.toFixed(2)}`;
}

export function fmtQty(n: number, id: string) {
  if (!n) return "0";
  if (id === "USDC") return money(n);
  if (n >= 100) return n.toFixed(2);
  return n.toFixed(4);
}

export function num(n?: number) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

export function age(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export function shortPk(pk: string, n = 4) {
  if (!pk || pk.length < n * 2) return pk || "—";
  return `${pk.slice(0, n)}…${pk.slice(-n)}`;
}

export function tapeLabel(action: string) {
  if (action === "trade" || action === "buy" || action === "sell") return "TRADED";
  if (action === "deploy") return "BOUGHT";
  if (action === "flatten" || action === "kill") return "STOPPED";
  if (action === "skip") return "WAITING";
  if (action === "hold") return "HOLD";
  return action.toUpperCase();
}

export function Field({
  value,
  onChange,
  placeholder,
  className = "",
  error,
  field,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  field?: string;
}) {
  return (
    <input
      data-field={field}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-full border bg-void px-4 py-3 font-mono text-xs outline-none ${
        error ? "border-blood ring-1 ring-blood/60" : "border-violet/30"
      } ${className}`}
    />
  );
}
