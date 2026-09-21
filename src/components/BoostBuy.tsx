"use client";

import { useState } from "react";
import { paySeatFromPhantom } from "@/lib/wallet/trading";
import { MEGA_ROCKETS, ROCKET_PACKS, rocketSol, type BoostRank, type BoostSort } from "@/lib/launch/boost";

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
  const [rockets, setRockets] = useState(10);
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
      setNote("Live for 24 hours.");
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
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {ROCKET_PACKS.map((p) => {
          const gold = p.rockets === MEGA_ROCKETS;
          const on = rockets === p.rockets;
          return (
            <button
              key={p.rockets}
              type="button"
              onClick={() => setRockets(p.rockets)}
              className={`rounded-2xl px-3 py-2 text-left ${
                gold
                  ? `col-span-2 ${on ? "ring-1 ring-[#ffd24a]" : ""} boost-gold`
                  : on
                    ? "bg-acid/20 text-acid ring-1 ring-acid/50"
                    : "border border-violet/30 text-mute"
              }`}
            >
              <div className={`stat-num text-sm ${gold ? "text-[#ffd24a]" : "text-ghost"}`}>{p.rockets} rockets</div>
              <div className={`font-mono text-[11px] ${gold ? "text-[#ffd24a]" : "text-acid"}`}>{p.sol} SOL</div>
            </button>
          );
        })}
      </div>
      <button type="button" disabled={busy} onClick={buy} className="btn-acid mt-3 w-full rounded-full py-2 text-sm disabled:opacity-40">
        {busy ? "Paying…" : `Boost · ${rocketSol(pack.rockets)} SOL · ${pack.rockets} rockets`}
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
  const [sort, setSort] = useState<BoostSort>("top");
  if (!rows.length) return null;
  const ordered =
    sort === "latest"
      ? [...rows].sort((a, b) => (b.lastBoostAt || 0) - (a.lastBoostAt || 0) || b.rockets - a.rockets)
      : [...rows].sort((a, b) => b.rockets - a.rockets || a.leftMs - b.leftMs);
  return (
    <div className="py-1">
      <div className="mb-2 flex gap-5 border-b border-white/10 text-[15px]">
        <button
          type="button"
          onClick={() => setSort("latest")}
          className={`pb-2 ${sort === "latest" ? "border-b-2 border-white font-medium text-white" : "text-white/40"}`}
        >
          Latest
        </button>
        <button
          type="button"
          onClick={() => setSort("top")}
          className={`pb-2 ${sort === "top" ? "border-b-2 border-white font-medium text-white" : "text-white/40"}`}
        >
          Top
        </button>
      </div>
      <div className="boost-rail">
        {ordered.map((b, i) => {
          const ticker = (b.symbol || "").replace(/^\$/, "");
          const gold = Boolean(b.mega) || b.rockets >= MEGA_ROCKETS;
          return (
            <button
              key={`${b.mint || b.coinId}-${i}`}
              type="button"
              onClick={() => onOpen(b.mint, b.coinId)}
              className={`boost-tile ${gold ? "gold" : ""}`}
            >
              {b.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image} alt="" className="boost-tile-art" />
              ) : (
                <div className="boost-tile-art flex items-center justify-center font-display text-xs text-acid">
                  {(ticker || "?").slice(0, 2)}
                </div>
              )}
              <span className="mt-1 block w-full truncate text-center text-[12px] font-semibold text-ghost">
                ${ticker || "TOKEN"}
              </span>
              <span className={`stat-num block text-center text-[12px] ${gold ? "text-[#ffd24a]" : "text-acid"}`}>{b.rockets}</span>
            </button>
          );
        })}
      </div>
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
