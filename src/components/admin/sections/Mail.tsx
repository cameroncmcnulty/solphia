"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail as MailIcon, Plus, Send, Star } from "lucide-react";
import { SphaMark } from "@/components/SphaMark";

type Identity = { local: string; name: string; email: string; createdAt: number };
type Message = {
  id: string;
  at: number;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  html: string;
  folder: string;
  status: string;
  error?: string;
  starred?: boolean;
};

type Pack = { identities: Identity[]; messages: Message[]; signature: string; admin: string };

export function MailSection() {
  const [pack, setPack] = useState<Pack | null>(null);
  const [folder, setFolder] = useState<"inbox" | "sent" | "drafts" | "outbox" | "compose">("compose");
  const [fromLocal, setFromLocal] = useState("admin");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [newLocal, setNewLocal] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/mail", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) setPack(j);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const ident = pack?.identities.find((i) => i.local === fromLocal) || pack?.identities[0];
  const rows = useMemo(() => {
    const list = pack?.messages || [];
    if (folder === "compose") return [];
    return list.filter((m) => m.folder === folder);
  }, [pack, folder]);
  const opened = rows.find((m) => m.id === openId) || (pack?.messages || []).find((m) => m.id === openId);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    setNote("");
    try {
      const r = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || "failed");
      await load();
      return j;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function send(draft = false) {
    const j = await post({
      action: draft ? "draft" : "send",
      fromLocal,
      to,
      cc,
      subject,
      html: `<div style="font-family:Georgia,serif;color:#f4f0ea;font-size:15px;line-height:1.6;">${body
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>")}</div>`,
    });
    if (!j) return;
    setNote(draft ? "Draft saved." : j.message?.status === "preview" ? "Stored in sent (SMTP off)." : "Sent.");
    if (!draft) {
      setTo("");
      setCc("");
      setSubject("");
      setBody("");
      setFolder("sent");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-mute">SOLPHIA MAIL</div>
        <h2 className="mt-1 font-display text-3xl text-ghost">admin@solphia.io</h2>
        <p className="mt-1 max-w-2xl text-sm text-mute">
          Compose, send, and create more @solphia.io addresses. Signature uses the SPHA mark — never the Solana logo.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {(["compose", "sent", "drafts", "outbox", "inbox"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFolder(f);
                setOpenId(null);
              }}
              className={`flex w-full items-center gap-2 rounded-full px-4 py-2 text-left text-sm capitalize ${
                folder === f ? "bg-acid/20 text-acid" : "text-mute hover:text-ghost"
              }`}
            >
              {f === "compose" ? <Send className="h-4 w-4" /> : <MailIcon className="h-4 w-4" />}
              {f}
            </button>
          ))}
          <div className="mt-6 rounded-2xl border border-violet/20 p-3">
            <div className="font-mono text-[10px] tracking-[0.16em] text-mute">ADDRESSES</div>
            <div className="mt-2 space-y-1">
              {(pack?.identities || []).map((i) => (
                <button
                  key={i.local}
                  type="button"
                  onClick={() => setFromLocal(i.local)}
                  className={`block w-full truncate rounded-full px-3 py-1 text-left font-mono text-[11px] ${
                    fromLocal === i.local ? "bg-acid/15 text-acid" : "text-mute"
                  }`}
                >
                  {i.email}
                </button>
              ))}
            </div>
            <input
              value={newLocal}
              onChange={(e) => setNewLocal(e.target.value)}
              placeholder="name"
              className="mt-3 w-full rounded-full border border-violet/30 bg-void px-3 py-1.5 font-mono text-[11px] text-ghost"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="display name"
              className="mt-1 w-full rounded-full border border-violet/30 bg-void px-3 py-1.5 text-[12px] text-ghost"
            />
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const j = await post({ action: "create", local: newLocal, name: newName });
                if (j) {
                  setNewLocal("");
                  setNewName("");
                  setNote(`${j.identity.email} created`);
                }
              }}
              className="btn-ghost mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full py-1.5 text-[12px]"
            >
              <Plus className="h-3 w-3" />
              Create @solphia.io
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          {folder === "compose" ? (
            <div className="rounded-3xl border border-violet/20 bg-void/40 p-5">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-mute">
                From
                <select
                  value={fromLocal}
                  onChange={(e) => setFromLocal(e.target.value)}
                  className="rounded-full border border-violet/30 bg-void px-3 py-1 text-ghost"
                >
                  {(pack?.identities || []).map((i) => (
                    <option key={i.local} value={i.local}>
                      {i.email}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="To"
                className="mt-3 w-full rounded-2xl border border-violet/25 bg-void px-4 py-2 text-sm text-ghost"
              />
              <input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Cc (optional)"
                className="mt-2 w-full rounded-2xl border border-violet/25 bg-void px-4 py-2 text-sm text-ghost"
              />
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="mt-2 w-full rounded-2xl border border-violet/25 bg-void px-4 py-2 text-sm text-ghost"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the note…"
                rows={10}
                className="mt-2 w-full rounded-2xl border border-violet/25 bg-void px-4 py-3 text-sm text-ghost"
              />
              <div className="mt-4 rounded-2xl border border-acid/20 bg-acid/[0.04] p-4">
                <div className="font-mono text-[10px] tracking-[0.18em] text-acid">SIGNATURE</div>
                <div className="mt-3 flex items-center gap-3">
                  <SphaMark className="h-11 w-11" />
                  <div>
                    <div className="font-display text-lg text-ghost">{ident?.name || "Solphia"}</div>
                    <div className="font-mono text-[11px] text-acid">{ident?.email || "admin@solphia.io"}</div>
                    <div className="mt-1 font-mono text-[10px] tracking-[0.22em] text-mute">SOLPHIA</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => send(false)} className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40">
                  Send
                </button>
                <button type="button" disabled={busy} onClick={() => send(true)} className="btn-ghost rounded-full px-5 py-2 text-sm">
                  Save draft
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-violet/20">
              {(rows.length ? rows : []).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOpenId(m.id)}
                  className={`flex w-full items-start gap-3 border-b border-violet/15 px-4 py-3 text-left ${
                    openId === m.id ? "bg-acid/[0.06]" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="mt-1 text-mute"
                    onClick={(e) => {
                      e.stopPropagation();
                      post({ action: "star", id: m.id, starred: !m.starred });
                    }}
                  >
                    <Star className={`h-4 w-4 ${m.starred ? "fill-acid text-acid" : ""}`} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-ghost">{m.subject}</span>
                      <span className="font-mono text-[10px] text-mute">{new Date(m.at).toLocaleString()}</span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-mute">
                      {m.from} → {m.to} · {m.status}
                    </div>
                  </div>
                </button>
              ))}
              {!rows.length && <div className="px-4 py-10 text-center text-sm text-mute">Empty.</div>}
              {opened && (
                <div className="border-t border-violet/20 bg-void/40 p-5">
                  <div className="font-display text-xl text-ghost">{opened.subject}</div>
                  <div className="mt-1 font-mono text-[11px] text-mute">
                    {opened.from} → {opened.to}
                  </div>
                  <div className="prose-invert mt-4 text-sm text-ghost" dangerouslySetInnerHTML={{ __html: opened.html }} />
                  {opened.error && <p className="mt-2 text-sm text-blood">{opened.error}</p>}
                </div>
              )}
            </div>
          )}
          {note && <p className="mt-3 text-sm text-acid">{note}</p>}
          {err && <p className="mt-3 text-sm text-blood">{err}</p>}
        </div>
      </div>
    </div>
  );
}
