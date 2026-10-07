"use client";

import { useEffect, useState } from "react";
import { FieldError, useConfirmErrors } from "@/components/form/confirm";
import {
  dkimDnsHost,
  dkimDnsTxt,
  dmarcDnsHost,
  dmarcDnsTxt,
  spfDnsTxt,
} from "@/lib/email/dkim-public";
import { useAdmin } from "../AdminProvider";
import { Field, Row } from "../ui";

const dkimHost = dkimDnsHost();
const dkimTxt = dkimDnsTxt();
const dmarcHost = dmarcDnsHost();
const dmarcTxt = dmarcDnsTxt();
const spfTxt = spfDnsTxt();

function emailLooksOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length < 120;
}

export function SystemSection() {
  const { data, patch, busy } = useAdmin();
  const [otpEmail, setOtpEmail] = useState("");
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
          Mail {data.mailReady ? `ready · ${data.mailKind || "on"} · ${data.mailFrom}` : "off"} · Google{" "}
          {data.googleEnabled ? "on" : "off"}
        </p>
        <p className="mt-2 text-sm text-mute">
          Codes leave otp@solphia.io from Solphia&apos;s own mailer — our SMTP + DKIM. Not Gmail, not SES, not AgentMail.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[12px] text-mute">
          <li>
            Vercel → Domain solphia.io → DNS. Name <span className="font-mono text-ghost">solphia._domainkey</span> TXT
            <code className="mt-1 block break-all font-mono text-[10px] text-ghost">{dkimTxt}</code>
          </li>
          <li>
            Name <span className="font-mono text-ghost">_dmarc</span> TXT
            <code className="mt-1 block break-all font-mono text-[10px] text-ghost">{dmarcTxt}</code>
          </li>
          <li>
            Skip SPF until mail.solphia.io has an A record ({dkimHost} / {dmarcHost}).
            <code className="mt-1 block break-all font-mono text-[10px] text-ghost">{spfTxt}</code>
          </li>
          <li>
            Production env SOLPHIA_DKIM_PRIVATE_KEY is the on-switch. Generate with{" "}
            <span className="font-mono text-ghost">node scripts/gen-dkim.mjs</span>. Never commit the private key.
          </li>
          <li>
            Vercel blocks outbound port 25, so Gmail may still refuse from serverless. Same code on a box we control
            (A record mail.solphia.io) is still our system — set SOLPHIA_MAIL_HOST=mail.solphia.io if that box is ours.
          </li>
        </ol>
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
