"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Gift } from "lucide-react";
import { CartoonPfp } from "@/components/CartoonPfp";
import { TealConfetti } from "@/components/TealConfetti";
import { WalletConnect } from "@/components/WalletConnect";
import { peekRef } from "@/components/ReferralCapture";
import { useOwner } from "@/lib/hooks";

type Promo = { id: string; url: string; caption?: string };
type Pack = {
  members: number;
  ready?: boolean;
  banned?: boolean;
  link?: string;
  promos?: Promo[];
  member: null | {
    pubkey: string;
    role: string;
    email: string;
    unclaimed: number;
    claimed: number;
    access: string;
    invitedPubkey: string;
    refs: number;
    boostPct: number;
    color: string;
    username?: string;
    hasPfp?: boolean;
  };
};

let circleBurst = false;

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [fire, setFire] = useState(false);
  const [joined, setJoined] = useState(false);
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
    const t = setInterval(() => load().catch(() => {}), 6000);
    return () => clearInterval(t);
  }, [load]);

  const member = pack?.member;
  const inCircle = Boolean(member && pack?.ready);

  useEffect(() => {
    if (!ready || !inCircle || circleBurst) return;
    if (!welcome && !joined) return;
    const t = window.setTimeout(() => {
      if (circleBurst) return;
      circleBurst = true;
      setFire(true);
      window.setTimeout(() => setFire(false), 2200);
    }, 360);
    return () => window.clearTimeout(t);
  }, [ready, inCircle, welcome, joined]);

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

  const link =
    typeof window !== "undefined" && owner
      ? `${window.location.origin}/circle?ref=${owner}`
      : pack?.link || "";
  const promos = pack?.promos || [];

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-4">
      <TealConfetti fire={fire} />
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 pt-6 md:px-6">
        {!owner ? (
          <Gate title="Connect your wallet" body="Founders Circle is wallet-in. Then drop an email for project updates.">
            <WalletConnect />
          </Gate>
        ) : pack?.banned ? (
          <Gate title="Not this door" body="This wallet is banned from Founders Circle." />
        ) : !member ? (
          <Gate title="Take a seat" body="Connect is done. Email gets you project updates. Then invite one friend to unlock the hang.">
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
        ) : !inCircle ? (
          <Gate
            title="Invite one person"
            body="Copy your link. When they connect a wallet, drop their email, and register, you both get in."
          >
            <button
              type="button"
              className="w-full max-w-lg truncate rounded-full border border-acid/40 bg-acid/10 px-4 py-3 font-mono text-[12px] text-ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              }}
            >
              {copied ? "copied" : link.replace(/^https?:\/\//, "")}
            </button>
            <p className="mt-3 max-w-md text-sm text-mute">Waiting on your invitee. This seat is saved to your wallet.</p>
            {err && <p className="mt-2 text-sm text-blood">{err}</p>}
          </Gate>
        ) : (
          <>
            <header className="rounded-3xl border border-acid/25 bg-acid/[0.06] p-5">
              <div className="flex items-center gap-3">
                <CartoonPfp
                  seed={owner}
                  src={member.hasPfp ? `/api/circle/avatar?pk=${encodeURIComponent(owner)}` : undefined}
                  className="h-12 w-12"
                />
                <div>
                  <div className="font-mono text-[10px] tracking-[0.22em] text-acid">FOUNDERS CIRCLE</div>
                  <h1 className="font-display text-3xl text-ghost">You&apos;re in</h1>
                </div>
              </div>
              <p className="mt-2 text-sm text-mute">
                {pack.members} founders · {member.refs} invited · {member.boostPct}% airdrop boost
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !(member.unclaimed > 0)}
                  onClick={withdraw}
                  className="btn-acid inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm disabled:opacity-40"
                >
                  <Gift className="h-4 w-4" />
                  Withdraw {member.unclaimed > 0 ? member.unclaimed.toFixed(2) : "airdrop"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-violet/30 px-4 py-2 font-mono text-[11px] text-ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  {copied ? "copied" : "copy invite"}
                </button>
              </div>
              {note && <p className="mt-2 text-sm text-acid">{note}</p>}
              {err && <p className="mt-2 text-sm text-blood">{err}</p>}
            </header>

            {promos.length > 0 && (
              <section>
                <div className="font-mono text-[10px] tracking-[0.22em] text-mute">MEDIA</div>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {promos.map((p) => (
                    <figure key={p.id} className="overflow-hidden rounded-2xl border border-violet/20 bg-void/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.caption || ""} className="aspect-square w-full object-cover" />
                      {p.caption && <figcaption className="px-2 py-1.5 text-[11px] text-mute">{p.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Gate({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-6 text-center">
      <Gift className="h-10 w-10 text-acid" />
      <h2 className="mt-4 font-display text-3xl text-ghost">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-mute">{body}</p>
      <div className="mt-6 flex w-full flex-col items-center">{children}</div>
    </div>
  );
}
