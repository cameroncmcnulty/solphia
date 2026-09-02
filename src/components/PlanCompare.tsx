"use client";

import Link from "next/link";
import { COMPARE_ROWS } from "@/lib/plans";

const HEADS = ["Paper", "Alerts", "Copy", "Launch", "Everything"];
const PRICES = ["Free", "0.15", "0.25", "0.30", "0.50"];

export function PlanCompare() {
  return (
    <div className="panel overflow-hidden rounded-2xl">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto p-4 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HEADS.map((h, i) => (
          <div
            key={h}
            className={`w-[min(78vw,320px)] shrink-0 snap-center rounded-2xl border p-4 ${
              i === 4 ? "border-acid/40 bg-acid/5" : "border-violet/20 bg-void/40"
            }`}
          >
            <div className={`font-display text-2xl ${i === 4 ? "text-acid" : "text-ghost"}`}>{h}</div>
            <div className="mt-1 font-mono text-sm text-mute">
              {PRICES[i]} {i ? "SOL / 30d" : ""}
            </div>
            <ul className="mt-4 space-y-3">
              {COMPARE_ROWS.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-3">
                  <span className="text-sm leading-snug text-mute">{row.label}</span>
                  <Cell v={row.values[i]} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-violet/25 font-mono text-[10px] tracking-[0.18em] text-mute">
              <th className="px-4 py-3">What you get</th>
              {HEADS.map((h, i) => (
                <th key={h} className={`px-3 py-3 ${i === 4 ? "text-acid" : "text-ghost"}`}>
                  {h}
                  <div className="mt-1 tracking-normal text-mute">
                    {PRICES[i]} {i ? "SOL" : ""}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-violet/10">
                <td className="px-4 py-3 text-sm text-ghost">
                  {row.label}
                  {row.hint && <div className="mt-1 font-mono text-[10px] text-mute">{row.hint}</div>}
                </td>
                {row.values.map((v, i) => (
                  <td key={i} className="px-3 py-3">
                    <Cell v={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-violet/20 p-4 sm:flex-row sm:justify-end">
        <Link href="/trading" className="btn-ghost inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-center font-mono text-[12px]">
          Paper is free
        </Link>
        <Link href="/trading" className="btn-acid inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2 text-center font-mono text-[12px]">
          LAUNCH BOT
        </Link>
      </div>
    </div>
  );
}

function Cell({ v }: { v: string }) {
  if (v === "Yes" || v === "She does") return <YesMark label={v} />;
  if (v === "—") {
    return <span className="inline-block h-0.5 w-3 rounded-full bg-violet/35" aria-label="No" />;
  }
  return <span className="font-mono text-[12px] text-mute">{v}</span>;
}

function YesMark({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#14F195] text-[#04000a] shadow-[0_0_14px_rgba(20,241,149,0.4)]"
      aria-label={label}
      title={label}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3.2 8.4l3.1 3.1 6.5-7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
