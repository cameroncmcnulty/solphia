"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { useAdmin } from "../AdminProvider";
import { shortPk } from "../ui";

type Row = {
  pubkey: string;
  email: string;
  role: string;
  status: string;
  joinedAt: number;
  boostPct: number;
  refs: number;
  unclaimed: number;
  claimed: number;
  username: string;
};

type Promo = { id: string; url: string; caption?: string };
type Pack = {
  active: number;
  members: Row[];
  airdrops: { id: string; at: number; total: number; heads: number }[];
  promos?: Promo[];
};

export function CircleSection() {
  const { data } = useAdmin();
  const [pack, setPack] = useState<Pack | null>(null);
  const [amount, setAmount] = useState("1000");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/circle", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) {
      setPack(j);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    setNote("");
    try {
      const r = await fetch("/api/admin/circle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || "failed");
      if (j.drop) setNote(`Drop ${j.drop.id} · ${j.drop.heads} founders`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-mute">FOUNDERS CIRCLE</div>
        <h2 className="mt-1 font-display text-3xl text-ghost">The exclusive hang</h2>
        <p className="mt-1 max-w-2xl text-sm text-mute">
          Wallet + email, then one invite unlocks both seats. Upload up to 30 promo images for the hang. Chat lives in
          Shill Zone.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet/20 bg-void/40 px-4 py-3">
          <div className="font-mono text-[10px] text-mute">FOUNDERS IN</div>
          <div className="font-display text-2xl text-ghost">{pack?.active ?? data?.circle.members ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-violet/20 bg-void/40 px-4 py-3">
          <div className="font-mono text-[10px] text-mute">DROPS</div>
          <div className="font-display text-2xl text-ghost">{pack?.airdrops?.length ?? 0}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-violet/20 p-5">
        <div className="font-mono text-[10px] tracking-[0.2em] text-mute">PROMO MEDIA · {pack?.promos?.length || 0}/30</div>
        <p className="mt-1 text-sm text-mute">Only uploaded spots show in the circle.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy(true);
              setErr("");
              try {
                const fd = new FormData();
                fd.append("file", f);
                fd.append("caption", caption);
                const r = await fetch("/api/admin/circle/promo", { method: "POST", body: fd });
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || "upload failed");
                setCaption("");
                await load();
              } catch (er) {
                setErr(er instanceof Error ? er.message : "upload failed");
              } finally {
                setBusy(false);
              }
            }}
          />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="caption (optional)"
            className="rounded-full border border-violet/30 bg-void px-3 py-1.5 text-sm text-ghost"
          />
        </div>
        {(pack?.promos || []).length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(pack?.promos || []).map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-xl border border-violet/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-[11px] text-ghost"
                  onClick={() => post({ deletePromoId: p.id })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-acid/25 bg-acid/[0.04] p-5">
        <div className="font-mono text-[10px] tracking-[0.2em] text-acid">AIRDROP TO THE CIRCLE</div>
        <p className="mt-1 text-sm text-mute">
          Splits the amount by seat count and referral boost, then parks it on each founder’s withdraw button.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-36 rounded-full border border-violet/30 bg-void px-4 py-2 font-mono text-sm text-ghost"
            placeholder="token amount"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => post({ airdrop: Number(amount) })}
            className="btn-acid inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm disabled:opacity-40"
          >
            <Gift className="h-4 w-4" />
            Airdrop
          </button>
        </div>
        {note && <p className="mt-2 text-sm text-acid">{note}</p>}
        {err && <p className="mt-2 text-sm text-blood">{err}</p>}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-violet/20">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="font-mono text-[10px] tracking-[0.14em] text-mute">
            <tr>
              <th className="px-3 py-2">Founder</th>
              <th className="px-3 py-2">Boost</th>
              <th className="px-3 py-2">Unclaimed</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Access</th>
              <th className="px-3 py-2">Tools</th>
            </tr>
          </thead>
          <tbody>
            {(pack?.members || []).map((m) => (
              <tr key={m.pubkey} className="border-t border-violet/15">
                <td className="px-3 py-2">
                  <div className="text-ghost">{m.username ? `@${m.username}` : shortPk(m.pubkey, 5)}</div>
                  <div className="font-mono text-[10px] text-mute">{m.email}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {m.boostPct}% · {m.refs} refs
                </td>
                <td className="px-3 py-2">{m.unclaimed.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <select
                    value={m.role}
                    onChange={(e) => post({ pubkey: m.pubkey, role: e.target.value })}
                    className="rounded-full border border-violet/30 bg-void px-2 py-1 font-mono text-[11px] text-ghost"
                  >
                    <option value="member">member</option>
                    <option value="mod">mod</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-mute">{m.status}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-mute">{(m as { access?: string }).access || "ready"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="rounded-full border border-violet/30 px-2 py-0.5 text-[11px]" onClick={() => post({ pubkey: m.pubkey, muteMs: 3_600_000 })}>
                      Mute 1h
                    </button>
                    <button type="button" className="rounded-full border border-violet/30 px-2 py-0.5 text-[11px]" onClick={() => post({ pubkey: m.pubkey, muteMs: 0 })}>
                      Unmute
                    </button>
                    {m.status === "banned" ? (
                      <button type="button" className="rounded-full border border-acid/40 px-2 py-0.5 text-[11px] text-acid" onClick={() => post({ pubkey: m.pubkey, ban: false })}>
                        Unban
                      </button>
                    ) : (
                      <button type="button" className="rounded-full border border-blood/40 px-2 py-0.5 text-[11px] text-blood" onClick={() => post({ pubkey: m.pubkey, ban: true })}>
                        Ban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
