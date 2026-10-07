"use client";

import type { ReactNode } from "react";

export function WalletSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="app-layer z-[96] bg-black/75" onClick={onClose}>
      <div
        className="app-layer-card rounded-[1.5rem] border border-white/10 bg-[#0b0714] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[20px] font-semibold tracking-tight text-white">{title}</p>
            {subtitle ? <p className="mt-1 text-[14px] leading-snug text-white/45">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white">
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
