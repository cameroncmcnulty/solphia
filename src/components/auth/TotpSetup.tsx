"use client";

import { useState } from "react";
import { copyText } from "@/lib/copyText";

export const BACKUP_BLURB =
  "These 8 backup codes are one-time keys for this account. Each code works once. If you lose the phone or the authenticator app, a backup code is the only way back in — not email, not password reset. We will not email them, we cannot look them up, and we will not show them again. Copy them now and keep them offline (a password manager or paper). A screenshot in your camera roll is not enough.";

export function TotpSetup({
  qr,
  backupCodes,
  code,
  setCode,
  onConfirm,
  onSkip,
  skipLabel = "Skip for now",
  confirmLabel = "Turn on authenticator",
  busy,
  err,
}: {
  qr: string;
  backupCodes: string[];
  code: string;
  setCode: (v: string) => void;
  onConfirm: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  confirmLabel?: string;
  busy?: boolean;
  err?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-white/40">1 · SCAN WITH GOOGLE AUTHENTICATOR</p>
        <p className="mt-1 text-[14px] leading-snug text-white/55">
          Open Google Authenticator, tap add, then scan this QR. Any TOTP app works — 1Password, Authy, iCloud Passwords.
        </p>
        <div className="mx-auto mt-3 w-[196px] rounded-2xl bg-void p-3" dangerouslySetInnerHTML={{ __html: qr }} />
      </div>
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-white/40">2 · SAVE THESE 8 BACKUP CODES</p>
        <p className="mt-1 text-[14px] leading-snug text-white/80">{BACKUP_BLURB}</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-[15px] tracking-wide text-acid">
          {backupCodes.map((c) => (
            <li key={c} className="rounded-xl bg-white/[0.06] px-3 py-2 text-center">
              {c}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-2 w-full rounded-full bg-white/10 py-2 text-[13px] text-white"
          onClick={() => {
            copyText(backupCodes.join("\n"));
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy all 8 codes"}
        </button>
        <label className="mt-3 flex items-start gap-2 text-[13px] text-ghost">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5" />
          <span>I saved these 8 backup codes somewhere I will not lose.</span>
        </label>
      </div>
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-white/40">3 · ENTER THE 6-DIGIT CODE</p>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="mt-1 min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-center font-mono text-[22px] tracking-[0.4em] text-white outline-none"
        />
      </div>
      {err ? <p className="font-mono text-[13px] text-blood">{err}</p> : null}
      <button
        type="button"
        disabled={busy || !saved || code.length !== 6}
        onClick={onConfirm}
        className="btn-acid min-h-[48px] w-full rounded-full disabled:opacity-40"
      >
        {busy ? "…" : confirmLabel}
      </button>
      {onSkip ? (
        <button type="button" disabled={busy} onClick={onSkip} className="w-full text-center text-[13px] text-white/45">
          {skipLabel}
        </button>
      ) : null}
    </div>
  );
}
