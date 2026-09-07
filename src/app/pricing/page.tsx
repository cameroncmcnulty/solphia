"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { WalletConnect } from "@/components/WalletConnect";
import { PlanCompare } from "@/components/PlanCompare";
import { FaqList } from "@/components/FaqList";
import { BacktestBrochure } from "@/components/BacktestBrochure";
import { useOwner } from "@/lib/hooks";
import { loadOwner } from "@/lib/wallet/trading";
import { subscribeWithPhantom, unsubscribeSeat } from "@/lib/wallet/seatPay";

type SeatInfo = {
  treasury?: string | null;
  liveTrading?: boolean;
  seatSol?: number;
  subscribedUntil?: number | null;
  autoRenew?: boolean;
  liveSeat?: boolean;
  founder?: boolean;
  due?: boolean;
};

export default function PricingPage() {
  const connected = useOwner();
  const owner = connected || (typeof window !== "undefined" ? loadOwner() : null);
  const [email, setEmail] = useState("");
  const [tos, setTos] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [seat, setSeat] = useState<SeatInfo | null>(null);
  const selected = PLANS[0];

  async function refreshSeat(pk = owner) {
    if (!pk) {
      const g = await fetch("/api/subscribe").then((r) => r.json());
      setSeat(g);
      return;
    }
    const a = await fetch(`/api/access?pubkey=${pk}`).then((r) => r.json());
    setSeat(a);
  }

  useEffect(() => {
    refreshSeat(owner);
  }, [owner]);

  async function subscribe() {
    if (!owner) return setMsg("Connect Phantom first.");
    if (!tos) return setMsg("Agree to the terms to start a live seat.");
    setBusy(true);
    try {
      const j = await subscribeWithPhantom({ owner, email: email || undefined });
      setMsg(`Live on until ${new Date(j.subscribedUntil).toLocaleDateString()}. 0.1 SOL left Phantom for the treasury.`);
      await refreshSeat(owner);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "subscribe failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!owner) return;
    setBusy(true);
    try {
      await unsubscribeSeat(owner);
      setMsg("Auto-renew off. Seat stays until the date you already paid through.");
      await refreshSeat(owner);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "unsubscribe failed");
    } finally {
      setBusy(false);
    }
  }

  const paid = Boolean(seat?.liveSeat || (seat?.subscribedUntil && seat.subscribedUntil > Date.now()));
  const until = seat?.subscribedUntil ? new Date(seat.subscribedUntil).toLocaleDateString() : null;

  return (
    <main className="pb-24">
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
        <p className="text-base text-acid">Pricing</p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ghost sm:text-6xl">Paper is free. Live is 0.1 SOL.</h1>
        <p className="mt-4 max-w-xl text-lg text-mute">
          One bot. SOL vs official S&P 500, Nasdaq-100, and gold. 0.1 SOL / 30 days to the treasury, plus 0.1% per
          clip, until you unsubscribe.
        </p>
      </div>
      <BacktestBrochure />
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <Link href="/trading" className="panel mt-8 flex items-center gap-4 rounded-3xl p-4 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/plan-paper.jpg" alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl text-ghost">Paper</div>
            <p className="text-sm text-mute">Live oracles. Fake fills. Skip tape. No SOL at risk.</p>
          </div>
          <span className="btn-acid min-h-[44px] shrink-0 rounded-full px-5 text-sm">Try free</span>
        </Link>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="panel rounded-3xl p-5 ring-2 ring-acid shadow-[0_0_40px_rgba(20,241,149,0.18)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.icon} alt="" className="h-16 w-16 rounded-2xl" />
            <div className="mt-4 font-display text-2xl text-ghost">{selected.name}</div>
            <div className="mt-1 font-display text-3xl text-acid">
              {selected.sol} <span className="text-lg text-mute">SOL / 30d</span>
            </div>
            <p className="mt-2 text-sm text-mute">{selected.tagline}</p>
            <ul className="mt-4 space-y-2 text-sm text-ghost">
              {selected.points.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-acid text-void">
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3.2 8.4l3.1 3.1 6.5-7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel rounded-3xl p-5">
            <div className="font-mono text-[11px] tracking-[0.2em] text-violet">LIVE SEAT</div>
            <p className="mt-2 text-base text-mute">
              Connect Phantom, agree to the terms, pay 0.1 SOL. Later months leave the trading wallet while this site
              is open, until you unsubscribe.
            </p>
            {paid && (
              <p className="mt-3 font-mono text-sm text-acid">
                {seat?.founder ? "Admin seat — no charge." : `Paid through ${until}.`}{" "}
                {seat?.autoRenew ? "Auto-renew on." : "Auto-renew off."}
              </p>
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email (optional)"
              className="mt-4 w-full rounded-2xl border border-violet/30 bg-void px-4 py-3 text-ghost"
            />
            <label className="mt-4 flex items-start gap-3 text-sm text-mute">
              <input
                type="checkbox"
                checked={tos}
                onChange={(e) => setTos(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#14f195]"
              />
              <span>
                I agree to the{" "}
                <Link href="/legal" className="text-acid">
                  terms
                </Link>
                . Pull 0.1 SOL every 30 days to the treasury until I unsubscribe. I can lose SOL on live trades.
              </span>
            </label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <WalletConnect />
              <button
                type="button"
                onClick={subscribe}
                disabled={busy || !tos}
                className="btn-acid min-h-[48px] rounded-full px-6 disabled:opacity-40"
              >
                {paid && seat?.due ? "Pay this month" : paid ? "Extend 30 days" : "Pay 0.1 SOL"}
              </button>
            </div>
            {paid && seat?.autoRenew && !seat?.founder && (
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="mt-3 min-h-[44px] rounded-full border border-blood/40 px-5 text-sm text-blood disabled:opacity-40"
              >
                Unsubscribe
              </button>
            )}
            {msg && <p className="mt-3 font-mono text-sm text-acid">{msg}</p>}
            {!seat?.treasury && (
              <p className="mt-3 text-sm text-mute">Treasury is not set yet. Live payments cannot land until admin saves one.</p>
            )}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-3xl text-ghost">Compare</h2>
          <div className="mt-6">
            <PlanCompare />
          </div>
        </div>

        <div className="mt-12 max-w-3xl">
          <h2 className="font-display text-3xl text-ghost">FAQ</h2>
          <div className="mt-6">
            <FaqList limit={4} />
          </div>
        </div>
      </div>
    </main>
  );
}
