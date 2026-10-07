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

export function mailOffHint(): string {
  return "Solphia mail is not sending yet. Codes come from solphia@agentmail.to — not Gmail.";
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
    const j = (await r.json().catch(() => ({}))) as { message?: string };
    throw new Error(typeof j.message === "string" ? j.message : `agentmail_${r.status}`);
  }
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
    const j = (await r.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: typeof j.message === "string" ? j.message : "That verify code did not work." };
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
