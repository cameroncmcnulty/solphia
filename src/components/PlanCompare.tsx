"use client";

import Link from "next/link";
import { COMPARE_ROWS } from "@/lib/plans";

const HEADS = ["Paper", "Alerts", "Copy", "Launch", "Everything"];
const PRICES = ["Free", "0.15", "0.25", "0.30", "0.50"];

export function PlanCompare() {
  return (
    <div className="panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-violet/25 font-mono text-[10px] tracking-[0.18em] text-mute">
              <th className="px-4 py-3">What you get</th>
              {HEADS.map((h, i) => (
                <th key={h} className={`px-3 py-3 ${i === 4 ? "text-acid" : "text-ghost"}`}>
                  {h}
                  <div className="mt-1 tracking-normal text-mute">{PRICES[i]} {i ? "SOL" : ""}</div>
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
                  <td key={i} className={`px-3 py-3 font-mono text-[11px] ${v === "Yes" || v === "She does" || v === "Never" ? "text-acid" : "text-mute"}`}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 border-t border-violet/20 p-4 sm:flex-row sm:justify-end">
        <Link href="/auto" className="btn-ghost min-h-[44px] rounded-full px-5 py-2 text-center font-mono text-[11px]">
          Try paper free
        </Link>
        <Link href="/pricing" className="btn-acid min-h-[44px] rounded-full px-5 py-2 text-center font-mono text-[11px]">
          Get Everything · 0.50 SOL
        </Link>
      </div>
    </div>
  );
}
