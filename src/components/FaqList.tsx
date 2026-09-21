"use client";

import { useState } from "react";
import { FAQS } from "@/lib/plans";

export function FaqList({ limit }: { limit?: number }) {
  const [open, setOpen] = useState<number | null>(0);
  const rows = limit ? FAQS.slice(0, limit) : FAQS;
  return (
    <div className="space-y-2">
      {rows.map((f, i) => {
        const on = open === i;
        return (
          <button
            key={f.q}
            onClick={() => setOpen(on ? null : i)}
            className="w-full border-b border-white/[0.06] py-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 pr-2 text-[17px] font-semibold leading-snug tracking-tight text-white">{f.q}</span>
              <span className="shrink-0 text-[18px] text-white/40">{on ? "−" : "+"}</span>
            </div>
            {on && <p className="mt-2 text-[15px] leading-relaxed text-white/45">{f.a}</p>}
          </button>
        );
      })}
    </div>
  );
}
