"use client";

import { useState } from "react";
import { isSolanaAddress } from "@/lib/wallet/addr";
import { signAndSendPhantom } from "@/lib/wallet/trading";

export function CircleSwap({ owner }: { owner: string }) {
  const [mint, setMint] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.1");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");

  async function go() {
    setErr("");
    setOut("");
    if (!isSolanaAddress(mint)) {
      setErr("Paste a token CA.");
      return;
    }
    const n = Number(amount);
    if (!(n > 0)) {
      setErr("Enter an amount.");
      return;
    }
    setBusy(true);
    try {
      const built = await fetch("/api/swap/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, mint, side, amount: n }),
      }).then((r) => r.json());
      if (!built.transaction) throw new Error(built.error || "No route.");
      const sig = await signAndSendPhantom(built.transaction);
      setOut(`${side === "buy" ? "Bought" : "Sold"} · ${sig.slice(0, 8)}…`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "swap failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-violet/20 bg-void/50 p-3">
      <div className="font-mono text-[10px] tracking-[0.18em] text-mute">SWAP</div>
      <input
        value={mint}
        onChange={(e) => setMint(e.target.value.trim())}
        placeholder="Token CA"
        className="mt-2 w-full rounded-xl border border-violet/25 bg-void px-3 py-2 font-mono text-[11px] text-ghost outline-none"
      />
      <div className="mt-2 flex gap-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`flex-1 rounded-full py-1 font-mono text-[10px] ${side === s ? "bg-acid/20 text-acid" : "text-mute"}`}
          >
            {s === "buy" ? "SOL → token" : "token → SOL"}
          </button>
        ))}
      </div>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={side === "buy" ? "SOL" : "tokens"}
        className="mt-2 w-full rounded-xl border border-violet/25 bg-void px-3 py-2 font-mono text-sm text-ghost outline-none"
      />
      <button type="button" disabled={busy} onClick={go} className="btn-acid mt-2 w-full rounded-full py-2 text-sm disabled:opacity-40">
        {busy ? "Swapping…" : "Swap"}
      </button>
      {out && <p className="mt-1 font-mono text-[10px] text-acid">{out}</p>}
      {err && <p className="mt-1 text-[11px] text-blood">{err}</p>}
    </div>
  );
}
