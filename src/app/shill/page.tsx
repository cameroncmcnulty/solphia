"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Paperclip, Pin, Reply, Send, Smile } from "lucide-react";
import { CartoonPfp } from "@/components/CartoonPfp";
import { CircleSwap } from "@/components/CircleSwap";
import { WalletConnect } from "@/components/WalletConnect";
import { useOwner } from "@/lib/hooks";
import { paySeatFromPhantom } from "@/lib/wallet/trading";
import { SHILL_REACTS, SHILL_STICKERS, type ShillToken } from "@/lib/shill/types";

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
  token?: ShillToken;
};

type PinRow = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  priceUsd?: number;
  mcUsd?: number;
  endsAt: number;
};

type Pack = {
  messages?: Msg[];
  pins?: PinRow[];
  pinSlots?: number;
  nextFreeAt?: number;
  pinSol?: number;
  typing?: string[];
  profiles?: Record<string, { username: string; hasPfp?: boolean }>;
  treasury?: string;
};

function when(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function nameOf(pk: string, profiles?: Pack["profiles"]) {
  const u = profiles?.[pk]?.username;
  return u ? `@${u}` : `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function pfpSrc(pk: string, profiles?: Pack["profiles"]) {
  const p = profiles?.[pk];
  if (p?.hasPfp) return `/api/circle/avatar?pk=${encodeURIComponent(pk)}`;
  return undefined;
}

function fmtMc(n?: number) {
  if (!(n && n > 0)) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
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

function TokenBubble({ token, compact }: { token: ShillToken; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl border border-acid/30 bg-acid/[0.08] ${compact ? "p-1.5" : "p-2"}`}>
      {token.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={token.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-void font-display text-sm text-acid">
          {(token.symbol || "?").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-display text-sm text-ghost">${(token.symbol || "").replace(/^\$/, "")}</div>
        <div className="truncate font-mono text-[10px] text-mute">
          {token.name}
          {token.mcUsd ? ` · ${fmtMc(token.mcUsd)}` : ""}
        </div>
        <button
          type="button"
          className="font-mono text-[10px] text-acid"
          onClick={() => navigator.clipboard.writeText(token.mint)}
        >
          copy CA
        </button>
      </div>
    </div>
  );
}

export default function ShillPage() {
  const owner = useOwner();
  const [pack, setPack] = useState<Pack | null>(null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Msg | null>(null);
  const [stickers, setStickers] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pinMint, setPinMint] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hold = useRef<number>(0);

  const load = useCallback(async () => {
    const q = owner ? `?pubkey=${encodeURIComponent(owner)}` : "";
    const r = await fetch(`/api/shill${q}`, { cache: "no-store" });
    const j = await r.json();
    setPack(j);
  }, [owner]);

  useEffect(() => {
    load().catch(() => {});
    const t = setInterval(() => load().catch(() => {}), 3500);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pack?.messages?.length]);

  async function act(body: Record<string, unknown>) {
    if (!owner) throw new Error("Connect your wallet.");
    const r = await fetch("/api/shill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, pubkey: owner }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || j.error || "failed");
    return j;
  }

  async function send(extra?: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      await act({ action: "chat", text, replyTo: reply?.id, ...extra });
      setText("");
      setReply(null);
      setStickers(false);
      await load();
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
      fd.append("file", blob, "shill.jpg");
      if (reply?.id) fd.append("replyTo", reply.id);
      const r = await fetch("/api/shill/media", { method: "POST", body: fd });
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

  async function pin() {
    if (!owner) return;
    setErr("");
    setPinBusy(true);
    try {
      const prep = await act({ action: "pin", mint: pinMint.trim() });
      if (!prep.treasury || !prep.sol) throw new Error(prep.message || "Could not start the pin.");
      const sig = await paySeatFromPhantom(owner, prep.treasury, Number(prep.sol));
      if (!sig) throw new Error("Payment did not send.");
      await act({ action: "pin", mint: pinMint.trim(), signature: sig });
      setPinMint("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "pin failed");
    } finally {
      setPinBusy(false);
    }
  }

  const msgs = pack?.messages || [];
  const byId = useMemo(() => Object.fromEntries(msgs.map((m) => [m.id, m])), [msgs]);
  const pins = pack?.pins || [];
  const slots = pack?.pinSlots ?? 0;
  const nextFree = pack?.nextFreeAt || 0;
  const waitMin = Math.max(1, Math.ceil((nextFree - Date.now()) / 60_000));

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 pt-3 md:h-[calc(100vh-5rem)] md:flex-row md:px-6">
        <section className="flex min-h-[70vh] min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-violet/25 bg-[#0b0614]/90 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <header className="flex items-center justify-between border-b border-violet/20 px-4 py-3">
            <div>
              <div className="font-mono text-[10px] tracking-[0.22em] text-acid">🪩 SHILL ZONE</div>
              <h1 className="font-display text-xl text-ghost">Talk. Shill. Swap.</h1>
            </div>
            {!owner && <WalletConnect />}
          </header>
          {pins.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-b border-violet/15 px-3 py-2">
              {pins.map((p) => (
                <div key={p.id} className="min-w-[11rem] shrink-0">
                  <TokenBubble token={p} compact />
                </div>
              ))}
            </div>
          )}
          <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-4" onClick={() => setPicker(null)}>
            {msgs.map((m) => {
              const mine = m.owner === owner;
              const quoted = m.replyTo ? byId[m.replyTo] : null;
              const reacts = Object.entries(m.reactions || {}).filter(([, pks]) => pks.length);
              const seen = mine && Date.now() - m.at > 1600;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <CartoonPfp seed={m.owner} src={pfpSrc(m.owner, pack?.profiles)} className="h-8 w-8 shrink-0" />
                  <div className={`relative max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="mb-0.5 font-mono text-[10px] text-mute">{nameOf(m.owner, pack?.profiles)}</div>
                    <div
                      className={`relative rounded-2xl px-3 py-2 text-sm leading-snug ${
                        mine ? "rounded-br-md bg-acid/20 text-ghost" : "rounded-bl-md bg-white/[0.07] text-ghost"
                      }`}
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
                      {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                      {m.token && (
                        <div className="mt-2">
                          <TokenBubble token={m.token} />
                        </div>
                      )}
                    </div>
                    {reacts.length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                        {reacts.map(([emoji, pks]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              react(m.id, emoji);
                            }}
                            className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-[2px] text-[13px] ${
                              owner && pks.includes(owner) ? "border-acid/50 bg-acid/15" : "border-white/10 bg-[#12081c]"
                            }`}
                          >
                            <span>{emoji}</span>
                            {pks.length > 1 ? <span className="font-mono text-[10px] text-mute">{pks.length}</span> : null}
                          </button>
                        ))}
                      </div>
                    )}
                    {picker === m.id && (
                      <div className="z-20 mt-1 flex gap-1 rounded-full border border-violet/30 bg-[#12081c] px-2 py-1 shadow-lg">
                        {SHILL_REACTS.map((emoji) => (
                          <button key={emoji} type="button" className="text-lg leading-none" onClick={() => react(m.id, emoji)}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[9px] text-mute">{when(m.at)}</span>
                      {mine && (seen ? <CheckCheck className="h-3 w-3 text-acid" /> : <Check className="h-3 w-3 text-mute" />)}
                      <button type="button" className="text-mute hover:text-acid" onClick={() => setReply(m)} title="Reply">
                        <Reply className="h-3 w-3" />
                      </button>
                      {mine && (
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
            {(pack?.typing || []).length > 0 && (
              <div className="font-mono text-[11px] text-acid">
                {(pack?.typing || []).map((pk) => nameOf(pk, pack?.profiles)).join(", ")} typing…
              </div>
            )}
          </div>
          {!owner ? (
            <div className="border-t border-violet/20 p-4 text-center text-sm text-mute">Connect to chat.</div>
          ) : (
            <>
              {reply && (
                <div className="flex items-center justify-between border-t border-violet/20 px-3 py-1.5 text-[12px] text-mute">
                  <span>
                    Replying to {nameOf(reply.owner, pack?.profiles)}: {reply.text || reply.sticker || "photo"}
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
                  placeholder="Shill a project. Drop a CA."
                  className="min-h-[44px] flex-1 rounded-2xl border border-violet/25 bg-void px-3 py-2 text-sm text-ghost outline-none"
                />
                <button type="submit" disabled={busy} className="btn-acid rounded-full p-2.5 disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              {stickers && (
                <div className="flex flex-wrap gap-2 border-t border-violet/20 px-3 py-2 text-2xl">
                  {SHILL_STICKERS.map((s) => (
                    <button key={s} type="button" onClick={() => send({ sticker: s, kind: "sticker" })}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {err && <p className="px-4 pb-2 text-sm text-blood">{err}</p>}
            </>
          )}
        </section>

        <aside className="flex shrink-0 flex-col gap-3 md:w-[300px]">
          <div className="rounded-3xl border border-acid/25 bg-acid/[0.06] p-4">
            <div className="font-mono text-[10px] tracking-[0.22em] text-acid">PIN POST · 0.2 SOL · 3H</div>
            <p className="mt-1 text-sm text-mute">Five spots. Token bubble sits at the top of chat.</p>
            <div className="mt-2 font-mono text-[11px] text-ghost">
              {slots > 0 ? `${slots} spots open` : `No spots · next in ${waitMin}m`}
            </div>
            {owner ? (
              <>
                <input
                  value={pinMint}
                  onChange={(e) => setPinMint(e.target.value.trim())}
                  placeholder="Token CA"
                  className="mt-2 w-full rounded-xl border border-violet/25 bg-void px-3 py-2 font-mono text-[11px] text-ghost outline-none"
                />
                <button
                  type="button"
                  disabled={pinBusy || !pinMint}
                  onClick={pin}
                  className="btn-acid mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm disabled:opacity-40"
                >
                  <Pin className="h-4 w-4" />
                  {pinBusy ? "Paying…" : "Pin · 0.2 SOL"}
                </button>
              </>
            ) : (
              <div className="mt-3">
                <WalletConnect />
              </div>
            )}
          </div>
          {owner && <CircleSwap owner={owner} />}
        </aside>
      </div>
    </main>
  );
}
