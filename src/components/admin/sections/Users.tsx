"use client";

import { useMemo, useState } from "react";
import type { AdminUser } from "@/lib/admin/types";
import { useAdmin } from "../AdminProvider";
import { shortPk } from "../ui";

type Filter = "all" | "paid" | "admin" | "live" | "paper" | "launched" | "referred";
type Sort = "seen" | "created" | "rewards" | "launches";

function matches(u: AdminUser, q: string, filter: Filter) {
  if (filter === "paid" && !u.paid && !u.admin) return false;
  if (filter === "admin" && !u.admin) return false;
  if (filter === "live" && u.mode !== "live") return false;
  if (filter === "paper" && u.mode !== "paper") return false;
  if (filter === "launched" && !u.launched) return false;
  if (filter === "referred" && !u.referredCount) return false;
  if (!q) return true;
  const hay = `${u.username || ""} ${u.pubkey} ${u.email || ""} ${u.notes || ""} ${u.plan}`.toLowerCase();
  return hay.includes(q);
}

export function UsersSection() {
  const { data, busy, patch } = useAdmin();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("seen");
  const [sel, setSel] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDel, setConfirmDel] = useState("");

  const rows = useMemo(() => {
    const list = (data?.users || []).filter((u) => matches(u, q.trim().toLowerCase(), filter));
    list.sort((a, b) => {
      if (sort === "created") return b.createdAt - a.createdAt;
      if (sort === "rewards") return b.referralRewardsSol - a.referralRewardsSol;
      if (sort === "launches") return b.launched - a.launched;
      return b.lastSeen - a.lastSeen;
    });
    return list;
  }, [data?.users, q, filter, sort]);

  const picked = rows.find((u) => u.pubkey === sel) || null;

  function open(u: AdminUser) {
    setSel(u.pubkey);
    setUsername(u.username || "");
    setEmail(u.email || "");
    setNotes(u.notes || "");
    setConfirmDel("");
  }

  function save() {
    if (!picked) return;
    patch({
      user: {
        pubkey: picked.pubkey,
        username,
        email,
        notes,
      },
    });
  }

  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section className="panel rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ACCOUNTS</div>
            <h2 className="mt-1 font-display text-2xl text-ghost">{rows.length} users</h2>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border border-line bg-void px-3 py-1.5 font-mono text-[11px] text-ghost"
          >
            <option value="seen">Last seen</option>
            <option value="created">Created</option>
            <option value="rewards">Referral SOL</option>
            <option value="launches">Launches</option>
          </select>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username, wallet, email, notes"
          className="mt-4 min-h-[42px] w-full rounded-full border border-line bg-void px-4 font-mono text-[12px] text-ghost"
        />
        <div className="mt-3 flex flex-wrap gap-1">
          {(["all", "paid", "admin", "live", "paper", "launched", "referred"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 font-mono text-[10px] ${filter === k ? "bg-acid/20 text-acid" : "text-mute hover:text-ghost"}`}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="mt-4 max-h-[38rem] space-y-1 overflow-auto">
          {rows.length === 0 && <p className="text-sm text-mute">No accounts match.</p>}
          {rows.map((u) => (
            <button
              key={u.pubkey}
              type="button"
              onClick={() => open(u)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left ${
                sel === u.pubkey ? "border-acid/40 bg-acid/10" : "border-transparent hover:bg-white/5"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-[12px] text-ghost">
                  {u.username ? `@${u.username}` : shortPk(u.pubkey, 6)}
                </div>
                <div className="truncate font-mono text-[10px] text-mute">
                  {u.username ? shortPk(u.pubkey, 4) : ""} {u.plan}
                  {u.admin ? " · admin" : ""}
                  {u.mode === "live" ? " · LIVE" : ""}
                  {u.launched ? ` · ${u.launched} launches` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right font-mono text-[10px] text-mute">
                <div>{u.paid || u.admin ? "seat" : "free"}</div>
                <div>{u.referralRewardsSol ? `${u.referralRewardsSol.toFixed(3)} SOL` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">EDIT ACCOUNT</div>
        {!picked && <p className="mt-3 text-sm text-mute">Pick a user to edit username, notes, seat, or delete.</p>}
        {picked && (
          <div className="mt-3 space-y-3">
            <div className="font-mono text-[11px] text-ghost">{shortPk(picked.pubkey, 8)}</div>
            <p className="font-mono text-[10px] text-mute">
              Last seen {picked.lastSeen ? new Date(picked.lastSeen).toLocaleString() : "never"} · invited {picked.referredCount} ·
              deposited {picked.depositedSol.toFixed(3)} SOL
            </p>
            <label className="block">
              <span className="font-mono text-[10px] text-mute">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@handle"
                className="mt-1 min-h-[40px] w-full rounded-full border border-line bg-void px-4 font-mono text-[12px] text-ghost"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] text-mute">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="optional"
                className="mt-1 min-h-[40px] w-full rounded-full border border-line bg-void px-4 font-mono text-[12px] text-ghost"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] text-mute">Internal notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-2xl border border-line bg-void px-4 py-2 text-sm text-ghost"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={save} className="btn-acid rounded-full px-4 py-2 text-sm disabled:opacity-40">
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ user: { pubkey: picked.pubkey, grantAdmin: !picked.admin } })}
                className="btn-ghost rounded-full px-4 py-2 text-sm"
              >
                {picked.admin ? "Revoke admin" : "Make admin"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ user: { pubkey: picked.pubkey, comped: !picked.comped } })}
                className="btn-ghost rounded-full px-4 py-2 text-sm"
              >
                {picked.comped ? "Uncomp" : "Comp seat"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ user: { pubkey: picked.pubkey, alertsEnabled: !picked.alertsEnabled } })}
                className="btn-ghost rounded-full px-4 py-2 text-sm"
              >
                Alerts {picked.alertsEnabled ? "on" : "off"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => patch({ user: { pubkey: picked.pubkey, clearUsername: true } })}
                className="btn-ghost rounded-full px-4 py-2 text-sm"
              >
                Clear username
              </button>
            </div>
            <div className="border-t border-line pt-3">
              <p className="text-sm text-mute">Delete removes the account, paper book, and 24/7 key. Coins they launched stay on the tape.</p>
              <input
                value={confirmDel}
                onChange={(e) => setConfirmDel(e.target.value)}
                placeholder={`type ${picked.pubkey.slice(-4)} to delete`}
                className="mt-2 min-h-[40px] w-full rounded-full border border-blood/30 bg-void px-4 font-mono text-[11px] text-ghost"
              />
              <button
                type="button"
                disabled={busy || confirmDel !== picked.pubkey.slice(-4)}
                onClick={async () => {
                  await patch({ user: { pubkey: picked.pubkey, delete: true } });
                  setSel(null);
                  setConfirmDel("");
                }}
                className="mt-2 rounded-full border border-blood/50 px-4 py-2 font-mono text-[11px] text-blood disabled:opacity-40"
              >
                Delete account
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
