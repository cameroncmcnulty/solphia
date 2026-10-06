import nodemailer from "nodemailer";
import type { EmailRecord } from "../types";
import { pushBounded } from "../store";
import type { AppState } from "../types";

export function mailUser(): string {
  return (process.env.MAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
}

export function mailPass(): string {
  return (process.env.MAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").trim();
}

/** smtp = classic host. gmail = free App Password, no SMTP_HOST needed. resend = optional API. */
export function mailerKind(): "smtp" | "gmail" | "resend" | null {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = mailUser();
  const pass = mailPass();
  if (host && user && pass) return "smtp";
  if (user && pass) return "gmail";
  if ((process.env.RESEND_API_KEY || "").trim()) return "resend";
  return null;
}

export function mailConfigured(): boolean {
  return mailerKind() !== null;
}

export function mailFrom(): string {
  const branded = (process.env.SMTP_FROM || process.env.MAIL_FROM || "").trim();
  const kind = mailerKind();
  const user = mailUser();
  if (kind === "gmail" && user) {
    if (branded && branded.toLowerCase().includes(user.toLowerCase())) return branded;
    return `Solphia <${user}>`;
  }
  return branded || "Solphia <hello@solphia.io>";
}

function smtpTransport() {
  const kind = mailerKind();
  if (kind === "smtp") {
    const port = Number(process.env.SMTP_PORT || 587);
    return nodemailer.createTransport({
      host: (process.env.SMTP_HOST || "").trim(),
      port,
      secure: port === 465,
      auth: { user: mailUser(), pass: mailPass() },
    });
  }
  if (kind === "gmail") {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: mailUser(), pass: mailPass() },
    });
  }
  return null;
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
  const from = opts?.from || mailFrom();
  if (!kind) {
    rec.status = "preview";
    rec.error = "Mailer not configured — stored in outbox. Set MAIL_USER + MAIL_APP_PASSWORD (Gmail app password).";
    pushBounded(state.emails, rec, 200);
    return rec;
  }
  try {
    if (kind === "resend") {
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
