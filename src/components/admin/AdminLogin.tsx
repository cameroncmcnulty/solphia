"use client";

import { SphaMark } from "@/components/SphaMark";
import { TotpSetup } from "@/components/auth/TotpSetup";
import { FieldError, FormAlert, fieldClass, useConfirmErrors } from "@/components/form/confirm";
import { useAdmin } from "./AdminProvider";

export function AdminLogin() {
  const {
    secret,
    setSecret,
    login,
    busy,
    err,
    otp,
    setOtp,
    otpPending,
    otpHint,
    totpSetup,
    totpQr,
    totpBackupCodes,
    verifyOtp,
    confirmTotp,
  } = useAdmin();
  const local = useConfirmErrors<"secret" | "otp">();
  const secretErr = local.errors.secret || (!otpPending ? err : "");
  const otpErr = local.errors.otp || (otpPending ? err : "");

  if (otpPending && totpSetup) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
        <div className="mb-6 flex items-center gap-3">
          <SphaMark className="h-8 w-8" />
          <div>
            <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOLPHIA · OPS</p>
            <h1 className="font-display text-4xl text-ghost">Your authenticator</h1>
          </div>
        </div>
        <p className="mb-4 text-sm text-mute">
          This dashboard is yours. Scan once, save the 8 backup codes, then enter the 6-digit code. Password alone is not enough.
        </p>
        <TotpSetup
          qr={totpQr}
          backupCodes={totpBackupCodes}
          code={otp}
          setCode={setOtp}
          busy={busy}
          err={otpErr}
          confirmLabel="Lock the dashboard"
          onConfirm={() => void confirmTotp()}
        />
      </main>
    );
  }

  if (otpPending) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
        <div className="mb-6 flex items-center gap-3">
          <SphaMark className="h-8 w-8" />
          <div>
            <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOLPHIA · OPS</p>
            <h1 className="font-display text-4xl text-ghost">Authenticator</h1>
          </div>
        </div>
        <p className="text-sm text-mute">
          Enter the 6-digit code from Google Authenticator, or one unused backup code. Backup codes are one-time keys for when the phone is gone.
        </p>
        {otpHint ? <p className="mt-2 font-mono text-[12px] text-acid">{otpHint}</p> : null}
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (otp.trim().length < 6) {
              local.fail({ otp: "Enter the authenticator code or a backup code." });
              return;
            }
            local.ok();
            void verifyOtp();
          }}
        >
          <input
            autoComplete="one-time-code"
            data-field="otp"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.toUpperCase().slice(0, 12));
              local.clear("otp");
            }}
            placeholder="000000 or XXXX-XXXX"
            autoFocus
            aria-invalid={Boolean(otpErr)}
            className={`w-full rounded-full border bg-void px-4 py-3 text-center font-mono text-lg tracking-[0.2em] outline-none ${fieldClass(otpErr)}`}
          />
          <FieldError error={local.errors.otp} />
          <button type="submit" disabled={busy || otp.trim().length < 6} className="btn-acid w-full rounded-full py-3 text-sm disabled:opacity-40">
            {busy ? "Checking…" : "Verify"}
          </button>
        </form>
        <div className="mt-3">
          <FormAlert error={err && !local.errors.otp ? err : ""} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
      <div className="mb-6 flex items-center gap-3">
        <SphaMark className="h-8 w-8" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOLPHIA · OPS</p>
          <h1 className="font-display text-4xl text-ghost">Admin</h1>
        </div>
      </div>
      <p className="text-sm text-mute">Password, then Google Authenticator. Project keys stay on this device.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!secret.trim()) {
            local.fail({ secret: "Enter the admin password." });
            return;
          }
          local.ok();
          void login();
        }}
      >
        <input
          type="password"
          data-field="secret"
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value);
            local.clear("secret");
          }}
          placeholder="Password"
          autoComplete="current-password"
          autoFocus
          aria-invalid={Boolean(secretErr)}
          className={`w-full rounded-full border bg-void px-4 py-3 font-mono text-sm outline-none ${fieldClass(secretErr)}`}
        />
        <FieldError error={local.errors.secret} />
        <button type="submit" disabled={busy} className="btn-acid w-full rounded-full py-3 text-sm disabled:opacity-40">
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
      <div className="mt-3">
        <FormAlert error={err && !local.errors.secret ? err : ""} />
      </div>
    </main>
  );
}
