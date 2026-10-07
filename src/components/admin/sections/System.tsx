"use client";

import { useEffect, useState } from "react";
import { FieldError, useConfirmErrors } from "@/components/form/confirm";
import { useAdmin } from "../AdminProvider";
import { Field, Row } from "../ui";

function emailLooksOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length < 120;
}

export function SystemSection() {
  const { data, patch, busy } = useAdmin();
  const [otpEmail, setOtpEmail] = useState("");
  const [senderOtp, setSenderOtp] = useState("");
  const [senderNote, setSenderNote] = useState("");
  const otpErr = useConfirmErrors<"adminOtpEmail">();
  useEffect(() => {
    if (data?.adminOtpEmail) setOtpEmail(data.adminOtpEmail);
  }, [data?.adminOtpEmail]);
  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ADMIN LOGIN OTP</div>
        <p className="mt-2 text-sm text-mute">
          Every dashboard sign-in emails a 6-digit code here. Default is CameronCmcnulty@gmail.com.
        </p>
        <Field
          field="adminOtpEmail"
          value={otpEmail}
          error={otpErr.errors.adminOtpEmail}
          onChange={(v) => {
            setOtpEmail(v.trim());
            otpErr.clear("adminOtpEmail");
          }}
          placeholder="admin inbox"
          className="mt-3"
        />
        <FieldError error={otpErr.errors.adminOtpEmail} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (otpEmail && !emailLooksOk(otpEmail)) {
                otpErr.fail({ adminOtpEmail: "Enter a valid email." });
                return;
              }
              otpErr.ok();
              void patch({ adminOtpEmail: otpEmail || null });
            }}
            className="btn-acid rounded-full px-5 py-2 text-sm disabled:opacity-40"
          >
            Save OTP email
          </button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-mute">
          Mail {data.mailReady ? `ready · ${data.mailFrom}` : "off"} · Google{" "}
          {data.googleEnabled ? "on" : "off"}
        </p>
        <p className="mt-2 text-sm text-mute">Codes send from Solphia&apos;s inbox, not Gmail. If AgentMail emailed a 6-digit verify code, paste it here once to unlock sending to any address.</p>
        <Field
          field="senderOtp"
          value={senderOtp}
          onChange={(v) => {
            setSenderOtp(v.trim());
            setSenderNote("");
          }}
          placeholder="AgentMail verify code"
          className="mt-3"
        />
        <button
          type="button"
          disabled={busy || senderOtp.length < 6}
          onClick={() => {
            void (async () => {
              setSenderNote("");
              const r = await fetch("/api/admin/mail", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "verify_sender", otp: senderOtp }),
              });
              const j = await r.json().catch(() => ({}));
              if (!r.ok) {
                setSenderNote(typeof j.message === "string" ? j.message : "Verify failed.");
                return;
              }
              setSenderOtp("");
              setSenderNote("Sender unlocked.");
            })();
          }}
          className="mt-3 rounded-full border border-white/15 px-5 py-2 text-sm text-white disabled:opacity-40"
        >
          Unlock sender
        </button>
        {senderNote ? <p className="mt-2 font-mono text-[11px] text-acid">{senderNote}</p> : null}
      </div>
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">LOCKED DEFAULTS</div>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
          <Row k="Wait" v={`${data.locked.cooldownMin} min`} />
          <Row k="Clip" v={`${(data.locked.clipPct * 100).toFixed(0)}%`} />
          <Row k="Stop" v={`${(data.locked.stopPct * 100).toFixed(0)}%`} />
          <Row k="Home" v="USDC" />
          <Row k="Leverage" v="spot · opt SOL 2×/3×" />
          <Row k="Seat" v={`${data.seatSol} / ${data.seatSolLev} SOL`} />
          <Row k="Clip fee" v={`${data.protocolFeeBps} bps`} />
          <Row k="PnL" v="USDC" />
          <Row k="24/7 signer" v={data.signerReady ? "READY" : "OFF"} />
        </div>
      </div>
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">AUDIT</div>
        <div className="mt-2 max-h-[28rem] space-y-2 overflow-auto">
          {data.audit.length === 0 && <p className="text-sm text-mute">No events yet.</p>}
          {data.audit.slice(0, 20).map((a) => (
            <div key={a.id} className="flex justify-between gap-3 font-mono text-[11px] text-mute">
              <span className="text-ghost">
                {a.action} · {a.detail}
              </span>
              <span>{new Date(a.at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
