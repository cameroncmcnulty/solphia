"use client";

import { useEffect, useState } from "react";
import { CartoonPfp } from "./CartoonPfp";
import { RankBadge, StaffBadge } from "./RankBadge";

function media(url?: string) {
  const raw = (url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:image/") || raw.startsWith("/api/media") || raw.startsWith("/api/")) return raw;
  if (/^https?:\/\//i.test(raw)) return `/api/media?u=${encodeURIComponent(raw)}`;
  return raw;
}

export type ProfilePack = {
  pubkey: string;
  username: string;
  pfp?: string;
  banner?: string;
  intro: string;
  rank: number;
  title: string;
  xp: number;
  need: number;
  pct: number;
  launched?: number;
  referred?: number;
  fav?: { mint: string; symbol: string; name: string; image?: string } | null;
  role?: "admin" | "mod" | null;
  canModerate?: boolean;
  banned?: boolean;
  mutedUntil?: number;
};

const cache = new Map<string, ProfilePack>();

export function useProfilePeek() {
  const [open, setOpen] = useState<string | null>(null);
  return {
    open,
    show: (pk: string) => setOpen(pk),
    hide: () => setOpen(null),
    node: open ? <ProfileOverlay pubkey={open} onClose={() => setOpen(null)} /> : null,
  };
}

export function ProfileOverlay({
  pubkey,
  viewer,
  onClose,
  onModerated,
}: {
  pubkey: string;
  viewer?: string | null;
  onClose: () => void;
  onModerated?: () => void;
}) {
  const cacheKey = `${pubkey}:${viewer || ""}`;
  const [pack, setPack] = useState<ProfilePack | null>(cache.get(cacheKey) || null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let stop = false;
    const q = new URLSearchParams({ pubkey });
    if (viewer) q.set("viewer", viewer);
    fetch(`/api/profile?${q.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (stop || !j?.pubkey) return;
        cache.set(cacheKey, j);
        setPack(j);
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, [pubkey, viewer, cacheKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const name = pack?.username ? `@${pack.username}` : `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`;
  const banner = pack?.banner ? media(pack.banner) : "";
  const pfp = pack?.pfp ? media(pack.pfp) : undefined;
  const fav = pack?.fav;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]" onClick={onClose}>
      <div
        className="relative max-h-[min(92dvh,720px)] w-full max-w-sm overflow-y-auto rounded-[1.8rem] border border-acid/30 bg-[#12081c] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-28 bg-gradient-to-r from-violet/40 via-acid/20 to-cyan/30">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12081c] to-transparent" />
        </div>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 text-sm text-ghost">
          Close
        </button>
        <div className="relative -mt-10 flex items-end gap-3 px-4">
          <CartoonPfp seed={pubkey} src={pfp} className="h-20 w-20 rounded-2xl ring-4 ring-[#12081c]" />
          <div className="min-w-0 flex-1 pb-1">
            <div className="truncate font-display text-2xl text-ghost">{name}</div>
            <div className="font-mono text-[11px] text-mute">
              {pubkey.slice(0, 6)}…{pubkey.slice(-4)}
            </div>
          </div>
          <div className="flex items-end gap-1">
            {pack?.role ? <StaffBadge role={pack.role} size={56} /> : null}
            <RankBadge rank={pack?.rank || 1} size={72} />
          </div>
        </div>
        <div className="px-4 pb-5 pt-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-display text-acid">
              {pack?.role ? `${pack.role === "admin" ? "ADMIN" : "MOD"} · ` : ""}
              Rank {pack?.rank || 1} · {pack?.title || "Spark"}
            </span>
            <span className="font-mono text-[10px] text-mute">{pack?.need === 0 ? "MAX" : `${pack?.need || 0} XP to next`}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-void">
            <div className="h-full bg-acid" style={{ width: `${Math.round((pack?.pct || 0) * 100)}%` }} />
          </div>
          {pack?.intro ? <p className="mt-3 text-sm leading-relaxed text-ghost">{pack.intro}</p> : <p className="mt-3 text-sm text-mute">No intro yet.</p>}
          {fav?.mint ? (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-acid/30 bg-acid/[0.08] p-2">
              {fav.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media(fav.image)} alt="" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-void font-display text-sm text-acid">
                  {(fav.symbol || "?").slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[9px] tracking-[0.16em] text-mute">FAVOURITE PROJECT</div>
                <div className="truncate font-display text-sm text-ghost">${(fav.symbol || "").replace(/^\$/, "") || "TOKEN"}</div>
                {fav.name ? <div className="truncate text-[11px] text-mute">{fav.name}</div> : null}
              </div>
              <button
                type="button"
                className="btn-acid shrink-0 rounded-full px-3 py-1.5 text-[11px]"
                onClick={async () => {
                  await navigator.clipboard.writeText(fav.mint);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                }}
              >
                {copied ? "Copied" : "Copy CA"}
              </button>
            </div>
          ) : null}
          {pack?.canModerate && viewer && viewer !== pubkey && pack.role !== "admin" && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-full border border-warn/50 py-2 text-sm text-warn disabled:opacity-40"
                onClick={async () => {
                  setBusy(true);
                  setNote("");
                  try {
                    const r = await fetch("/api/shill", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ action: "mute", pubkey: viewer, target: pubkey }),
                    });
                    const j = await r.json();
                    if (!r.ok) throw new Error(j.message || "Could not mute.");
                    setNote("Muted for 24 hours.");
                    onModerated?.();
                  } catch (e) {
                    setNote(e instanceof Error ? e.message : "mute failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Mute 24h
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-full border border-blood/50 py-2 text-sm text-blood disabled:opacity-40"
                onClick={async () => {
                  setBusy(true);
                  setNote("");
                  try {
                    const r = await fetch("/api/shill", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ action: "ban", pubkey: viewer, target: pubkey, banned: true }),
                    });
                    const j = await r.json();
                    if (!r.ok) throw new Error(j.message || "Could not ban.");
                    setNote("Banned from Shill Zone.");
                    onModerated?.();
                  } catch (e) {
                    setNote(e instanceof Error ? e.message : "ban failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Ban
              </button>
            </div>
          )}
          {note && <p className="mt-2 text-center font-mono text-[11px] text-acid">{note}</p>}
        </div>
      </div>
    </div>
  );
}
