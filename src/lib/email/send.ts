import type { EmailRecord } from "../types";
import { pushBounded } from "../store";
import type { AppState } from "../types";
import { mailAddress } from "./desk";
import { dkimReady } from "./dkim";
import { deliverSolphiaMail } from "./mta";

export type MailerKind = "solphia" | null;

/**
 * Solphia's mailer is first-party: we build RFC 5322, sign DKIM, and speak SMTP
 * to the recipient MX from otp@solphia.io. Not Gmail. Not SES. Not AgentMail. Not Resend.
 */
export function mailerKind(): MailerKind {
  return dkimReady() ? "solphia" : null;
}

export function mailConfigured(): boolean {
  return mailerKind() !== null;
}

export function mailFrom(): string {
  const branded = (process.env.SMTP_FROM || process.env.MAIL_FROM || "").trim();
  if (branded && /@solphia\.io\b/i.test(branded) && !/agentmail\.to/i.test(branded)) return branded;
  return `Solphia <${mailAddress("otp")}>`;
}

export function mailOffHint(kind: "admin" | "user" = "user"): string {
  if (kind === "admin") {
    return `Solphia mail is off on the live server. Set SOLPHIA_DKIM_PRIVATE_KEY so codes leave ${mailAddress("otp")} through Solphia's own SMTP. Publish the DKIM / SPF / DMARC records, then redeploy.`;
  }
  return "Codes are not sending on the live site yet. Try again in a minute.";
}

export async function verifyAgentMail(_otp: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return { ok: false, error: "Solphia sends mail itself. AgentMail is not used." };
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
    rec.error = mailOffHint();
    pushBounded(state.emails, rec, 200);
    return rec;
  }
  try {
    await deliverSolphiaMail({
      from,
      to,
      cc: opts?.cc,
      bcc: opts?.bcc,
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
