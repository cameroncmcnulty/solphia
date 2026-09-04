"use client";

import Link from "next/link";
import { COMPARE_ROWS } from "@/lib/plans";

const HEADS = ["Paper", "Live"];
const PRICES = ["Free", "0.15 SOL / 30d"];
const ICONS = ["/icons/plan-paper.jpg", "/icons/plan-full.jpg"];

export function PlanCompare() {
  return (
    <div className="panel overflow-hidden rounded-2xl">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto p-4 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HEADS.map((h, i) => (
          <div
            key={h}
            className={`w-[min(78vw,320px)] shrink-0 snap-center rounded-2xl border p-4 ${
              i === 1 ? "border-acid/40 bg-acid/5" : "border-violet/20 bg-void/40"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICONS[i]} alt="" className="mb-3 h-12 w-12 rounded-xl" />
            <div className={`font-display text-2xl ${i === 1 ? "text-acid" : "text-ghost"}`}>{h}</div>
            <div className="mt-1 font-mono text-sm text-mute">{PRICES[i]}</div>
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
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-violet/20">
              <th className="p-4 text-sm text-mute"> </th>
              {HEADS.map((h, i) => (
                <th key={h} className={`p-4 font-display text-xl ${i === 1 ? "text-acid" : "text-ghost"}`}>
                  {h}
                  <div className="font-mono text-xs font-normal text-mute">{PRICES[i]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-violet/10">
                <td className="p-4 text-sm text-mute">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="p-4">
                    <Cell v={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-violet/20 p-4 text-right">
        <Link href="/trading" className="text-sm text-acid">
          Paper is free →
        </Link>
      </div>
    </div>
  );
}

function Cell({ v }: { v: string }) {
  if (v === "Yes") return <span className="text-acid">Yes</span>;
  if (v === "Never" || v === "None") return <span className="text-ghost">{v}</span>;
  if (v === "—") return <span className="text-mute">—</span>;
  return <span className="text-ghost">{v}</span>;
}
