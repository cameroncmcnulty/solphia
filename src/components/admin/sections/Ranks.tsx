"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../AdminProvider";
import { Mini, shortPk } from "../ui";
import { RankBadge } from "@/components/RankBadge";

type Row = {
  pubkey: string;
  username: string;
  rank: number;
  title: string;
  xp: number;
  intro?: string;
  favMint?: string;
  favSymbol?: string;
};

export function RanksSection() {
  const { data } = useAdmin();
  const [board, setBoard] = useState<Row[]>([]);
  const [pk, setPk] = useState("");
  const [xp, setXp] = useState("500");
  const [rank, setRank] = useState("10");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/rank", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setBoard(j.board || []);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setNote("");
    try {
      const r = await fetch("/api/admin/rank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) setNote(j.error || "failed");
      else setNote("Updated.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Mini k="Ranked wallets" v={String(data.ranks?.cards || board.length)} />
        <Mini k="Top rank" v={board[0] ? String(board[0].rank) : "—"} />
      </div>
      <section className="panel rounded-2xl p-5">
        <h2 className="font-display text-2xl text-ghost">Grant / set</h2>
        <p className="mt-1 text-sm text-mute">Wallet, then grant XP, snap a rank, or reset.</p>
        <input
          value={pk}
          onChange={(e) => setPk(e.target.value.trim())}
          placeholder="Wallet"
          className="mt-3 min-h-[42px] w-full rounded-full border border-line bg-void px-4 font-mono text-[12px] text-ghost"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            className="w-24 rounded-full border border-line bg-void px-3 py-2 font-mono text-[12px] text-ghost"
          />
          <button type="button" disabled={busy || !pk} onClick={() => post({ pubkey: pk, grantXp: Number(xp) || 0 })} className="btn-acid rounded-full px-4 py-2 text-sm">
            Grant XP
          </button>
          <input
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="w-20 rounded-full border border-line bg-void px-3 py-2 font-mono text-[12px] text-ghost"
          />
          <button type="button" disabled={busy || !pk} onClick={() => post({ pubkey: pk, setRank: Number(rank) || 1 })} className="btn-ghost rounded-full px-4 py-2 text-sm">
            Set rank
          </button>
          <button type="button" disabled={busy || !pk} onClick={() => post({ pubkey: pk, reset: true })} className="rounded-full border border-blood/40 px-4 py-2 text-sm text-blood">
            Reset
          </button>
        </div>
        {note && <p className="mt-2 font-mono text-[12px] text-acid">{note}</p>}
      </section>
      <section className="panel rounded-2xl p-5">
        <h2 className="font-display text-2xl text-ghost">Board</h2>
        <div className="mt-3 space-y-2">
          {board.map((row, i) => (
            <button
              key={row.pubkey}
              type="button"
              onClick={() => setPk(row.pubkey)}
              className="flex w-full items-center gap-3 rounded-xl border border-violet/20 px-3 py-2 text-left hover:border-acid/40"
            >
              <span className="w-6 font-mono text-[11px] text-mute">{i + 1}</span>
              <RankBadge rank={row.rank} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-ghost">{row.username ? `@${row.username}` : shortPk(row.pubkey)}</div>
                <div className="truncate font-mono text-[10px] text-mute">
                  {row.title} · {row.xp} XP
                  {row.favSymbol ? ` · $${row.favSymbol}` : ""}
                </div>
              </div>
              <span className="font-display text-lg text-acid">{row.rank}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
