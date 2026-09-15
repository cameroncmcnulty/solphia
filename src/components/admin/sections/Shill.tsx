"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../AdminProvider";
import { Mini, shortPk } from "../ui";

type Msg = { id: string; at: number; owner: string; text?: string; sticker?: string; kind: string };
type Pin = { id: string; symbol: string; mint: string; owner: string; rockets?: number; endsAt: number };

export function ShillSection() {
  const { data } = useAdmin();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [members, setMembers] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/shill", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) return;
    setMessages(j.messages || []);
    setPins(j.pins || []);
    setMembers(j.members || 0);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch("/api/admin/shill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Mini k="Messages" v={String(data.shill?.messages || messages.length)} />
        <Mini k="Live pins" v={String(data.shill?.pins || pins.length)} />
        <Mini k="Voices" v={String(data.shill?.members || members)} />
      </div>
      <section className="panel rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-ghost">Pins</h2>
          <button type="button" disabled={busy} onClick={() => post({ wipe: true })} className="btn-ghost rounded-full px-4 py-1.5 text-sm text-blood">
            Wipe room
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {pins.length === 0 && <p className="text-sm text-mute">No paid pins live.</p>}
          {pins.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-violet/20 px-3 py-2">
              <div>
                <div className="font-display text-ghost">${p.symbol}</div>
                <div className="font-mono text-[10px] text-mute">{shortPk(p.mint)}</div>
              </div>
              <button type="button" disabled={busy} onClick={() => post({ unpinId: p.id })} className="text-sm text-blood">
                Unpin
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="panel rounded-2xl p-5">
        <h2 className="font-display text-2xl text-ghost">Recent chat</h2>
        <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
          {messages.length === 0 && <p className="text-sm text-mute">Quiet.</p>}
          {messages.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 rounded-xl border border-violet/15 px-3 py-2">
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-mute">{shortPk(m.owner)}</div>
                <div className="truncate text-sm text-ghost">{m.sticker || m.text || m.kind}</div>
              </div>
              <button type="button" disabled={busy} onClick={() => post({ deleteId: m.id })} className="text-sm text-blood">
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
