"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Pin, Reply, Send, Smile, Trophy } from "lucide-react";
import { BurstSticker } from "@/components/BurstSticker";
import { fmtLeft } from "@/components/BoostBuy";
import { CartoonPfp } from "@/components/CartoonPfp";
import { CircleSwap } from "@/components/CircleSwap";
import { WalletConnect } from "@/components/WalletConnect";
import { RankBadge } from "@/components/RankBadge";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { PumpLoop } from "@/components/PumpLoop";
import { ShillMark } from "@/components/ShillMark";
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

type RankCard = {
  pubkey: string;
  username: string;
  hasPfp?: boolean;
  rank: number;
  title: string;
  xp: number;
  need: number;
  pct: number;
  role?: "admin" | "mod" | null;
  staff?: boolean;
};

type Pack = {
  messages?: Msg[];
  pins?: PinRow[];
  pinSlots?: number;
  nextFreeAt?: number;
  pinSol?: number;
  typing?: string[];
  profiles?: Record<string, RankCard>;
  board?: RankCard[];
  you?: RankCard | null;
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

function rankOf(pk: string, profiles?: Pack["profiles"]) {
  return profiles?.[pk]?.rank || 1;
}

function fmtMc(n?: number) {
  if (!(n && n > 0)) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
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
  const hold = useRef<number>(0);
  const [peek, setPeek] = useState<string | null>(null);
  const [toast, setToast] = useState("");

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
      const sent = await act({ action: "chat", text, replyTo: reply?.id, ...extra });
      setText("");
      setReply(null);
      setStickers(false);
      if (sent?.leveled) {
        setToast(`Rank up. You are ${sent.rank}.`);
        window.setTimeout(() => setToast(""), 3200);
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "send failed");
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

  const you = pack?.you;
  const board = pack?.board || [];

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0e1621] pb-[calc(3.6rem+env(safe-area-inset-bottom))] md:h-[calc(100dvh-5.5rem)] md:pb-0">
      {peek && (
        <ProfileOverlay
          pubkey={peek}
          viewer={owner}
          onClose={() => setPeek(null)}
          onModerated={() => load().catch(() => {})}
        />
      )}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center">
          <div className="rounded-full border border-acid/50 bg-acid px-5 py-2 font-display text-lg text-void shadow-[0_0_30px_rgba(20,241,149,0.45)]">
            {toast}
          </div>
        </div>
      )}
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col md:max-w-none md:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0e1621]">
          <header className="flex items-center gap-3 bg-[#17212b] px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
            {you ? (
              <button type="button" onClick={() => owner && setPeek(owner)} className="shrink-0">
                <CartoonPfp seed={owner || "solphia"} src={pfpSrc(owner || "", pack?.profiles)} className="h-10 w-10" />
              </button>
            ) : (
              <ShillMark className="h-10 w-10 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold text-ghost">Shill Zone</div>
              <div className="truncate text-[12px] text-mute">{you ? `${you.rank} ${you.title}` : "Online"}</div>
            </div>
            <PumpLoop />
            {!owner && <WalletConnect />}
          </header>
          {board.length > 0 && (
            <div className="flex gap-2 overflow-x-auto bg-[#17212b] px-3 py-2 md:hidden">
              {board.slice(0, 8).map((row, i) => (
                <button
                  key={row.pubkey}
                  type="button"
                  onClick={() => setPeek(row.pubkey)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet/25 bg-[#0e1621] px-2 py-1"
                >
                  <span className="font-mono text-[10px] text-mute">{i + 1}</span>
                  <RankBadge rank={row.rank} size={22} />
                  <span className="max-w-[7rem] truncate text-[11px] text-ghost">{row.username ? `@${row.username}` : `${row.pubkey.slice(0, 4)}…`}</span>
                </button>
              ))}
            </div>
          )}
          {pins.length > 0 && (
            <div className="bg-[#17212b] px-2 py-2">
              <div className="boost-rail">
                {pins.map((p) => {
                  const ticker = (p.symbol || "").replace(/^\$/, "");
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title="Copy CA"
                      onClick={() => navigator.clipboard.writeText(p.mint)}
                      className="boost-tile"
                    >
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" className="boost-tile-art" />
                      ) : (
                        <div className="boost-tile-art flex items-center justify-center font-display text-xs text-acid">
                          {(ticker || "?").slice(0, 2)}
                        </div>
                      )}
                      <span className="mt-1 block w-full truncate text-center text-[12px] font-semibold text-ghost">
                        ${ticker || "TOKEN"}
                      </span>
                      <span className="stat-num block text-center text-[11px] text-acid">{fmtLeft(Math.max(0, p.endsAt - Date.now()))}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div ref={scroller} className="shill-wallpaper min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3" onClick={() => setPicker(null)}>
            {msgs.map((m) => {
              const mine = m.owner === owner;
              const quoted = m.replyTo ? byId[m.replyTo] : null;
              const reacts = Object.entries(m.reactions || {}).filter(([, pks]) => pks.length);
              const seen = mine && Date.now() - m.at > 1600;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <CartoonPfp
                    seed={m.owner}
                    src={pfpSrc(m.owner, pack?.profiles)}
                    className="h-8 w-8 shrink-0"
                    onClick={() => setPeek(m.owner)}
                  />
                  <div className={`relative max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="mb-0.5 flex items-center gap-1.5 font-mono text-[10px] text-mute">
                      <button type="button" className="hover:text-acid" onClick={() => setPeek(m.owner)}>
                        {nameOf(m.owner, pack?.profiles)}
                      </button>
                      {pack?.profiles?.[m.owner]?.role ? (
                        <span className={`rounded-full px-1.5 py-[1px] text-[9px] ${pack.profiles[m.owner].role === "admin" ? "bg-blood/25 text-blood" : "bg-cyan/20 text-cyan"}`}>
                          {pack.profiles[m.owner].role === "admin" ? "ADMIN" : "MOD"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-acid/15 px-1.5 py-[1px] text-[9px] text-acid">
                          {rankOf(m.owner, pack?.profiles)}
                        </span>
                      )}
                    </div>
                    <div
                      className={`relative max-w-[78vw] rounded-xl px-2.5 py-1.5 text-[15px] leading-[1.35] ${
                        mine ? "rounded-br-sm bg-[#2b5278] text-white" : "rounded-bl-sm bg-[#182533] text-white"
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
                      {m.kind === "sticker" && m.sticker && (
                        <BurstSticker emoji={m.sticker} className="text-5xl leading-none" />
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
                      {pack?.you?.staff && (
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
            <div className="bg-[#17212b] p-4 text-center text-sm text-mute">Connect to chat.</div>
          ) : (
            <>
              {reply && (
                <div className="flex items-center justify-between bg-[#17212b] px-3 py-1.5 text-[12px] text-mute">
                  <span>
                    Replying to {nameOf(reply.owner, pack?.profiles)}: {reply.text || reply.sticker || "photo"}
                  </span>
                  <button type="button" onClick={() => setReply(null)}>
                    ×
                  </button>
                </div>
              )}
              <form
                className="flex items-end gap-2 bg-[#17212b] px-2 py-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <button type="button" className="text-mute hover:text-acid" onClick={() => setStickers((v) => !v)}>
                  <Smile className="h-5 w-5" />
                </button>
                <input
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    act({ action: "typing" }).catch(() => {});
                  }}
                  placeholder="Message"
                  className="min-h-[40px] flex-1 rounded-2xl bg-[#242f3d] px-3 py-2 text-[15px] text-white outline-none"
                />
                <button type="submit" disabled={busy} className="rounded-full bg-[#2b5278] p-2.5 text-white disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              {stickers && (
                <div className="flex flex-wrap gap-2 border-t border-violet/20 bg-[#17212b] px-3 py-2 text-2xl">
                  {SHILL_STICKERS.map((s) => (
                    <button key={s} type="button" onClick={() => send({ sticker: s, kind: "sticker" })}>
                      <BurstSticker emoji={s} className="text-3xl" />
                    </button>
                  ))}
                </div>
              )}
              {err && <p className="px-4 pb-2 text-sm text-blood">{err}</p>}
            </>
          )}
        </section>

        <aside className="hidden w-[300px] shrink-0 flex-col gap-3 overflow-y-auto bg-[#0e1621] p-3 md:flex">
          {you && (
            <button
              type="button"
              onClick={() => owner && setPeek(owner)}
              className="rounded-3xl border border-acid/30 bg-gradient-to-br from-acid/15 to-violet/20 p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <RankBadge rank={you.rank} size={56} />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-acid">YOUR RANK</div>
                  <div className="font-display text-2xl text-ghost">
                    {you.rank} · {you.title}
                  </div>
                  <div className="font-mono text-[10px] text-mute">{you.need === 0 ? "Maxed" : `${you.need} XP to next`}</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-void">
                <div className="h-full bg-acid" style={{ width: `${Math.round((you.pct || 0) * 100)}%` }} />
              </div>
              <p className="mt-2 text-[12px] text-mute">Launch. Chat. Invite. Swap. The badge on your PFP is the receipt.</p>
            </button>
          )}
          <div className="rounded-3xl border border-violet/25 bg-void/50 p-4">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-acid">
              <Trophy className="h-3.5 w-3.5" />
              TOP SHILLERS
            </div>
            <div className="mt-2 space-y-1.5">
              {board.length === 0 && <p className="text-[12px] text-mute">Be first on the board. Drop a CA.</p>}
              {board.map((row, i) => (
                <button
                  key={row.pubkey}
                  type="button"
                  onClick={() => setPeek(row.pubkey)}
                  className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-white/5"
                >
                  <span className="w-4 font-mono text-[11px] text-mute">{i + 1}</span>
                  <RankBadge rank={row.rank} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ghost">{row.username ? `@${row.username}` : `${row.pubkey.slice(0, 4)}…`}</span>
                  <span className="font-mono text-[10px] text-acid">{row.rank}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-acid/25 bg-acid/[0.06] p-4">
            <div className="font-mono text-[10px] tracking-[0.22em] text-acid">👀 PIN · 0.2 SOL · 3H</div>
            <p className="mt-1 text-sm text-mute">Pin your project to the top of the chat.</p>
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
