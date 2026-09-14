"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CheckCheck, Gift, Paperclip, Reply, Send, Smile } from "lucide-react";
import { CartoonPfp } from "@/components/CartoonPfp";
import { CircleSwap } from "@/components/CircleSwap";
import { TealConfetti } from "@/components/TealConfetti";
import { WalletConnect } from "@/components/WalletConnect";
import { peekRef } from "@/components/ReferralCapture";
import { useOwner } from "@/lib/hooks";
import { CIRCLE_REACTS, CIRCLE_STICKERS } from "@/lib/circle/types";

type Msg = {
  id: string;
  at: number;
  owner: string;
  kind: "text" | "sticker" | "media";
  text?: string;
  media?: string;
  sticker?: string;
  replyTo?: string;
  reactions: Record<string, string[]>;
};
type Pack = {
  members: number;
  member: null | {
    pubkey: string;
    role: string;
    email: string;
    unclaimed: number;
    claimed: number;
    muted: boolean;
    boostPct: number;
    refs: number;
    color: string;
  };
  banned?: boolean;
  messages?: Msg[];
  typing?: string[];
  profiles?: Record<string, { username: string; hasPfp?: boolean; pfp?: string; color: string }>;
  official?: string[];
  mint?: string;
  link?: string;
};

/** Survives React Strict Mode remounts so welcome confetti only bursts once. */
let circleBurst = false;

