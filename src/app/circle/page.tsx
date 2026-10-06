"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Crown } from "lucide-react";
import { CircleHangout } from "@/components/CircleHangout";
import { TealConfetti } from "@/components/TealConfetti";
import { WalletConnect } from "@/components/WalletConnect";
import { peekRef } from "@/components/ReferralCapture";
import { useOwner } from "@/lib/hooks";

type Promo = { id: string; url: string; caption?: string };
type Job = { id: string; title: string; blurb: string; href?: string };
type Pack = {
  members: number;
  ready?: boolean;
  banned?: boolean;
  link?: string;
  promos?: Promo[];
  jobs?: Job[];
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
    const t = setInterval(() => {
      if (document.hidden) return;
      load().catch(() => {});
    }, 10_000);
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
    <main className="relative min-h-[calc(100vh-4rem)] overflow-x-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-4">
      <TealConfetti fire={fire} />
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 pt-6 md:px-6">
        {!owner ? (
          <Gate
            title="The founding class is wallet-in"
            body="Connect Phantom and take your seat among the early BELIEVERS — the people who saw Solphia first and chose to stay."
          >
            <WalletConnect />
          </Gate>
        ) : pack?.banned ? (
          <Gate title="Not this door" body="This wallet is banned from Founders Circle." />
        ) : !member ? (
          <Gate
            title="Take your seat among the early BELIEVERS"
            body="Limited spots. Email gets you project updates. Commitment and dedication is how this class is built — and how true greatness is earned."
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full max-w-sm rounded-full border border-[#e8c35a]/35 bg-void px-4 py-2 text-ghost outline-none"
            />
            <button type="button" disabled={busy} onClick={join} className="btn-acid mt-3 rounded-full px-6 py-2 disabled:opacity-40">
              {busy ? "Entering…" : "Enter the founding class"}
            </button>
            {err && <p className="mt-2 text-sm text-blood">{err}</p>}
          </Gate>
        ) : !inCircle ? (
          <Gate title="Not this door" body="This wallet cannot enter Founders Circle." />
        ) : (
          <CircleHangout
            seed={owner}
            pfpSrc={member.hasPfp ? `/api/circle/avatar?pk=${encodeURIComponent(owner)}` : undefined}
            members={pack.members}
            refs={member.refs}
            boostPct={member.boostPct}
            unclaimed={member.unclaimed}
            promos={promos}
            jobs={pack.jobs || []}
            busy={busy}
            note={note}
            err={err}
            copied={copied}
            onWithdraw={withdraw}
            onCopyInvite={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          />
        )}
      </div>
    </main>
  );
}

function Gate({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#e8c35a]/50 bg-[#e8c35a]/10 text-[#e8c35a] shadow-[0_0_28px_rgba(232,195,90,0.25)]">
        <Crown className="h-7 w-7" strokeWidth={1.8} />
      </span>
      <p className="mt-5 font-mono text-[10px] tracking-[0.32em] text-[#e8c35a]">FOUNDERS CIRCLE · ELITE</p>
      <h2 className="mt-2 font-display text-3xl text-ghost sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-mute">{body}</p>
      <div className="mt-6 flex w-full flex-col items-center">{children}</div>
    </div>
  );
}
