"use client";

import { SphaMark } from "@/components/SphaMark";
import { FieldError, FormAlert, fieldClass, useConfirmErrors } from "@/components/form/confirm";
import { useAdmin } from "./AdminProvider";

export function AdminLogin() {
  const { secret, setSecret, login, busy, err, otp, setOtp, otpPending, otpEmail, otpHint, verifyOtp, resendOtp } = useAdmin();
  const local = useConfirmErrors<"secret" | "otp">();
  const secretErr = local.errors.secret || (!otpPending ? err : "");
  const otpErr = local.errors.otp || (otpPending ? err : "");

  if (otpPending) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
        <div className="mb-6 flex items-center gap-3">
          <SphaMark className="h-8 w-8" />
          <div>
            <p className="font-mono text-[11px] tracking-[0.28em] text-violet">SOLPHIA · OPS</p>
            <h1 className="font-display text-4xl text-ghost">Check email</h1>
          </div>
        </div>
        <p className="text-sm text-mute">
          Enter the 6-digit code sent to {otpEmail || "the admin inbox"}. Password alone is not enough.
        </p>
        {otpHint ? <p className="mt-2 font-mono text-[12px] text-acid">{otpHint}</p> : null}
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\d{6}$/.test(otp.trim())) {
              local.fail({ otp: "Enter the 6-digit code." });
              return;
            }
            local.ok();
            void verifyOtp();
          }}
        >
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            data-field="otp"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
              local.clear("otp");
            }}
            placeholder="000000"
            autoFocus
            aria-invalid={Boolean(otpErr)}
            className={`w-full rounded-full border bg-void px-4 py-3 text-center font-mono text-lg tracking-[0.4em] outline-none ${fieldClass(otpErr)}`}
          />
          <FieldError error={local.errors.otp} />
          <button type="submit" disabled={busy || otp.length !== 6} className="btn-acid w-full rounded-full py-3 text-sm disabled:opacity-40">
            {busy ? "Checking…" : "Verify"}
          </button>
        </form>
        <button type="button" disabled={busy} onClick={() => void resendOtp()} className="mt-3 text-center text-sm text-acid disabled:opacity-40">
          Resend code
        </button>
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
      <p className="text-sm text-mute">Password, then a one-time code emailed to the admin inbox. Project keys stay on this device.</p>
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
          {busy ? "Sending code…" : "Send code"}
        </button>
      </form>
      <div className="mt-3">
        <FormAlert error={err && !local.errors.secret ? err : ""} />
      </div>
    </main>
  );
}