function when(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function nameOf(pk: string, profiles?: Pack["profiles"]) {
  const u = profiles?.[pk]?.username;
  return u ? `@${u}` : `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function pfpSrc(pk: string, profiles?: Pack["profiles"]) {
  const p = profiles?.[pk];
  if (!p) return undefined;
  if (p.hasPfp) return `/api/circle/avatar?pk=${encodeURIComponent(pk)}`;
  if (p.pfp && (p.pfp.startsWith("http") || p.pfp.startsWith("data:"))) return p.pfp;
  return undefined;
}

async function loadImage(file: File): Promise<CanvasImageSource> {
  try {
    return await createImageBitmap(file);
  } catch {
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Use a JPEG or PNG photo."));
      };
      img.src = url;
    });
  }
}

async function compressImage(file: File): Promise<Blob> {
  const src = await loadImage(file);
  const iw = "width" in src ? Number(src.width) : 1280;
  const ih = "height" in src ? Number(src.height) : 1280;
  const scale = Math.min(1, 1280 / Math.max(iw, ih, 1));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Could not compress.");
  ctx.drawImage(src, 0, 0, w, h);
  let q = 0.82;
  let blob: Blob | null = null;
  while (q >= 0.48) {
    blob = await new Promise((resolve) => c.toBlob(resolve, "image/jpeg", q));
    if (blob && blob.size <= 850_000) break;
    q -= 0.12;
  }
  if (blob && blob.size <= 900_000) return blob;
  if (file.size <= 900_000 && file.type.startsWith("image/")) return file;
  throw new Error("Image is too large. Try a smaller photo.");
}

export default function CirclePage() {
  return (
    <Suspense fallback={<div className="p-8 text-mute">Opening the circle…</div>}>
      <CircleInner />
    </Suspense>
  );
}

function CircleInner() {
  const owner = useOwner();
  const params = useSearchParams();
  const [pack, setPack] = useState<Pack | null>(null);
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Msg | null>(null);
  const [stickers, setStickers] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [fire, setFire] = useState(false);
  const [joined, setJoined] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hold = useRef<number>(0);
  const welcome = params.get("welcome") === "1";

  const load = useCallback(async () => {
    const q = owner ? `?pubkey=${encodeURIComponent(owner)}` : "";
    const r = await fetch(`/api/circle${q}`, { cache: "no-store" });
    const j = await r.json();
    setPack(j);
    setReady(true);
  }, [owner]);

  useEffect(() => {
    load().catch(() => setReady(true));
    const t = setInterval(() => load().catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [load]);

  const member = pack?.member;

  useEffect(() => {
    if (!ready || !member || circleBurst) return;
    if (!welcome && !joined) return;
    const t = window.setTimeout(() => {
      if (circleBurst) return;
      circleBurst = true;
      setFire(true);
      window.setTimeout(() => setFire(false), 2200);
    }, 360);
    return () => window.clearTimeout(t);
  }, [ready, member, welcome, joined]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pack?.messages?.length]);

  async function act(body: Record<string, unknown>) {
    if (!owner) return;
    const r = await fetch("/api/circle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, pubkey: owner }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || j.error || "failed");
    return j;
  }

  async function join() {
    setErr("");
    setBusy(true);
    try {
      await act({ action: "join", email, referrer: params.get("ref") || peekRef() || "" });
      setJoined(true);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "join failed");
    } finally {
      setBusy(false);
    }
  }

  async function send(extra?: Record<string, unknown>) {
    if (pack?.member?.muted) return;
    setBusy(true);
    try {
      await act({ action: "chat", text, replyTo: reply?.id, ...extra });
      setText("");
      setReply(null);
      setStickers(false);
      await load();
      act({ action: "read" }).catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "send failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    if (!owner) return;
    setErr("");
    setBusy(true);
    try {
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append("pubkey", owner);
      fd.append("file", blob, "circle.jpg");
      if (reply?.id) fd.append("replyTo", reply.id);
      const r = await fetch("/api/circle/media", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || j.error || "upload failed");
      setReply(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "media failed");
    } finally {
      setBusy(false);
    }
  }

  async function react(id: string, emoji: string) {
    try {
      await act({ action: "react", id, emoji });
      setPicker(null);
      await load();
    } catch {
      /* ignore */
    }
  }

  async function withdraw() {
    setErr("");
    setNote("");
    setBusy(true);
    try {
      const j = await act({ action: "claim" });
      setNote(`Claimed ${Number(j.amount || 0).toFixed(4)} · ${(j.signature || "").slice(0, 8)}…`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "claim failed");
    } finally {
      setBusy(false);
    }
  }

  const msgs = pack?.messages || [];
  const byId = useMemo(() => Object.fromEntries(msgs.map((m) => [m.id, m])), [msgs]);
  const official = useMemo(() => new Set(pack?.official || []), [pack?.official]);
  const link = typeof window !== "undefined" ? `${window.location.origin}/circle?ref=${owner || ""}` : pack?.link || "";
  const selfGlow = Boolean(owner && official.has(owner));

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-4">
      <TealConfetti fire={fire} />
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 pt-3 md:h-[calc(100vh-5rem)] md:flex-row md:px-6">
        <section className="flex min-h-[70vh] min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-violet/25 bg-[#0b0614]/90 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:order-1">
          {!owner ? (
            <Gate title="Connect your wallet" body="Founders Circle is wallet-in. Then drop an email for project updates.">
              <WalletConnect />
            </Gate>
          ) : pack?.banned ? (
            <Gate title="Not this door" body="This wallet is banned from Founders Circle." />
          ) : !member ? (
            <Gate title="Take a seat" body="Connect is done. Email gets you project updates and unlocks the hub. Spots are limited.">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full max-w-sm rounded-full border border-violet/30 bg-void px-4 py-2 text-ghost outline-none"
              />
              <button type="button" disabled={busy} onClick={join} className="btn-acid mt-3 rounded-full px-6 py-2 disabled:opacity-40">
                {busy ? "Entering…" : "Enter Founders Circle"}
              </button>
              {err && <p className="mt-2 text-sm text-blood">{err}</p>}
            </Gate>
          ) : (
            <>
              <header className="flex items-center justify-between border-b border-violet/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className={selfGlow ? "rounded-full ring-2 ring-acid shadow-[0_0_16px_rgba(20,241,149,0.55)]" : ""}>
                    <CartoonPfp seed={owner} src={pfpSrc(owner, pack.profiles)} className="h-8 w-8" />
                  </div>
                  <span className="font-display text-lg text-ghost">Circle chat</span>
                </div>
                <span className="font-mono text-[10px] text-mute">{member.role}</span>
              </header>
              <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-4" onClick={() => setPicker(null)}>
                {msgs.map((m) => {
                  const mine = m.owner === owner;
                  const quoted = m.replyTo ? byId[m.replyTo] : null;
                  const prof = pack.profiles?.[m.owner];
                  const glow = official.has(m.owner);
                  const seen = mine && Date.now() - m.at > 1600;
                  const reacts = Object.entries(m.reactions || {}).filter(([, pks]) => pks.length);
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                      <div className={`relative shrink-0 ${glow ? "rounded-full ring-2 ring-acid shadow-[0_0_16px_rgba(20,241,149,0.55)]" : ""}`}>
                        <CartoonPfp seed={m.owner} src={pfpSrc(m.owner, pack.profiles)} className="h-8 w-8" />
                      </div>
                      <div className={`relative max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                        <div className="mb-0.5 flex items-center gap-1.5 font-mono text-[10px]" style={{ color: glow ? "#14f195" : prof?.color }}>
                          {nameOf(m.owner, pack.profiles)}
                          {glow && <span className="rounded-full bg-acid/20 px-1.5 py-px text-[9px] tracking-wide text-acid">PROJECT</span>}
                        </div>
                        <div
                          className={`relative rounded-2xl px-3 py-2 text-sm leading-snug ${
                            mine ? "rounded-br-md bg-acid/20 text-ghost" : "rounded-bl-md bg-white/[0.07] text-ghost"
                          } ${glow ? "shadow-[0_0_22px_rgba(20,241,149,0.18)]" : ""}`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setPicker(m.id);
                          }}
                          onDoubleClick={() => react(m.id, "❤️")}
                          onTouchStart={() => {
                            window.clearTimeout(hold.current);
                            hold.current = window.setTimeout(() => setPicker(m.id), 450);
                          }}
                          onTouchEnd={() => window.clearTimeout(hold.current)}
                          onTouchMove={() => window.clearTimeout(hold.current)}
                        >
                          {quoted && (
                            <div className="mb-1 rounded-lg border-l-2 border-acid/60 bg-black/25 px-2 py-1 text-[11px] text-mute">
                              {quoted.sticker || quoted.text || "photo"}
                            </div>
                          )}
                          {m.kind === "sticker" && <div className="text-4xl">{m.sticker}</div>}
                          {m.kind === "media" && m.media && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.media} alt="" className="max-h-56 rounded-xl" />
                          )}
                          {m.text && <div>{m.text}</div>}
                        </div>
                        {reacts.length > 0 && (
                          <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                            {reacts.map(([emoji, pks]) => {
                              const mineReact = owner ? pks.includes(owner) : false;
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    react(m.id, emoji);
                                  }}
                                  className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-[2px] text-[13px] leading-none ${
                                    mineReact ? "border-acid/50 bg-acid/15" : "border-white/10 bg-[#12081c]"
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  {pks.length > 1 ? <span className="font-mono text-[10px] text-mute">{pks.length}</span> : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {picker === m.id && (
                          <div
                            className={`z-20 mt-1 flex gap-1 rounded-full border border-violet/30 bg-[#12081c] px-2 py-1 shadow-lg ${mine ? "self-end" : "self-start"}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {CIRCLE_REACTS.map((emoji) => (
                              <button key={emoji} type="button" className="text-lg leading-none" onClick={() => react(m.id, emoji)}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-[9px] text-mute">{when(m.at)}</span>
                          {mine && (seen ? <CheckCheck className="h-3 w-3 text-acid" /> : <Check className="h-3 w-3 text-mute" />)}
                          <button
                            type="button"
                            className="text-mute hover:text-acid"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPicker(picker === m.id ? null : m.id);
                            }}
                            title="React"
                          >
                            <Smile className="h-3 w-3" />
                          </button>
                          <button type="button" className="text-mute hover:text-acid" onClick={() => setReply(m)} title="Reply">
                            <Reply className="h-3 w-3" />
                          </button>
                          {(mine || member.role === "mod" || member.role === "admin") && (
                            <button
                              type="button"
                              className="text-[10px] text-mute hover:text-blood"
                              onClick={() => act({ action: "delete", id: m.id }).then(() => load())}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(pack.typing || []).length > 0 && (
                  <div className="font-mono text-[11px] text-acid">
                    {(pack.typing || []).map((pk) => nameOf(pk, pack.profiles)).join(", ")} typing…
                  </div>
                )}
              </div>
              {member.muted && <p className="px-4 text-sm text-blood">You are muted.</p>}
              {reply && (
                <div className="flex items-center justify-between border-t border-violet/20 px-3 py-1.5 text-[12px] text-mute">
                  <span>
                    Replying to {nameOf(reply.owner, pack.profiles)}: {reply.text || reply.sticker || "photo"}
                  </span>
                  <button type="button" onClick={() => setReply(null)}>
                    ×
                  </button>
                </div>
              )}
              <form
                className="flex items-end gap-2 border-t border-violet/20 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <button type="button" className="text-mute hover:text-acid" onClick={() => setStickers((v) => !v)}>
                  <Smile className="h-5 w-5" />
                </button>
                <button type="button" className="text-mute hover:text-acid" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.target.value = "";
                  }}
                />
                <input
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    act({ action: "typing" }).catch(() => {});
                  }}
                  placeholder="Message the circle"
                  className="min-h-[44px] flex-1 rounded-2xl border border-violet/25 bg-void px-3 py-2 text-sm text-ghost outline-none"
                />
                <button type="submit" disabled={busy || member.muted} className="btn-acid rounded-full p-2.5 disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              {stickers && (
                <div className="flex flex-wrap gap-2 border-t border-violet/20 px-3 py-2 text-2xl">
                  {CIRCLE_STICKERS.map((s) => (
                    <button key={s} type="button" onClick={() => send({ sticker: s, kind: "sticker" })}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {err && <p className="px-4 pb-2 text-sm text-blood">{err}</p>}
              {note && <p className="px-4 pb-2 text-sm text-acid">{note}</p>}
            </>
          )}
        </section>

        <aside className="flex shrink-0 flex-col gap-3 md:order-2 md:w-[280px]">
          <div className="rounded-3xl border border-acid/25 bg-acid/[0.06] p-4">
            <div className="font-mono text-[10px] tracking-[0.22em] text-acid">FOUNDERS CIRCLE</div>
            <h1 className="mt-1 font-display text-2xl text-ghost">The hangout hub</h1>
            <p className="mt-1 text-sm text-mute">Spots are limited. Early supporters only.</p>
            <div className="mt-3 font-mono text-[11px] text-ghost">{pack ? `${pack.members} founders in` : "…"}</div>
          </div>
          {member && (
            <>
              <button
                type="button"
                disabled={busy || !(member.unclaimed > 0)}
                onClick={withdraw}
                className="btn-acid inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm disabled:opacity-40"
              >
                <Gift className="h-4 w-4" />
                Withdraw {member.unclaimed > 0 ? member.unclaimed.toFixed(2) : "airdrop"}
              </button>
              <div className="rounded-2xl border border-violet/20 bg-void/40 p-3">
                <div className="font-mono text-[10px] tracking-[0.16em] text-mute">YOUR LINK · +5% / FRIEND FOR LIFE</div>
                <p className="mt-1 text-[12px] text-mute">
                  {member.refs} in · {member.boostPct}% boost on every drop
                </p>
                <button
                  type="button"
                  className="mt-2 w-full truncate rounded-full border border-violet/30 px-3 py-1.5 font-mono text-[10px] text-ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  {copied ? "copied" : link.replace(/^https?:\/\//, "")}
                </button>
              </div>
              {owner && <CircleSwap owner={owner} />}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function Gate({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Gift className="h-10 w-10 text-acid" />
      <h2 className="mt-4 font-display text-3xl text-ghost">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-mute">{body}</p>
      <div className="mt-6 flex w-full flex-col items-center">{children}</div>
    </div>
  );
}
