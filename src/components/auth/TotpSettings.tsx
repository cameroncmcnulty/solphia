"use client";

import { useState } from "react";
import { refreshAccount, type PublicAccount } from "@/lib/auth/client";
import { BACKUP_BLURB, TotpSetup } from "./TotpSetup";
import { copyText } from "@/lib/copyText";

export function TotpSettings({ account }: { account: PublicAccount }) {
  const [on, setOn] = useState(account.totpEnabled);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mode, setMode] = useState<"idle" | "setup" | "disable" | "backup">("idle");

  async function post(action: "setup" | "confirm" | "disable" | "backup", extra?: { code?: string }) {
    setBusy(true);
    setErr("");
    setNote("");
    try {
      const r = await fetch("/api/auth/totp", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        message?: string;
        qr?: string;
        backupCodes?: string[];
        account?: PublicAccount;
      };
      if (!r.ok) throw new Error(j.message || "Could not update authenticator.");
      if (j.account) {
        setOn(j.account.totpEnabled);
        await refreshAccount();
      }
      return j;
    } finally {
      setBusy(false);
    }
  }

  async function startSetup() {
    try {
      const j = await post("setup");
      setQr(j.qr || "");
      setBackupCodes(j.backupCodes || []);
      setCode("");
      setMode("setup");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start authenticator.");
    }
  }

  if (mode === "setup") {
    return (
      <TotpSetup
        qr={qr}
        backupCodes={backupCodes}
        code={code}
        setCode={setCode}
        busy={busy}
        err={err}
        confirmLabel="Turn on authenticator"
        onSkip={() => {
          setMode("idle");
          setQr("");
          setBackupCodes([]);
          setCode("");
        }}
        skipLabel="Cancel"
        onConfirm={async () => {
          try {
            await post("confirm", { code });
            setMode("idle");
            setQr("");
            setBackupCodes([]);
            setCode("");
            setNote("Authenticator is on.");
          } catch (e) {
            setErr(e instanceof Error ? e.message : "That code did not work.");
          }
        }}
      />
    );
  }

  if (mode === "backup" && backupCodes.length) {
    return (
      <div className="space-y-3">
        <p className="text-[14px] leading-snug text-white/80">{BACKUP_BLURB}</p>
        <p className="text-[13px] text-white/55">The old backup codes no longer work.</p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-[15px] tracking-wide text-acid">
          {backupCodes.map((c) => (
            <li key={c} className="rounded-xl bg-white/[0.06] px-3 py-2 text-center">
              {c}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="w-full rounded-full bg-white/10 py-2 text-[13px] text-white"
          onClick={() => copyText(backupCodes.join("\n"))}
        >
          Copy all 8 codes
        </button>
        <button
          type="button"
          className="w-full text-center text-[13px] text-white/45"
          onClick={() => {
            setMode("idle");
            setBackupCodes([]);
            setCode("");
          }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-mute">
        Optional extra lock on this email or Google account. Password or Google still signs you in first. Then a 6-digit
        Google Authenticator code. The 8 backup codes are one-time keys for when the phone is gone — each works once, and
        they are the only way back in if you lose the app.
      </p>
      <p className="mt-2 font-mono text-[12px] text-acid">{on ? "On" : "Off"}</p>
      {err ? <p className="mt-2 font-mono text-[13px] text-blood">{err}</p> : null}
      {note ? <p className="mt-2 text-[13px] text-acid">{note}</p> : null}
      {on ? (
        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.16em] text-white/40">AUTHENTICATOR OR BACKUP CODE</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
              placeholder="6-digit or XXXX-XXXX"
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 font-mono text-[14px] text-white outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !code.trim()}
              className="rounded-full bg-white/10 px-4 py-2 text-[13px] text-white disabled:opacity-40"
              onClick={async () => {
                try {
                  const j = await post("backup", { code });
                  setBackupCodes(j.backupCodes || []);
                  setMode("backup");
                  setCode("");
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Could not make new codes.");
                }
              }}
            >
              New backup codes
            </button>
            <button
              type="button"
              disabled={busy || !code.trim()}
              className="rounded-full bg-white/10 px-4 py-2 text-[13px] text-blood disabled:opacity-40"
              onClick={async () => {
                try {
                  await post("disable", { code });
                  setCode("");
                  setNote("Authenticator is off.");
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Could not turn it off.");
                }
              }}
            >
              Turn off
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => void startSetup()} className="btn-acid mt-3 rounded-full px-5 py-2 text-sm disabled:opacity-40">
          {busy ? "…" : "Turn on Google Authenticator"}
        </button>
      )}
    </div>
  );
}
