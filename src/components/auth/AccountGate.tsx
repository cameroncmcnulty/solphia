"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { WalletSheet } from "@/components/wallet/sheet";
import { linkDeviceWallets, refreshAccount, type PublicAccount } from "@/lib/auth/client";
import { listWallets } from "@/lib/wallet/vault";
import { BotCheck, type BotFields } from "./BotCheck";

type Mode = "signup" | "signin";
type Step = "form" | "otp";

export function AccountGate({
  onClose,
  onReady,
}: {
  onClose: () => void;
  onReady: (account: PublicAccount) => void;
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [otp, setOtp] = useState("");
  const [tos, setTos] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [bot, setBot] = useState<BotFields>({ website: "", challengeToken: "", challengeAnswer: "", turnstile: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(true);
  const onBot = useCallback((fields: BotFields) => setBot(fields), []);

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

  function botBody() {
    return {
      website: bot.website,
      challengeToken: bot.challengeToken,
      challengeAnswer: bot.challengeAnswer,
      turnstile: bot.turnstile,
    };
  }

  const botReady = Boolean(bot.turnstile || (bot.challengeToken && bot.challengeAnswer));

  async function submit() {
    setBusy(true);
    setErr("");
    setHint("");
    try {
      if (mode === "signup") {
        if (password !== password2) throw new Error("Passwords do not match.");
        if (!tos || !privacy) throw new Error("Agree to the terms and privacy policy.");
        const r = await fetch("/api/auth/otp", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, tos, privacy, ...botBody() }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          message?: string;
          pending?: boolean;
          preview?: boolean;
          devCode?: string;
        };
        if (!r.ok) throw new Error(j.message || "Could not send a code.");
        if (j.devCode) setHint(`Dev preview code: ${j.devCode}`);
        else setHint("We emailed a 6-digit code. It expires in 15 minutes.");
        setStep("otp");
        return;
      }
      const r = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, ...botBody() }),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; error?: string; account?: PublicAccount };
      if (j.error === "verify_email") {
        const send = await fetch("/api/auth/otp", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, tos: true, privacy: true, ...botBody() }),
        });
        const sj = (await send.json().catch(() => ({}))) as { message?: string; devCode?: string };
        if (!send.ok) throw new Error(sj.message || "Verify this email first.");
        if (sj.devCode) setHint(`Dev preview code: ${sj.devCode}`);
        else setHint("We emailed a 6-digit code to verify this account.");
        setMode("signup");
        setTos(true);
        setPrivacy(true);
        setStep("otp");
        return;
      }
      if (!r.ok || !j.account) throw new Error(j.message || "Could not sign in.");
      await finish(j.account);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/otp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify", email, otp }),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; account?: PublicAccount };
      if (!r.ok || !j.account) throw new Error(j.message || "That code did not work.");
      await finish(j.account);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That code did not work.");
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    setBusy(true);
    setErr("");
    setHint("");
    try {
      const r = await fetch("/api/auth/otp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, tos: true, privacy: true, ...botBody() }),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; devCode?: string };
      if (!r.ok) throw new Error(j.message || "Could not resend the code.");
      if (j.devCode) setHint(`Dev preview code: ${j.devCode}`);
      else setHint("We emailed a new 6-digit code. It expires in 15 minutes.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (mode === "signup" && (!tos || !privacy)) {
      setErr("Agree to the terms and privacy policy first.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tos, privacy, ...botBody() }),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; url?: string };
      if (!r.ok || !j.url) throw new Error(j.message || "Google sign-in failed.");
      window.location.href = j.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed.");
      setBusy(false);
    }
  }

  if (step === "otp") {
    return (
      <WalletSheet title="Check your email" subtitle={`Enter the 6-digit code we sent to ${email}.`} onClose={onClose}>
        {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
        {hint ? <p className="mb-3 text-[13px] text-white/55">{hint}</p> : null}
        <label className="block">
          <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">ONE-TIME CODE</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-1 min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-center font-mono text-[22px] tracking-[0.4em] text-white outline-none"
          />
        </label>
        <button
          type="button"
          disabled={busy || otp.length !== 6}
          onClick={() => void submitOtp()}
          className="btn-acid mt-4 min-h-[48px] w-full rounded-full disabled:opacity-40"
        >
          {busy ? "…" : "Verify and create account"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="mt-2 w-full text-center text-[13px] text-acid"
          onClick={() => void resendOtp()}
        >
          Resend code
        </button>
        <button
          type="button"
          disabled={busy}
          className="mt-2 w-full text-center text-[13px] text-white/45"
          onClick={() => {
            setStep("form");
            setOtp("");
            setErr("");
          }}
        >
          Back
        </button>
      </WalletSheet>
    );
  }

  return (
    <WalletSheet
      title={mode === "signup" ? "Create account" : "Sign in"}
      subtitle={
        mode === "signup"
          ? "Email or Google. Agree to the terms, pass the bot check, then confirm the code we email you."
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
              setStep("form");
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
      <BotCheck onChange={onBot} />
      <button
        type="button"
        disabled={busy || !botReady}
        onClick={() => void submit()}
        className="btn-acid mt-4 min-h-[48px] w-full rounded-full disabled:opacity-40"
      >
        {busy ? "…" : mode === "signup" ? "Email me a code" : "Sign in"}
      </button>
      {googleEnabled ? (
        <button
          type="button"
          disabled={busy || !botReady}
          onClick={() => void google()}
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
