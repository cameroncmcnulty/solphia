"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCheck, Pin, Reply, Send, Smile, Trophy, X } from "lucide-react";
import { BurstSticker } from "@/components/BurstSticker";
import { fmtLeft } from "@/components/BoostBuy";
import { CartoonPfp } from "@/components/CartoonPfp";
import { CircleSwap } from "@/components/CircleSwap";
import { WalletConnect } from "@/components/WalletConnect";
import { RankBadge } from "@/components/RankBadge";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { useOwner } from "@/lib/hooks";
import { paySeatFromPhantom } from "@/lib/wallet/trading";
import { SHILL_REACTS, SHILL_STICKERS, type ShillToken } from "@/lib/shill/types";

type Msg = {
  id: string;
  at: number;
  owner: string;
  kind: "text" | "sticker" | "media";
  text?: string;
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

function TokenBubble({ token }: { token: ShillToken }) {
  return (
    <div className="mt-1 flex items-center gap-2 rounded-xl bg-black/20 px-2 py-1.5">
      {token.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={token.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-void font-display text-xs text-acid">
          {(token.symbol || "?").slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold text-white">${(token.symbol || "").replace(/^\$/, "")}</div>
        <div className="truncate font-mono text-[10px] text-white/60">
          {token.name}
          {token.mcUsd ? ` · ${fmtMc(token.mcUsd)}` : ""}
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 font-mono text-[10px] text-[#6ab3f3]"
        onClick={() => navigator.clipboard.writeText(token.mint)}
      >
        copy
      </button>
    </div>
  );
}

function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/55" onClick={onClose}>
      <div
        className="max-h-[78%] w-full overflow-y-auto rounded-t-3xl bg-[#17212b] pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-[17px] font-semibold text-white">{title}</div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-white/70" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 pb-5">{children}</div>
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
  const [sheet, setSheet] = useState<"pin" | "ranks" | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const hold = useRef<number>(0);
  const [peek, setPeek] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const stickToBottom = useRef(true);

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
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
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
    stickToBottom.current = true;
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
      setSheet(null);
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
  const online = Math.max(board.length, Object.keys(pack?.profiles || {}).length, owner ? 1 : 0);

  return (
    <main className="fixed inset-0 z-40 flex h-[100dvh] max-h-[100dvh] w-full justify-center overflow-hidden bg-[#0b141a]">
      <div className="relative flex h-full w-full max-w-[52rem] flex-col overflow-hidden bg-[#0e1621] shadow-[0_0_80px_rgba(0,0,0,0.45)] lg:border-x lg:border-white/5">
      {peek && (
        <ProfileOverlay
          pubkey={peek}
          viewer={owner}
          onClose={() => setPeek(null)}
          onModerated={() => load().catch(() => {})}
        />
      )}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-[60] flex justify-center">
          <div className="rounded-full bg-[#14f195] px-5 py-2 font-display text-base text-[#04000a]">{toast}</div>
        </div>
      )}

      <header className="flex shrink-0 items-center gap-1 bg-[#17212b] px-1 pb-2 pt-[max(0.4rem,env(safe-area-inset-top))]">
        <Link href="/" className="flex h-11 w-11 items-center justify-center text-white" aria-label="Back to home">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSheet("ranks")}>
          <div className="truncate text-[17px] font-semibold text-white">Shill Zone</div>
          <div className="truncate text-[13px] text-[#8e9ba8]">{online ? `${online} online` : "group"}</div>
        </button>
        <button type="button" className="flex h-11 w-11 items-center justify-center text-[#8e9ba8]" onClick={() => setSheet("pin")} aria-label="Pin">
          <Pin className="h-5 w-5" />
        </button>
        <button type="button" className="flex h-11 w-11 items-center justify-center text-[#8e9ba8]" onClick={() => setSheet("ranks")} aria-label="Ranks">
          <Trophy className="h-5 w-5" />
        </button>
      </header>

      {pins.length > 0 && (
        <div className="shrink-0 border-b border-white/5 bg-[#17212b] px-2 py-1.5">
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
                  <span className="mt-1 block w-full truncate text-center text-[12px] font-semibold text-white">
                    ${ticker || "TOKEN"}
                  </span>
                  <span className="stat-num block text-center text-[11px] text-[#6ab3f3]">{fmtLeft(Math.max(0, p.endsAt - Date.now()))}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        ref={scroller}
        className="shill-wallpaper min-h-0 flex-1 overflow-y-auto px-2 py-3"
        onClick={() => setPicker(null)}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {msgs.map((m) => {
          const mine = m.owner === owner;
          const quoted = m.replyTo ? byId[m.replyTo] : null;
          const reacts = Object.entries(m.reactions || {}).filter(([, pks]) => pks.length);
          const seen = mine && Date.now() - m.at > 1600;
          const sticker = m.kind === "sticker" && m.sticker;
          return (
            <div key={m.id} className={`mb-1.5 flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && (
                <CartoonPfp seed={m.owner} src={pfpSrc(m.owner, pack?.profiles)} className="h-8 w-8 shrink-0" onClick={() => setPeek(m.owner)} />
              )}
              <div className={`flex max-w-[82%] flex-col ${mine ? "items-end" : "items-start"}`}>
                {!mine && (
                  <button type="button" className="mb-0.5 px-1 text-[13px] font-medium text-[#6ab3f3]" onClick={() => setPeek(m.owner)}>
                    {nameOf(m.owner, pack?.profiles)}
                    <span className="ml-1.5 font-mono text-[10px] text-white/40">{rankOf(m.owner, pack?.profiles)}</span>
                  </button>
                )}
                {sticker ? (
                  <button type="button" onClick={() => setPicker(m.id)} className="px-1">
                    <BurstSticker emoji={m.sticker!} size={112} />
                  </button>
                ) : (
                  <div
                    className={`relative rounded-2xl px-2.5 py-1.5 text-[16px] leading-[1.35] text-white ${
                      mine ? "rounded-br-md bg-[#2b5278]" : "rounded-bl-md bg-[#182533]"
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
                      <div className="mb-1 rounded-lg border-l-2 border-[#6ab3f3] bg-black/20 px-2 py-1 text-[12px] text-white/70">
                        {quoted.sticker || quoted.text || "message"}
                      </div>
                    )}
                    {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                    {m.token && <TokenBubble token={m.token} />}
                    <div className="mt-0.5 flex items-center justify-end gap-1">
                      <span className="font-mono text-[11px] text-white/45">{when(m.at)}</span>
                      {mine && (seen ? <CheckCheck className="h-3.5 w-3.5 text-[#6ab3f3]" /> : <Check className="h-3.5 w-3.5 text-white/45" />)}
                    </div>
                  </div>
                )}
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
                        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-[2px] text-[15px] ${
                          owner && pks.includes(owner) ? "bg-[#2b5278]" : "bg-[#182533]"
                        }`}
                      >
                        <BurstSticker emoji={emoji} size={18} />
                        {pks.length > 1 ? <span className="font-mono text-[10px] text-white/70">{pks.length}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
                {picker === m.id && (
                  <div className="z-20 mt-1 flex gap-1 rounded-full bg-[#17212b] px-2 py-1 shadow-lg">
                    {SHILL_REACTS.map((emoji) => (
                      <button key={emoji} type="button" className="px-0.5" onClick={() => react(m.id, emoji)}>
                        <BurstSticker emoji={emoji} size={28} />
                      </button>
                    ))}
                    <button type="button" className="px-1 text-white/50" onClick={() => setReply(m)} title="Reply">
                      <Reply className="h-4 w-4" />
                    </button>
                    {pack?.you?.staff && (
                      <button type="button" className="px-1 text-white/50" onClick={() => act({ action: "delete", id: m.id }).then(() => load())}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {(pack?.typing || []).length > 0 && (
          <div className="px-2 font-mono text-[12px] text-[#8e9ba8]">
            {(pack?.typing || []).map((pk) => nameOf(pk, pack?.profiles)).join(", ")} typing…
          </div>
        )}
      </div>

      <div className="relative z-20 shrink-0 bg-[#17212b] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!owner ? (
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-[14px] text-[#8e9ba8]">Connect to chat.</p>
            <WalletConnect />
          </div>
        ) : (
          <>
            {reply && (
              <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5 text-[13px] text-[#8e9ba8]">
                <span className="truncate">
                  Reply to {nameOf(reply.owner, pack?.profiles)}: {reply.text || reply.sticker || "message"}
                </span>
                <button type="button" onClick={() => setReply(null)} className="ml-2 text-white/60">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <form
              className="flex items-center gap-2 px-3 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) send();
              }}
            >
              <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#8e9ba8] hover:bg-white/5" onClick={() => setStickers((v) => !v)} aria-label="Stickers">
                <Smile className="h-6 w-6" />
              </button>
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  act({ action: "typing" }).catch(() => {});
                }}
                placeholder="Message"
                className="h-11 min-w-0 flex-1 rounded-2xl bg-[#242f3d] px-4 text-[16px] text-white outline-none"
              />
              <button type="submit" disabled={busy || !text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2b5278] text-white disabled:opacity-35" aria-label="Send">
                <Send className="h-5 w-5" />
              </button>
            </form>
            {stickers && (
              <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto border-t border-white/5 px-3 py-2 sm:grid-cols-8">
                {SHILL_STICKERS.map((s) => (
                  <button key={s} type="button" className="flex h-12 items-center justify-center" onClick={() => send({ sticker: s, kind: "sticker" })}>
                    <BurstSticker emoji={s} size={40} />
                  </button>
                ))}
              </div>
            )}
            {err && <p className="px-4 pb-2 text-sm text-[#ff6b6b]">{err}</p>}
          </>
        )}
      </div>

      <Sheet open={sheet === "pin"} title="Pin to the top" onClose={() => setSheet(null)}>
        <p className="text-[14px] text-[#8e9ba8]">👀 Pin your project to the top of the chat. 0.2 SOL · 3 hours.</p>
        <p className="mt-1 font-mono text-[12px] text-white/70">{slots > 0 ? `${slots} paid spots open` : `No paid spots · next in ${waitMin}m`}</p>
        {owner ? (
          <>
            <input
              value={pinMint}
              onChange={(e) => setPinMint(e.target.value.trim())}
              placeholder="Token CA"
              className="mt-3 w-full rounded-xl bg-[#242f3d] px-3 py-2.5 font-mono text-[13px] text-white outline-none"
            />
            <button
              type="button"
              disabled={pinBusy || !pinMint}
              onClick={pin}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#14f195] py-2.5 text-[15px] font-semibold text-[#04000a] disabled:opacity-40"
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
      </Sheet>

      <Sheet open={sheet === "ranks"} title="Top shillers" onClose={() => setSheet(null)}>
        {you && (
          <button type="button" onClick={() => owner && setPeek(owner)} className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-[#0e1621] p-3 text-left">
            <RankBadge rank={you.rank} size={48} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-white">{you.rank} · {you.title}</div>
              <div className="font-mono text-[11px] text-[#8e9ba8]">{you.need === 0 ? "Maxed" : `${you.need} XP to next`}</div>
            </div>
          </button>
        )}
        <div className="space-y-1">
          {board.length === 0 && <p className="text-[14px] text-[#8e9ba8]">Be first on the board. Drop a CA.</p>}
          {board.map((row, i) => (
            <button
              key={row.pubkey}
              type="button"
              onClick={() => {
                setSheet(null);
                setPeek(row.pubkey);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left"
            >
              <span className="w-5 font-mono text-[12px] text-[#8e9ba8]">{i + 1}</span>
              <RankBadge rank={row.rank} size={28} />
              <span className="min-w-0 flex-1 truncate text-[15px] text-white">{row.username ? `@${row.username}` : `${row.pubkey.slice(0, 4)}…`}</span>
              <span className="font-mono text-[11px] text-[#6ab3f3]">{row.rank}</span>
            </button>
          ))}
        </div>
        {owner && (
          <div className="mt-4">
            <CircleSwap owner={owner} />
          </div>
        )}
      </Sheet>
      </div>
    </main>
  );
}
