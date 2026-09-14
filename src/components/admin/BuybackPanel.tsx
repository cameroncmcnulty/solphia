"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "./AdminProvider";
import { Field, shortPk } from "./ui";
import { walletOk } from "@/lib/launch/validate";

type Run = { at: number; mint: string; sol: number; tokens: number; swapSig: string; burnSig?: string; feeSol: number };

export function BuybackPanel() {
  const { data } = useAdmin();
  const [mint, setMint] = useState("");
  const [sol, setSol] = useState("0.05");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/buyback", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) {
      setRuns(j.runs || []);
      if (!mint && j.defaultMint) setMint(j.defaultMint);
    }
  }, [mint]);

  useEffect(() => {
    load().catch(() => {});
  }, [load, data?.sphaMint]);

  async function run() {
    setErr("");
    setNote("");
    if (!walletOk(mint)) {
      setErr("Set a token CA to buy back and burn.");
      return;
    }
    const n = Number(sol);
    if (!(n >= 0.01)) {
      setErr("Use at least 0.01 SOL.");
      return;
    }
    if (!confirm(`Spend ${n} SOL from treasury, buy ${shortPk(mint, 4)}, then burn it? The 1% router fee returns to treasury.`)) {
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/buyback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint, sol: n }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || "buyback failed");
      setNote(`Bought and burned ${Number(j.tokens || 0).toFixed(4)} · swap ${String(j.swapSig || "").slice(0, 8)}…`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "buyback failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-acid/25 bg-acid/[0.04] p-5">
      <div className="font-mono text-[10px] tracking-[0.22em] text-acid">BUYBACK + BURN</div>
      <p className="mt-1 max-w-2xl text-sm text-mute">
        SOL leaves the treasury, routes through Solphia’s 1% swap (fee returns here), buys the CA you set, then burns
        those tokens. Use a test CA on devnet first.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
        <Field value={mint} onChange={setMint} placeholder="Token CA to buy and burn" />
        <Field value={sol} onChange={setSol} placeholder="SOL" />
        <button type="button" disabled={busy} onClick={run} className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40">
          {busy ? "Buying…" : "Buy + burn"}
        </button>
      </div>
      {note && <p className="mt-2 text-sm text-acid">{note}</p>}
      {err && <p className="mt-2 text-sm text-blood">{err}</p>}
      {runs.length > 0 && (
        <div className="mt-4 space-y-1 font-mono text-[11px] text-mute">
          {runs.slice(0, 6).map((r) => (
            <div key={r.swapSig}>
              {new Date(r.at).toLocaleString()} · {r.sol} SOL → {shortPk(r.mint, 4)} · burned {r.tokens.toFixed(2)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
