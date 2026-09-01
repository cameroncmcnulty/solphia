import nodemailer from "nodemailer";
import type { EmailRecord } from "../types";
import { pushBounded } from "../store";
import type { AppState } from "../types";

function transport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user, pass },
  });
}

export async function queueEmail(state: AppState, to: string, subject: string, html: string): Promise<EmailRecord> {
  const rec: EmailRecord = {
    id: `em_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    to,
    subject,
    html,
    status: "queued",
  };
  const mailer = transport();
  if (!mailer) {
    rec.status = "preview";
    rec.error = "SMTP not configured — stored in outbox.";
    pushBounded(state.emails, rec, 200);
    return rec;
  }
  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || "Solphia <alerts@solphia.io>",
      to,
      subject,
      html,
    });
    rec.status = "sent";
  } catch (err) {
    rec.status = "failed";
    rec.error = err instanceof Error ? err.message : "send failed";
  }
  pushBounded(state.emails, rec, 200);
  return rec;
}
