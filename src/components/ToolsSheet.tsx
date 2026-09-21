"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowDownUp, Rocket, X } from "lucide-react";

const ITEMS = [
  {
    href: "/trading",
    label: "Autonomous trading",
    hint: "The bot. Fund it and leave it on.",
    Icon: Activity,
  },
  {
    href: "/launch",
    label: "Launchpad",
    hint: "Create a token. Manage the ones you launched.",
    Icon: Rocket,
  },
  {
    href: "/swap",
    label: "Swap",
    hint: "Discover tokens and swap from your wallet.",
    Icon: ArrowDownUp,
  },
] as const;

export function ToolsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(82dvh,34rem)] w-full max-w-[22rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c] shadow-2xl sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-3">
          <div className="text-[22px] font-semibold tracking-tight text-white">Tools</div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-mute hover:bg-white/10 hover:text-ghost"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          {ITEMS.map((it) => (
            <button
              key={it.href}
              type="button"
              onClick={() => {
                onClose();
                router.push(it.href);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-acid/15 text-acid">
                <it.Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] text-ghost">{it.label}</span>
                <span className="block text-[13px] text-mute">{it.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
