"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { WalletSheet } from "@/components/wallet/sheet";
import { linkDeviceWallets, refreshAccount, type PublicAccount } from "@/lib/auth/client";
import { syncOwnerToSignedInAccount } from "@/lib/wallet/identity";
import { PASSWORD_HINT, passwordIssue, passwordRules } from "@/lib/auth/passwordPolicy";
import { listWallets } from "@/lib/wallet/vault";
import { BotCheck, type BotFields } from "./BotCheck";
import { TotpSetup } from "./TotpSetup";

type Mode = "signup" | "signin";
type Screen = "pick" | "google" | "email" | "otp" | "totp-opt" | "totp" | "totp-setup";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function TosBoxes({
  tos,
  privacy,
  setTos,
  setPrivacy,
}: {
  tos: boolean;
  privacy: boolean;
  setTos: (v: boolean) => void;
  setPrivacy: (v: boolean) => void;
}) {
  return (
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
  );
}

export function AccountGate({
  onClose,
  onReady,
}: {
  onClose: () => void;
  onReady: (account: PublicAccount) => void;
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [screen, setScreen] = useState<Screen>("pick");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [otp, setOtp] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [pendingAccount, setPendingAccount] = useState<PublicAccount | null>(null);
  const [totpQr, setTotpQr] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [tos, setTos] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [bot, setBot] = useState<BotFields>({ website: "", challengeToken: "", challengeAnswer: "", turnstile: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");
  const [googleOn, setGoogleOn] = useState(true);
  const onBot = useCallback((fields: BotFields) => setBot(fields), []);
  const rules = passwordRules(password);

  useEffect(() => {
    const q = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const authErr = q.get("auth_error");
    if (authErr === "tos") {
      setErr("Agree to the terms and privacy policy, then tap Google again.");
      setScreen("google");
      setMode("signup");
    } else if (authErr === "google_off") setErr("Google sign-in is not configured yet.");
    else if (authErr === "google_denied") setErr("Google sign-in was cancelled.");
    else if (authErr === "google_state" || authErr === "google") setErr("Google sign-in failed. Try email, or tap Google again.");
    else if (authErr === "rate") setErr("Too many tries. Wait a bit.");
    if (q.get("auth_2fa") === "1") {
      setScreen("totp");
      setMode("signin");
    }
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (typeof j?.googleEnabled === "boolean") setGoogleOn(j.googleEnabled);
        if (j?.account?.id) onReady(j.account as PublicAccount);
      })
      .catch(() => undefined);
  }, [onReady]);

  async function finish(account: PublicAccount) {
    await linkDeviceWallets(listWallets({ hidden: true }).map((w) => w.pubkey));
    await refreshAccount();
    syncOwnerToSignedInAccount();
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

  async function submitEmail() {
    setBusy(true);
    setErr("");
    setHint("");
    try {
      if (mode === "signup") {
        if (password !== password2) throw new Error("Passwords do not match.");
        const issue = passwordIssue(password);
        if (issue) throw new Error(issue);
        if (!tos || !privacy) throw new Error("Agree to the terms and privacy policy.");
        const r = await fetch("/api/auth/otp", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, tos, privacy, ...botBody() }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
          pending?: boolean;
          preview?: boolean;
          devCode?: string;
        };
        if (!r.ok) {
          if (j.error === "mail_off") throw new Error(j.message || "Email codes are down. Sign in with Google instead.");
          throw new Error(j.message || "Could not send a code.");
        }
        if (j.devCode) setHint(`Dev preview code: ${j.devCode}`);
        else setHint("We emailed a 6-digit code. It expires in 15 minutes.");
        setScreen("otp");
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
        setScreen("otp");
        return;
      }
      const loginJ = j as { message?: string; error?: string; account?: PublicAccount; totp?: boolean };
      if (loginJ.totp) {
        setScreen("totp");
        return;
      }
      if (!r.ok || !loginJ.account) throw new Error(loginJ.message || "Could not sign in.");
      await finish(loginJ.account);
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
      setPendingAccount(j.account);
      setScreen("totp-opt");
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

  function google() {
    if (mode === "signup" && (!tos || !privacy)) {
      setErr("Agree to the terms and privacy policy first.");
      return;
    }
    setBusy(true);
    setErr("");
    const q = new URLSearchParams();
    if (tos) q.set("tos", "1");
    if (privacy) q.set("privacy", "1");
    window.location.assign(`/api/auth/google?${q.toString()}`);
  }

  function modeToggle() {
    return (
      <div className="mb-3 flex rounded-full bg-white/8 p-1">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setErr("");
              setScreen("pick");
            }}
            className={`min-h-[40px] flex-1 rounded-full text-[13px] ${mode === m ? "bg-acid text-void" : "text-white/55"}`}
          >
            {m === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>
    );
  }

  function backToPick() {
    setScreen("pick");
    setErr("");
    setHint("");
  }

  async function startTotpSetup() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/totp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; qr?: string; backupCodes?: string[] };
      if (!r.ok) throw new Error(j.message || "Could not start authenticator.");
      setTotpQr(j.qr || "");
      setBackupCodes(j.backupCodes || []);
      setTotpCode("");
      setScreen("totp-setup");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start authenticator.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotpSetup() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/totp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "confirm", code: totpCode }),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; account?: PublicAccount };
      if (!r.ok || !j.account) throw new Error(j.message || "That authenticator code is wrong.");
      await finish(j.account);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That authenticator code is wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTotpLogin() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/totp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify", code: totpCode }),
      });
      const j = (await r.json().catch(() => ({}))) as { message?: string; account?: PublicAccount };
      if (!r.ok || !j.account) throw new Error(j.message || "That authenticator or backup code is wrong.");
      await finish(j.account);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That authenticator or backup code is wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (screen === "totp-setup") {
    return (
      <WalletSheet title="Google Authenticator" subtitle="Optional extra lock on this account." onClose={onClose}>
        <TotpSetup
          qr={totpQr}
          backupCodes={backupCodes}
          code={totpCode}
          setCode={setTotpCode}
          busy={busy}
          err={err}
          onConfirm={() => void confirmTotpSetup()}
          onSkip={() => {
            if (pendingAccount) void finish(pendingAccount);
            else setScreen("totp-opt");
          }}
          skipLabel="Skip for now"
        />
      </WalletSheet>
    );
  }

  if (screen === "totp-opt") {
    return (
      <WalletSheet
        title="Add authenticator?"
        subtitle="Optional. You can turn this on later in Account. Google Authenticator puts a 6-digit code on your phone. Backup codes are one-time keys if you lose the phone."
        onClose={onClose}
      >
        {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void startTotpSetup()}
          className="btn-acid min-h-[48px] w-full rounded-full disabled:opacity-40"
        >
          {busy ? "…" : "Turn on Google Authenticator"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="mt-2 w-full text-center text-[13px] text-white/45"
          onClick={() => pendingAccount && void finish(pendingAccount)}
        >
          Skip for now
        </button>
      </WalletSheet>
    );
  }

  if (screen === "totp") {
    return (
      <WalletSheet
        title="Authenticator"
        subtitle="Enter the 6-digit code from Google Authenticator, or one unused backup code. Backup codes are one-time keys for when the phone is gone."
        onClose={onClose}
      >
        {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
        <label className="block">
          <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">AUTHENTICATOR OR BACKUP CODE</span>
          <input
            autoComplete="one-time-code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.toUpperCase().slice(0, 12))}
            placeholder="000000 or XXXX-XXXX"
            className="mt-1 min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-center font-mono text-[18px] tracking-[0.2em] text-white outline-none"
          />
        </label>
        <button
          type="button"
          disabled={busy || totpCode.trim().length < 6}
          onClick={() => void submitTotpLogin()}
          className="btn-acid mt-4 min-h-[48px] w-full rounded-full disabled:opacity-40"
        >
          {busy ? "…" : "Verify"}
        </button>
      </WalletSheet>
    );
  }

  if (screen === "otp") {
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
        <button type="button" disabled={busy} className="mt-2 w-full text-center text-[13px] text-acid" onClick={() => void resendOtp()}>
          Resend code
        </button>
        <button
          type="button"
          disabled={busy}
          className="mt-2 w-full text-center text-[13px] text-white/45"
          onClick={() => {
            setScreen("email");
            setOtp("");
            setErr("");
          }}
        >
          Back
        </button>
      </WalletSheet>
    );
  }

  if (screen === "google") {
    return (
      <WalletSheet
        title={mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
        subtitle={mode === "signup" ? "Agree to the terms, then continue with your Google account." : "Continue with the Google account you used before."}
        onClose={onClose}
      >
        {modeToggle()}
        {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
        {mode === "signup" ? <TosBoxes tos={tos} privacy={privacy} setTos={setTos} setPrivacy={setPrivacy} /> : null}
        <button
          type="button"
          disabled={busy || (mode === "signup" && (!tos || !privacy))}
          onClick={() => void google()}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white text-[14px] font-semibold text-void disabled:opacity-40"
        >
          <GoogleMark />
          {busy ? "…" : mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
        </button>
        <button type="button" disabled={busy} className="mt-2 w-full text-center text-[13px] text-white/45" onClick={backToPick}>
          Back
        </button>
        <p className="mt-3 text-center text-[12px] text-white/35">
          Solphia never holds a seed or PIN. Sign-in is your account. Wallets stay on this device.
        </p>
      </WalletSheet>
    );
  }

  if (screen === "email") {
    return (
      <WalletSheet
        title={mode === "signup" ? "Sign up with email" : "Sign in with email"}
        subtitle={
          mode === "signup"
            ? "Agree to the terms, pass the bot check, then confirm the code we email you."
            : "Stay signed in on this browser. Then pick or add a Solphia wallet."
        }
        onClose={onClose}
      >
        {modeToggle()}
        {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
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
          <>
            <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-white/40">
              <li className={rules.length ? "text-acid" : ""}>8–72 characters</li>
              <li className={rules.upper ? "text-acid" : ""}>One uppercase letter</li>
              <li className={rules.lower ? "text-acid" : ""}>One lowercase letter</li>
              <li className={rules.symbol ? "text-acid" : ""}>One symbol</li>
            </ul>
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
            <TosBoxes tos={tos} privacy={privacy} setTos={setTos} setPrivacy={setPrivacy} />
          </>
        ) : null}
        <BotCheck onChange={onBot} />
        <button
          type="button"
          disabled={busy || !botReady}
          onClick={() => void submitEmail()}
          className="btn-acid mt-4 min-h-[48px] w-full rounded-full disabled:opacity-40"
        >
          {busy ? "…" : mode === "signup" ? "Email me a code" : "Sign in"}
        </button>
        <button type="button" disabled={busy} className="mt-2 w-full text-center text-[13px] text-white/45" onClick={backToPick}>
          Back
        </button>
        <p className="mt-3 text-center text-[12px] text-white/35">{mode === "signup" ? PASSWORD_HINT : "Solphia never holds a seed or PIN."}</p>
      </WalletSheet>
    );
  }

  return (
    <WalletSheet
      title={mode === "signup" ? "Create account" : "Sign in"}
      subtitle={mode === "signup" ? "Pick Google or email. Google is the fast path." : "Sign in with the same Google or email you used before."}
      onClose={onClose}
    >
      {modeToggle()}
      {err ? <p className="mb-3 font-mono text-[13px] text-blood">{err}</p> : null}
      <button
        type="button"
        disabled={busy || !googleOn}
        onClick={() => {
          setErr("");
          if (mode === "signin") {
            void google();
            return;
          }
          setScreen("google");
        }}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white text-[15px] font-semibold text-void disabled:opacity-40"
      >
        <GoogleMark />
        {!googleOn ? "Google is still wiring up" : mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
      </button>
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="font-mono text-[11px] tracking-[0.18em] text-white/35">OR</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setErr("");
          setScreen("email");
        }}
        className="flex min-h-[52px] w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[15px] font-semibold text-white disabled:opacity-40"
      >
        {mode === "signup" ? "Sign up with email" : "Sign in with email"}
      </button>
      <p className="mt-3 text-center text-[12px] text-white/35">
        Solphia never holds a seed or PIN. Sign-in is your account. Wallets stay on this device.
      </p>
    </WalletSheet>
  );
}
