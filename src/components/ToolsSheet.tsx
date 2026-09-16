"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowDownUp, Rocket } from "lucide-react";

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
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-t-3xl border border-violet/30 bg-[#17212b] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pb-2 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
          <div className="font-display text-xl text-ghost">Tools</div>
        </div>
        <div className="pb-4">
          {ITEMS.map((it) => (
            <button
              key={it.href}
              type="button"
              onClick={() => {
                onClose();
                router.push(it.href);
              }}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-white/5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acid/15 text-acid">
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
