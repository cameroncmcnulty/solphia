"use client";

import { useState } from "react";
import { WalletConnect } from "../WalletConnect";
import { LaunchPad } from "./LaunchPad";
import { AirdropDesk } from "./AirdropDesk";
import { LiquidityDesk } from "./LiquidityDesk";
import { VestingDesk } from "./VestingDesk";
import { AuthorityDesk } from "./AuthorityDesk";

const TOOLS = [
  { id: "launch", label: "Launch" },
  { id: "airdrop", label: "Airdrop" },
  { id: "lp", label: "LP" },
  { id: "vest", label: "Vest" },
  { id: "revoke", label: "Revoke" },
] as const;

type Tool = (typeof TOOLS)[number]["id"];

export function DevDesk() {
  const [tool, setTool] = useState<Tool>("launch");
  return (
    <main className="mx-auto max-w-6xl px-4 pb-8 pt-4 md:px-8 md:pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-violet">DEV TOOLS · SHE SCORES THE LAUNCH</p>
          <h1 className="mt-2 font-display text-3xl text-ghost sm:text-5xl">Launch it like she would copy it.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute sm:text-base">
            Real transactions in your Phantom. She watches the form — mint, freeze, LP, airdrop shape — and tells you if
            she would skip the coin after it goes live.
          </p>
        </div>
        <WalletConnect />
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`min-h-[44px] shrink-0 rounded-full px-4 font-mono text-[11px] tracking-[0.16em] ${
              tool === t.id ? "bg-acid text-void" : "btn-ghost"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tool === "launch" && <LaunchPad />}
        {tool === "airdrop" && <AirdropDesk />}
        {tool === "lp" && <LiquidityDesk />}
        {tool === "vest" && <VestingDesk />}
        {tool === "revoke" && <AuthorityDesk />}
      </div>
    </main>
  );
}
