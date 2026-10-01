"use client";

import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";
import { TokenArt } from "@/components/TokenArt";
import { paySeatFromPhantom, signAndSendPhantom } from "@/lib/wallet/trading";
import { isSolanaAddress } from "@/lib/wallet/addr";
import { MEGA_ROCKETS, ROCKET_PACKS, rocketSol, type BoostRank, type BoostSort } from "@/lib/launch/boost";

type BoostToken = {
  coinId: string;
  mint?: string;
  symbol: string;
  name?: string;
  image?: string;
};

export function BoostBuy({
  owner,
  coinId,
  symbol,
  name,
  image,
  mint,
  onDone,
  onPick,
}: {
  owner: string;
  coinId?: string;
  symbol?: string;
  name?: string;
  image?: string;
  mint?: string;
  onDone?: () => void;
  onPick?: (token: BoostToken) => void;
}) {
  const [rockets, setRockets] = useState(10);
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [ca, setCa] = useState(mint || "");
  const [picked, setPicked] = useState<BoostToken | null>(
    coinId || mint
      ? { coinId: coinId || mint || "", mint, symbol: symbol || "", name, image }
      : null,
  );
  const pack = ROCKET_PACKS.find((p) => p.rockets === rockets) || ROCKET_PACKS[0];
  const ticker = (picked?.symbol || "").replace(/^\$/, "");

  useEffect(() => {
    if (!coinId && !mint) return;
    setPicked({ coinId: coinId || mint || "", mint, symbol: symbol || "", name, image });
    if (mint) setCa(mint);
  }, [coinId, mint, symbol, name, image]);

  async function lookup() {
    setErr("");
    setNote("");
    const q = ca.trim();
    if (!isSolanaAddress(q)) {
      setErr("Paste a mint address (CA).");
      return;
    }
    setLookupBusy(true);
    try {
      const r = await fetch(`/api/launch/lookup?mint=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.coin) throw new Error(j.error === "bad_mint" ? "Paste a mint address (CA)." : j.error || "No token at that mint.");
      const next: BoostToken = {
        coinId: j.coin.id || j.coin.mint || q,
        mint: j.coin.mint || q,
        symbol: j.coin.symbol || "",
        name: j.coin.name,
        image: j.coin.image,
      };
      setPicked(next);
      onPick?.(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function buy() {
    setErr("");
    setNote("");
    if (!picked?.coinId) {
      setErr("Paste a CA and look it up first.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        pubkey: owner,
        coinId: picked.coinId,
        mint: picked.mint,
        symbol: picked.symbol,
        name: picked.name,
        image: picked.image,
        rockets,
      };
      const prep = await fetch("/api/launch/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (!prep.transaction && (!prep.treasury || !prep.sol)) throw new Error(prep.message || "Could not start the boost.");
      const sig = prep.transaction
        ? await signAndSendPhantom(prep.transaction)
        : await paySeatFromPhantom(owner, prep.treasury, Number(prep.sol));
      if (!sig) throw new Error("Payment did not send.");
      const done = await fetch("/api/launch/boost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, signature: sig }),
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
    <div className="rounded-[22px] bg-white/[0.04] p-3 sm:p-4">
      <p className="font-mono text-[10px] tracking-[0.16em] text-white/40">SEARCH BY CA</p>
      <div className="relative mt-2">
        <input
          value={ca}
          onChange={(e) => setCa(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              lookup().catch(() => {});
            }
          }}
          placeholder="Paste any Solana CA"
          className="min-h-[44px] w-full rounded-full border border-white/10 bg-black/35 px-4 pr-20 text-[14px] text-white outline-none"
        />
        <button
          type="button"
          disabled={lookupBusy}
          onClick={() => lookup().catch(() => {})}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-acid px-4 py-1.5 text-[13px] font-semibold text-void disabled:opacity-40"
        >
          {lookupBusy ? "…" : "Go"}
        </button>
      </div>

      {picked ? (
        <div className="mt-3 flex items-center gap-3">
          <TokenArt src={picked.image} mint={picked.mint} label={ticker} className="h-12 w-12 rounded-[16px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold tracking-tight text-white">{picked.name || ticker || "Token"}</p>
            <p className="font-mono text-[11px] tracking-[0.14em] text-white/40">${ticker || "TOKEN"} · 24H ON THE RAIL</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-white/45">Paste the contract address of the coin you want on the rail.</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {ROCKET_PACKS.map((p) => {
          const gold = p.rockets === MEGA_ROCKETS;
          const on = rockets === p.rockets;
          return (
            <button
              key={p.rockets}
              type="button"
              onClick={() => setRockets(p.rockets)}
              className={`rounded-[20px] px-3 py-3 text-left transition ${
                gold
                  ? `boost-gold ${on ? "ring-2 ring-[#ffd24a]" : ""}`
                  : on
                    ? "bg-acid/15 text-acid ring-1 ring-acid/50"
                    : "border border-white/10 bg-black/20 text-white/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 ${gold ? "text-[#ffd24a]" : on ? "text-acid" : "text-white/70"}`}>
                  <Rocket className="h-4 w-4" fill="currentColor" />
                  <span className="stat-num text-[18px] leading-none">{p.rockets}</span>
                </span>
                {gold ? (
                  <span className="rounded-full bg-[#ffd24a]/15 px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] text-[#ffd24a]">
                    MEGA
                  </span>
                ) : null}
              </div>
              <p className={`mt-2 font-mono text-[12px] ${gold ? "text-[#ffd24a]" : "text-acid"}`}>{p.sol} SOL</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={busy || !picked?.coinId}
        onClick={buy}
        className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#14f195] text-[16px] font-semibold text-[#04000a] disabled:opacity-40"
      >
        <Rocket className="h-4 w-4" fill="currentColor" />
        {busy ? "Paying…" : `Boost · ${rocketSol(pack.rockets)} SOL`}
      </button>
      <p className="mt-2 text-center text-[12px] text-white/40">Live 24 hours. More rockets rank higher.</p>
      {note && <p className="mt-2 text-center text-[13px] text-acid">{note}</p>}
      {err && <p className="mt-2 text-center text-[13px] text-blood">{err}</p>}
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
  if (!rows.length) {
    return (
      <div className="px-4 pb-5 pt-3 sm:px-5">
        <div className="flex flex-col items-center rounded-[22px] bg-white/[0.04] px-4 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-acid/15 text-acid">
            <Rocket className="h-5 w-5" fill="currentColor" />
          </span>
          <p className="mt-3 text-[16px] font-semibold text-white">Take the rail</p>
          <p className="mt-1 max-w-[16rem] text-[13px] leading-snug text-white/45">
            Boost a coin. More rockets = higher rank for 24 hours.
          </p>
        </div>
      </div>
    );
  }
  const ordered =
    sort === "latest"
      ? [...rows].sort((a, b) => (b.lastBoostAt || 0) - (a.lastBoostAt || 0) || b.rockets - a.rockets)
      : [...rows].sort((a, b) => b.rockets - a.rockets || a.leftMs - b.leftMs);
  return (
    <div className="pt-3">
      <div className="mb-2 flex gap-1 px-4 sm:px-5">
        {(
          [
            ["top", "Top"],
            ["latest", "Latest"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSort(k)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
              sort === k ? "bg-acid/20 text-acid" : "bg-white/[0.06] text-white/45"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-4 pt-1 sm:px-5" style={{ scrollbarWidth: "thin" }}>
        {ordered.map((b, i) => {
          const ticker = (b.symbol || "").replace(/^\$/, "");
          const gold = Boolean(b.mega) || b.rockets >= MEGA_ROCKETS;
          const place = sort === "top" && i < 3 ? i + 1 : 0;
          return (
            <button
              key={`${b.mint || b.coinId}-${i}`}
              type="button"
              onClick={() => onOpen(b.mint, b.coinId)}
              className={`flex w-[7.6rem] shrink-0 flex-col items-center rounded-[22px] px-3 py-3 text-center ${
                gold ? "boost-gold" : "border border-white/10 bg-white/[0.04]"
              }`}
            >
              <div
                className={
                  place === 1
                    ? "rank-wrap rank-1"
                    : place === 2
                      ? "rank-wrap rank-2"
                      : place === 3
                        ? "rank-wrap rank-3"
                        : gold
                          ? "boost-card-art"
                          : ""
                }
              >
                <TokenArt src={b.image} mint={b.mint} label={ticker} className="h-14 w-14 rounded-full" />
                {place ? <span className="rank-num">{place}</span> : null}
              </div>
              <span className="mt-2 block w-full truncate text-[13px] font-semibold text-white">
                ${ticker || "TOKEN"}
              </span>
              <span className={`mt-1 inline-flex items-center gap-1 font-mono text-[12px] ${gold ? "text-[#ffd24a]" : "text-acid"}`}>
                <Rocket className="h-3.5 w-3.5" fill="currentColor" />
                {b.rockets}
              </span>
              <span className="mt-0.5 font-mono text-[10px] text-white/35">{fmtLeft(b.leftMs)} left</span>
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
