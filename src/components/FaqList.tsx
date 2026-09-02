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
            className="panel w-full rounded-2xl p-4 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-base text-ghost">{f.q}</span>
              <span className="font-mono text-acid">{on ? "−" : "+"}</span>
            </div>
            {on && <p className="mt-3 text-sm leading-relaxed text-mute">{f.a}</p>}
          </button>
        );
      })}
    </div>
  );
}
