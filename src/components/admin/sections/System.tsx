"use client";

import {
  dkimDnsHost,
  dkimDnsTxt,
  dmarcDnsHost,
  dmarcDnsTxt,
  spfDnsTxt,
} from "@/lib/email/dkim-public";
import { useAdmin } from "../AdminProvider";
import { Row } from "../ui";

const dkimHost = dkimDnsHost();
const dkimTxt = dkimDnsTxt();
const dmarcHost = dmarcDnsHost();
const dmarcTxt = dmarcDnsTxt();
const spfTxt = spfDnsTxt();

export function SystemSection() {
  const { data } = useAdmin();
  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="panel rounded-2xl p-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-mute">ADMIN LOGIN 2FA</div>
        <p className="mt-2 text-sm text-mute">
          Dashboard login is password, then Google Authenticator. First sign-in after this ships: scan the QR, save the 8
          one-time backup codes, confirm the 6-digit code. After that, password plus authenticator. Mail is not part of
          dashboard login. If the phone is gone, an unused backup code is the only way in — we cannot email a reset.
        </p>
        <p className="mt-3 font-mono text-[11px] text-mute">
          Mail {data.mailReady ? `ready · ${data.mailKind || "on"} · ${data.mailFrom}` : "off"} · Google{" "}
          {data.googleEnabled ? "on" : "off"}
        </p>
        <p className="mt-2 text-sm text-mute">
          Signup still emails a one-time code from otp@solphia.io — our SMTP + DKIM. Not Gmail, not SES, not AgentMail.
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
            Vercel blocks outbound port 25. Run our worker on a box that can open it (
            <span className="font-mono text-ghost">npm run mail-worker</span>
            ), then set SOLPHIA_MAIL_WORKER_URL and SOLPHIA_MAIL_WORKER_SECRET on Production. Same code. Not SES.
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
