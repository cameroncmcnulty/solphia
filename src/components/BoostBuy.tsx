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
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {ROCKET_PACKS.map((p) => {
          const mega = p.rockets === MEGA_ROCKETS;
          const on = rockets === p.rockets;
          return (
            <button
              key={p.rockets}
              type="button"
              onClick={() => setRockets(p.rockets)}
              className={`relative overflow-hidden rounded-2xl px-3 py-2 text-left ${
                mega ? `col-span-2 boost-mega-pack ${on ? "on" : ""}` : on ? "bg-acid/20 text-acid ring-1 ring-acid/50" : "border border-violet/30 text-mute"
              }`}
            >
              {mega && (
                <span className="boost-confetti" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              )}
              <div className="relative z-[1] font-stat text-sm text-ghost">
                {mega ? "MEGA · " : ""}
                {p.rockets} rockets
              </div>
              <div className="relative z-[1] font-mono text-[11px] text-acid">{p.sol} SOL · 24h</div>
            </button>
          );
        })}
      </div>
      <button type="button" disabled={busy} onClick={buy} className="btn-acid mt-3 w-full rounded-full py-2 text-sm disabled:opacity-40">
        {busy ? "Paying…" : `Boost · ${rocketSol(pack.rockets)} SOL · ${pack.rockets} 🚀`}
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
    <div className="overflow-hidden rounded-[1.5rem] border border-acid/35 bg-gradient-to-br from-acid/20 via-cyan/10 to-violet/25 p-3 shadow-[0_0_40px_rgba(20,241,149,0.12)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="font-display text-lg leading-none text-ghost">Boosted</div>
        <div className="flex gap-1 rounded-full border border-violet/30 bg-void/50 p-0.5 font-mono text-[10px]">
          <button
            type="button"
            onClick={() => setSort("latest")}
            className={`rounded-full px-3 py-1 ${sort === "latest" ? "bg-acid/20 text-acid" : "text-mute"}`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSort("top")}
            className={`rounded-full px-3 py-1 ${sort === "top" ? "bg-acid/20 text-acid" : "text-mute"}`}
          >
            Top
          </button>
        </div>
      </div>
      <div className="boost-rail">
        {ordered.map((b, i) => {
          const ticker = (b.symbol || "").replace(/^\$/, "");
          const mega = Boolean(b.mega) || b.rockets >= MEGA_ROCKETS;
          return (
            <button
              key={`${b.mint || b.coinId}-${i}`}
              type="button"
              onClick={() => onOpen(b.mint, b.coinId)}
              className={`boost-chip ${mega ? "mega" : ""}`}
            >
              {mega && (
                <span className="boost-confetti" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              )}
              {b.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image} alt="" className="boost-chip-art" />
              ) : (
                <div className="boost-chip-art flex items-center justify-center font-display text-lg text-acid">
                  {(ticker || "?").slice(0, 2)}
                </div>
              )}
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate font-display text-base leading-tight text-ghost">
                  ${ticker || "TOKEN"}
                </span>
                {b.name && b.name.replace(/^\$/, "") !== ticker && (
                  <span className="block truncate text-[11px] text-mute">{b.name}</span>
                )}
                <span className="mt-1 flex items-center gap-2 font-stat text-[12px] text-acid">
                  <span className="rounded-full bg-acid/20 px-2 py-0.5">
                    {mega ? "MEGA " : ""}
                    {b.rockets}
                  </span>
                  <span className="text-mute">{fmtLeft(b.leftMs)}</span>
                </span>
              </span>
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
