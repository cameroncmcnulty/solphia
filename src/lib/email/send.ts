import nodemailer from "nodemailer";
import type { EmailRecord } from "../types";
import { pushBounded } from "../store";
import type { AppState } from "../types";

const AGENTMAIL_SEND = "https://api.agentmail.to/v0/inboxes";
const AGENTMAIL_VERIFY = "https://api.agentmail.to/v0/agent/verify";

export function agentMailKey(): string {
  return (process.env.AGENTMAIL_API_KEY || "").trim();
}

export function agentMailInbox(): string {
  return (process.env.AGENTMAIL_INBOX || "solphia@agentmail.to").trim();
}

export function mailUser(): string {
  return (process.env.SMTP_USER || "").trim();
}

export function mailPass(): string {
  return (process.env.SMTP_PASS || "").trim();
}

function smtpHost(): string {
  return (process.env.SMTP_HOST || "").trim();
}

/** Never Gmail. Codes leave Solphia's own inbox. */
export function mailerKind(): "agentmail" | "resend" | "smtp" | null {
  if (agentMailKey()) return "agentmail";
  if ((process.env.RESEND_API_KEY || "").trim()) return "resend";
  const host = smtpHost();
  if (host && mailUser() && mailPass() && !/gmail\.com/i.test(host)) return "smtp";
  return null;
}

export function mailConfigured(): boolean {
  return mailerKind() !== null;
}

export function mailFrom(): string {
  const branded = (process.env.SMTP_FROM || process.env.MAIL_FROM || "").trim();
  const kind = mailerKind();
  if (kind === "agentmail") {
    const inbox = agentMailInbox();
    if (branded && branded.toLowerCase().includes(inbox.toLowerCase())) return branded;
    return `Solphia <${inbox}>`;
  }
  return branded || "Solphia <hello@solphia.io>";
}

export function mailOffHint(kind: "admin" | "user" = "user"): string {
  if (kind === "admin") {
    return "The live server does not have the AgentMail key, so Solphia cannot send login codes. A 6-digit email from AgentMail is only to verify the inbox — it is not an admin login code. Add AGENTMAIL_API_KEY and AGENTMAIL_INBOX=solphia@agentmail.to in Vercel Production, then redeploy.";
  }
  return "Codes are not sending on the live site yet. Try again in a minute.";
}

function smtpTransport() {
  if (mailerKind() !== "smtp") return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: smtpHost(),
    port,
    secure: port === 465,
    auth: { user: mailUser(), pass: mailPass() },
  });
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

async function sendAgentMail(opts: { to: string; cc?: string; bcc?: string; subject: string; html: string }) {
  const key = agentMailKey();
  const inbox = agentMailInbox();
  if (!key) throw new Error("AgentMail key missing.");
  const r = await fetch(`${AGENTMAIL_SEND}/${encodeURIComponent(inbox)}/messages/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      to: [opts.to],
      cc: opts.cc ? [opts.cc] : undefined,
      bcc: opts.bcc ? [opts.bcc] : undefined,
      subject: opts.subject,
      html: opts.html,
      text: htmlToText(opts.html),
    }),
    cache: "no-store",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(agentMailError(j, r.status));
  }
}

function agentMailError(j: unknown, status: number): string {
  if (j && typeof j === "object") {
    const o = j as { message?: string; error?: { message?: string; code?: string; fix?: string } | string };
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.error === "string" && o.error.trim()) return o.error;
    if (o.error && typeof o.error === "object") {
      return o.error.message || o.error.fix || o.error.code || `agentmail_${status}`;
    }
  }
  if (status === 403) return "AgentMail is not verified yet, so it can only send to the inbox owner.";
  return `agentmail_${status}`;
}

export async function verifyAgentMail(otp: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = agentMailKey();
  const code = otp.trim();
  if (!key) return { ok: false, error: "AgentMail key missing." };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code from AgentMail." };
  const r = await fetch(AGENTMAIL_VERIFY, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ otp_code: code }),
    cache: "no-store",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    return { ok: false, error: agentMailError(j, r.status) };
  }
  return { ok: true };
}

async function sendResend(opts: { from: string; to: string; cc?: string; bcc?: string; subject: string; html: string }) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      cc: opts.cc || undefined,
      bcc: opts.bcc || undefined,
      subject: opts.subject,
      html: opts.html,
    }),
    cache: "no-store",
  });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { message?: string };
    throw new Error(typeof j.message === "string" ? j.message : `resend_${r.status}`);
  }
}

export async function queueEmail(
  state: AppState,
  to: string,
  subject: string,
  html: string,
  opts?: { from?: string; cc?: string; bcc?: string },
): Promise<EmailRecord> {
  const rec: EmailRecord = {
    id: `em_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    to,
    subject,
    html,
    status: "queued",
  };
  const kind = mailerKind();
  const from = kind === "agentmail" ? mailFrom() : opts?.from || mailFrom();
  if (!kind) {
    rec.status = "preview";
    rec.error = mailOffHint();
    pushBounded(state.emails, rec, 200);
    return rec;
  }
  try {
    if (kind === "agentmail") {
      await sendAgentMail({ to, cc: opts?.cc, bcc: opts?.bcc, subject, html });
    } else if (kind === "resend") {
      await sendResend({ from, to, cc: opts?.cc, bcc: opts?.bcc, subject, html });
    } else {
      const mailer = smtpTransport();
      if (!mailer) throw new Error("SMTP transport missing.");
      await mailer.sendMail({
        from,
        to,
        cc: opts?.cc || undefined,
        bcc: opts?.bcc || undefined,
        subject,
        html,
      });
    }
    rec.status = "sent";
  } catch (err) {
    rec.status = "failed";
    rec.error = err instanceof Error ? err.message : "send failed";
  }
  pushBounded(state.emails, rec, 200);
  return rec;
}
