"use client";

import { useState } from "react";
import { paySeatFromPhantom } from "@/lib/wallet/trading";
import { ROCKET_PACKS, rocketSol, type BoostRank } from "@/lib/launch/boost";

export function BoostBuy({
  owner,
  coinId,
  symbol,
  onDone,
}: {
  owner: string;
  coinId: string;
  symbol: string;
  onDone?: () => void;
}) {
  const [rockets, setRockets] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const pack = ROCKET_PACKS.find((p) => p.rockets === rockets) || ROCKET_PACKS[0];

  async function buy() {
    setErr("");
    setNote("");
    setBusy(true);
    try {
      const prep = await fetch("/api/launch/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pubkey: owner, coinId, rockets }),
      }).then((r) => r.json());
      if (!prep.treasury || !prep.sol) throw new Error(prep.message || "Could not start the boost.");
      const sig = await paySeatFromPhantom(owner, prep.treasury, Number(prep.sol));
      if (!sig) throw new Error("Payment did not send.");
      const done = await fetch("/api/launch/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pubkey: owner, coinId, rockets, signature: sig }),
      }).then((r) => r.json());
      if (!done.ok) throw new Error(done.message || "Boost did not confirm.");
      setNote("Live for 24 hours. Add more any time.");
      onDone?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "boost failed";
      setErr(/phantom/i.test(msg) ? "Connect your wallet to pay." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-acid/25 bg-acid/[0.04] p-3">
      <div className="font-mono text-[10px] tracking-[0.18em] text-acid">BOOST · ${symbol.replace(/^\$/, "")}</div>
      <p className="mt-1 text-[12px] text-mute">Each buy is 24 hours. More rockets, higher on the rail.</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {ROCKET_PACKS.map((p) => (
          <button
            key={p.rockets}
            type="button"
            onClick={() => setRockets(p.rockets)}
            className={`rounded-full px-3 py-1 font-mono text-[11px] ${rockets === p.rockets ? "bg-acid/20 text-acid" : "border border-violet/30 text-mute"}`}
          >
            {p.rockets} ⚡
          </button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={buy} className="btn-acid mt-3 w-full rounded-full py-2 text-sm disabled:opacity-40">
        {busy ? "Paying…" : `Boost · ${rocketSol(pack.rockets)} SOL · 24h`}
      </button>
      {note && <p className="mt-2 text-[12px] text-acid">{note}</p>}
      {err && <p className="mt-2 text-[12px] text-blood">{err}</p>}
    </div>
  );
}

export function BoostRail({
  rows,
  onOpen,
}: {
  rows: BoostRank[];
  onOpen: (mint: string, coinId: string) => void;
}) {
  if (!rows.length) return null;
  return (
    <div className="boost-rail">
      {rows.map((b, i) => (
        <button
          key={`${b.mint || b.coinId}-${i}`}
          type="button"
          onClick={() => onOpen(b.mint, b.coinId)}
          className="boost-chip"
        >
          <span className="font-mono text-[10px] text-acid">⚡ {b.rockets}</span>
          <span className="truncate font-display text-sm text-ghost">${(b.symbol || "").replace(/^\$/, "")}</span>
        </button>
      ))}
    </div>
  );
}

export function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
