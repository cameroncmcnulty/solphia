"use client";

import { useMemo, useState } from "react";
import type { AdminUser } from "@/lib/admin/types";
import { launchError } from "@/lib/launch/errors";
import { usernameIssue } from "@/lib/launch/username";
import { FieldError, fieldClass, useConfirmErrors } from "@/components/form/confirm";
import { useAdmin } from "../AdminProvider";
import { Mini, money, shortPk, solAmt } from "../ui";

type Filter = "all" | "paid" | "admin" | "live" | "paper" | "launched" | "referred" | "email" | "google" | "unverified";
type Sort = "seen" | "created" | "rewards" | "launches" | "rank";

function rowId(u: AdminUser) {
  return u.pubkey || `acct:${u.accountId || ""}`;
}

function matches(u: AdminUser, q: string, filter: Filter) {
  if (filter === "paid" && !u.paid && !u.admin) return false;
  if (filter === "admin" && !u.admin) return false;
  if (filter === "live" && u.mode !== "live") return false;
  if (filter === "paper" && u.mode !== "paper") return false;
  if (filter === "launched" && !u.launched) return false;
  if (filter === "referred" && !u.referredCount) return false;
  if (filter === "email" && u.auth !== "email") return false;
  if (filter === "google" && u.auth !== "google") return false;
  if (filter === "unverified" && (u.emailVerified || !u.email)) return false;
  if (!q) return true;
  const hay = `${u.username || ""} ${u.pubkey} ${u.email || ""} ${u.notes || ""} ${u.plan} ${u.auth} ${u.accountId || ""}`.toLowerCase();
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
  const fieldErr = useConfirmErrors<"username" | "email">();

  const rows = useMemo(() => {
    const list = (data?.users || []).filter((u) => matches(u, q.trim().toLowerCase(), filter));
    list.sort((a, b) => {
      if (sort === "created") return b.createdAt - a.createdAt;
      if (sort === "rewards") return b.referralRewardsSol - a.referralRewardsSol;
      if (sort === "launches") return b.launched - a.launched;
      if (sort === "rank") return b.rank - a.rank || b.xp - a.xp;
      return b.lastSeen - a.lastSeen;
    });
    return list;
  }, [data?.users, q, filter, sort]);

  const picked = rows.find((u) => rowId(u) === sel) || null;

  function open(u: AdminUser) {
    setSel(rowId(u));
    setUsername(u.username || "");
    setEmail(u.email || "");
    setNotes(u.notes || "");
    setConfirmDel("");
    fieldErr.ok();
  }

  async function save() {
    if (!picked) return;
    if (picked.pubkey) {
      const issue = usernameIssue(username);
      if (issue) {
        fieldErr.fail({ username: launchError(issue) });
        return;
      }
    }
    fieldErr.ok();
    const r = await patch({
      user: {
        pubkey: picked.pubkey || undefined,
        accountId: picked.accountId || undefined,
        username: picked.pubkey ? username : undefined,
        email,
        notes,
      },
    });
    if (!r.ok) {
      const code = r.error || "";
      if (code === "username_taken" || code === "bad_username" || code === "username_reserved") {
        fieldErr.fail({ username: r.message || launchError(code) });
      } else if (code === "bad_email") {
        fieldErr.fail({ email: r.message || launchError(code) });
      }
    }
  }

  if (!data) return null;
  const plat = data.platform;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section className="panel rounded-2xl p-5">
        {plat ? (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini k="Wallets" v={String(plat.wallets)} />
            <Mini k="Active 24h" v={String(plat.active24h)} />
            <Mini k="Assets" v={money(plat.assetsUsd)} />
            <Mini k="Pad TVL" v={solAmt(plat.padTvlSol)} />
          </div>
        ) : null}
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
            <option value="rank">Rank</option>
          </select>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username, wallet, email, login, notes"
          className="mt-4 min-h-[42px] w-full rounded-full border border-line bg-void px-4 font-mono text-[12px] text-ghost"
        />
        <div className="mt-3 flex flex-wrap gap-1">
          {(["all", "paid", "admin", "email", "google", "unverified", "live", "paper", "launched", "referred"] as const).map((k) => (
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
              key={rowId(u)}
              type="button"
              onClick={() => open(u)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left ${
                sel === rowId(u) ? "border-acid/40 bg-acid/10" : "border-transparent hover:bg-white/5"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-[12px] text-ghost">
                  {u.username ? `@${u.username}` : u.email || (u.pubkey ? shortPk(u.pubkey, 6) : "account")}
                </div>
                <div className="truncate font-mono text-[10px] text-mute">
                  {u.auth}
                  {u.emailVerified ? " · verified" : u.email ? " · unverified" : ""}
                  {u.pubkey ? ` · ${shortPk(u.pubkey, 4)}` : " · no wallet yet"}
                  {u.admin ? " · admin" : u.mod ? " · mod" : ""}
                  {u.mode === "live" ? " · LIVE" : ""}
                  {u.launched ? ` · ${u.launched} launches` : ""}
                  {u.rank > 1 ? ` · r${u.rank}` : ""}
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
            <div className="font-mono text-[11px] text-ghost">
              {picked.email || (picked.pubkey ? shortPk(picked.pubkey, 8) : picked.accountId)}
            </div>
            <p className="font-mono text-[10px] text-mute">
              {picked.auth}
              {picked.emailVerified ? " · email verified" : picked.email ? " · email unverified" : ""}
              {picked.google ? " · Google" : ""}
              {picked.accountId ? ` · login ${picked.accountId.slice(0, 8)}` : " · no login account"}
              {picked.pubkey ? ` · ${shortPk(picked.pubkey, 8)}` : " · no Solphia wallet yet"}
              {picked.walletCount ? ` · ${picked.walletCount} wallet${picked.walletCount === 1 ? "" : "s"}` : ""}
            </p>
            <p className="font-mono text-[10px] text-mute">
              Last seen {picked.lastSeen ? new Date(picked.lastSeen).toLocaleString() : "never"} · invited {picked.referredCount} ·
              deposited {picked.depositedSol.toFixed(3)} SOL · rank {picked.rank} ({picked.xp} XP)
            </p>
            {picked.pubkey ? (
              <label className="block" data-field="username">
                <span className="font-mono text-[10px] text-mute">Username</span>
                <input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    fieldErr.clear("username");
                  }}
                  placeholder="@handle"
                  aria-invalid={Boolean(fieldErr.errors.username)}
                  className={`mt-1 min-h-[40px] w-full rounded-full border bg-void px-4 font-mono text-[12px] text-ghost ${fieldClass(fieldErr.errors.username, "border-line")}`}
                />
                <FieldError error={fieldErr.errors.username} />
              </label>
            ) : (
              <p className="font-mono text-[10px] text-mute">Username, seat, and mods attach after they add a Solphia wallet.</p>
            )}
            <label className="block" data-field="email">
              <span className="font-mono text-[10px] text-mute">Email</span>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  fieldErr.clear("email");
                }}
                placeholder="optional"
                aria-invalid={Boolean(fieldErr.errors.email)}
                className={`mt-1 min-h-[40px] w-full rounded-full border bg-void px-4 font-mono text-[12px] text-ghost ${fieldClass(fieldErr.errors.email, "border-line")}`}
              />
              <FieldError error={fieldErr.errors.email} />
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
              {picked.accountId && picked.email && !picked.emailVerified ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ user: { pubkey: picked.pubkey || undefined, accountId: picked.accountId || undefined, verifyEmail: true } })}
                  className="btn-ghost rounded-full px-4 py-2 text-sm"
                >
                  Mark email verified
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy || !picked.pubkey}
                onClick={() => patch({ user: { pubkey: picked.pubkey || undefined, accountId: picked.accountId || undefined, grantAdmin: !picked.admin } })}
                className="btn-ghost rounded-full px-4 py-2 text-sm disabled:opacity-40"
              >
                {picked.admin ? "Revoke admin" : "Make admin"}
              </button>
              <button
                type="button"
                disabled={busy || picked.admin || !picked.pubkey}
                onClick={() => patch({ user: { pubkey: picked.pubkey || undefined, accountId: picked.accountId || undefined, grantMod: !picked.mod } })}
                className="btn-ghost rounded-full px-4 py-2 text-sm disabled:opacity-40"
              >
                {picked.mod ? "Revoke mod" : "Make mod"}
              </button>
              <button
                type="button"
                disabled={busy || !picked.pubkey}
                onClick={() => patch({ user: { pubkey: picked.pubkey || undefined, accountId: picked.accountId || undefined, comped: !picked.comped } })}
                className="btn-ghost rounded-full px-4 py-2 text-sm disabled:opacity-40"
              >
                {picked.comped ? "Uncomp" : "Comp seat"}
              </button>
              <button
                type="button"
                disabled={busy || !picked.pubkey}
                onClick={() => patch({ user: { pubkey: picked.pubkey || undefined, accountId: picked.accountId || undefined, alertsEnabled: !picked.alertsEnabled } })}
                className="btn-ghost rounded-full px-4 py-2 text-sm disabled:opacity-40"
              >
                Alerts {picked.alertsEnabled ? "on" : "off"}
              </button>
              {picked.pubkey ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ user: { pubkey: picked.pubkey || undefined, accountId: picked.accountId || undefined, clearUsername: true } })}
                  className="btn-ghost rounded-full px-4 py-2 text-sm"
                >
                  Clear username
                </button>
              ) : null}
            </div>
            <div className="border-t border-line pt-3">
              <p className="text-sm text-mute">
                {picked.pubkey
                  ? "Delete removes the wallet account, trading book, and 24/7 key. Coins they launched stay on the tape."
                  : "Delete removes the email/Google login. On-chain wallets are not touched."}
              </p>
              <input
                value={confirmDel}
                onChange={(e) => setConfirmDel(e.target.value)}
                placeholder={`type ${(picked.pubkey || picked.accountId || "").slice(-4)} to delete`}
                className="mt-2 min-h-[40px] w-full rounded-full border border-blood/30 bg-void px-4 font-mono text-[11px] text-ghost"
              />
              <button
                type="button"
                disabled={busy || confirmDel !== (picked.pubkey || picked.accountId || "").slice(-4)}
                onClick={async () => {
                  await patch({ user: { pubkey: picked.pubkey || undefined, accountId: picked.accountId || undefined, delete: true } });
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
