"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOwner } from "@/lib/hooks";

function keyOf(pk: string) {
  return `solphia_tos_v1_${pk}`;
}

export function TosGate() {
  const owner = useOwner();
  const [need, setNeed] = useState(false);
  const [tos, setTos] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!owner) {
      setNeed(false);
      return;
    }
    try {
      if (localStorage.getItem(keyOf(owner))) {
        setNeed(false);
        return;
      }
    } catch {
      /* ignore */
    }
    let live = true;
    fetch(`/api/account?pubkey=${encodeURIComponent(owner)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        if (j?.tosAcceptedAt) {
          try {
            localStorage.setItem(keyOf(owner), String(j.tosAcceptedAt));
          } catch {
            /* ignore */
          }
          setNeed(false);
        } else setNeed(true);
      })
      .catch(() => {
        if (live) setNeed(true);
      });
    return () => {
      live = false;
    };
  }, [owner]);

  if (!owner || !need) return null;

  async function accept() {
    if (!tos || !privacy || !owner) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "tos", pubkey: owner }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || "Could not save.");
      try {
        localStorage.setItem(keyOf(owner), String(Date.now()));
      } catch {
        /* ignore */
      }
      setNeed(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-void/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-violet/30 bg-ink p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <p className="font-mono text-[10px] tracking-[0.22em] text-acid">FIRST CONNECT</p>
        <h2 className="mt-2 font-display text-2xl text-ghost">Before you trade or chat</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Solphia is non-custodial. Your wallet is login. You can lose SOL. Agree to the terms and privacy policy to continue.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm text-ghost">
          <input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} className="mt-1" />
          <span>
            I agree to the{" "}
            <Link href="/legal#terms" target="_blank" className="text-acid underline">
              Terms of Service
            </Link>
            .
          </span>
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm text-ghost">
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1" />
          <span>
            I have read the{" "}
            <Link href="/legal#privacy" target="_blank" className="text-acid underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {err ? <p className="mt-3 text-sm text-blood">{err}</p> : null}
        <button
          type="button"
          disabled={busy || !tos || !privacy}
          onClick={accept}
          className="btn-acid mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-full text-base disabled:opacity-40"
        >
          {busy ? "Saving…" : "Accept and continue"}
        </button>
      </div>
    </div>
  );
}
