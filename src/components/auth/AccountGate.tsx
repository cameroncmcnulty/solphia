"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WalletSheet } from "@/components/wallet/sheet";
import { linkDeviceWallets, refreshAccount, type PublicAccount } from "@/lib/auth/client";
import { listWallets } from "@/lib/wallet/vault";

type Mode = "signup" | "signin";

export function AccountGate({
  onClose,
  onReady,
}: {
  onClose: () => void;
  onReady: (account: PublicAccount) => void;
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [tos, setTos] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const authErr = q.get("auth_error");
    if (authErr === "tos") setErr("Agree to the terms and privacy policy, then tap Google again.");
    else if (authErr === "google_off") setErr("Google sign-in is not configured yet.");
    else if (authErr === "google_denied") setErr("Google sign-in was cancelled.");
    else if (authErr === "google_state" || authErr === "google") setErr("Google sign-in failed. Try email, or tap Google again.");
    else if (authErr === "rate") setErr("Too many tries. Wait a bit.");
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setGoogleEnabled(j?.googleEnabled !== false);
        if (j?.account?.id) onReady(j.account as PublicAccount);
      })
      .catch(() => undefined);
  }, [onReady]);

  async function finish(account: PublicAccount) {
    await linkDeviceWallets(listWallets({ hidden: true }).map((w) => w.pubkey));
    await refreshAccount();
    onReady(account);
  }

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      if (mode === "signup") {
        if (password !== password2) throw new Error("Passwords do not match.");
        if (!tos || !privacy) throw new Error("Agree to the terms and privacy policy.");
      }
      const r = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { email, password, tos, privacy } : { email, password },
        ),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; account?: PublicAccount };
      if (!r.ok || !j.account) throw new Error(j.message || "Could not sign in.");
      await finish(j.account);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  function google() {
    if (mode === "signup" && (!tos || !privacy)) {
      setErr("Agree to the terms and privacy policy first.");
      return;
    }
    const q = new URLSearchParams();
    if (tos) q.set("tos", "1");
    if (privacy) q.set("privacy", "1");
    window.location.href = `/api/auth/google?${q.toString()}`;
  }

  return (
    <WalletSheet
      title={mode === "signup" ? "Create account" : "Sign in"}
      subtitle={
        mode === "signup"
          ? "Email or Google. This is when you agree to the terms. Wallets come next, on this device."
          : "Stay signed in on this browser. Then pick or add a Solphia wallet."
      }
      onClose={onClose}
    >
      {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
      <div className="mb-3 flex rounded-full bg-white/8 p-1">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setErr("");
            }}
            className={`min-h-[40px] flex-1 rounded-full text-[13px] ${mode === m ? "bg-acid text-void" : "text-white/55"}`}
          >
            {m === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">EMAIL</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white outline-none"
        />
      </label>
      <label className="mt-3 block">
        <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">PASSWORD</span>
        <input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white outline-none"
        />
      </label>
      {mode === "signup" ? (
        <label className="mt-3 block">
          <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">CONFIRM PASSWORD</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white outline-none"
          />
        </label>
      ) : null}
      {mode === "signup" ? (
        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-2 text-sm text-ghost">
            <input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} className="mt-1" />
            <span>
              I agree to the{" "}
              <Link href="/legal#terms" target="_blank" className="text-acid underline">
                Terms of Service
              </Link>
              .
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-ghost">
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1" />
            <span>
              I have read the{" "}
              <Link href="/legal#privacy" target="_blank" className="text-acid underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="btn-acid mt-4 min-h-[48px] w-full rounded-full disabled:opacity-40"
      >
        {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      {googleEnabled ? (
        <button
          type="button"
          disabled={busy}
          onClick={google}
          className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white text-[14px] font-semibold text-void disabled:opacity-40"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-void text-[12px] font-bold text-white">G</span>
          Continue with Google
        </button>
      ) : null}
      <p className="mt-3 text-center text-[12px] text-white/35">
        Solphia never holds a seed or PIN. Sign-in is your account. Wallets stay on this device.
      </p>
    </WalletSheet>
  );
}
