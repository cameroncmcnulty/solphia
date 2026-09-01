"use client";

import { useEffect, useState } from "react";
import { AutoPilot } from "@/components/AutoPilot";
import { WalletConnect } from "@/components/WalletConnect";

export default function AutoPage() {
  const [owner, setOwner] = useState<string | null>(null);
  useEffect(() => {
    setOwner(localStorage.getItem("solphia_owner"));
  }, []);
  return (
    <main className="mx-auto max-w-lg px-4 pb-8 pt-2 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.35em] text-violet">PILOT</p>
          <h1 className="font-display text-3xl text-ghost">Auto</h1>
        </div>
        <WalletConnect compact />
      </div>
      <AutoPilot owner={owner} />
    </main>
  );
}
