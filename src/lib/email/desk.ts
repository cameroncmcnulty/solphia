import { SITE_URL } from "../config";
import { isEmail } from "../security";

export const MAIL_DOMAIN = "solphia.io";
export const MAIL_MSG_MAX = 400;
export const MAIL_IDENT_MAX = 24;

export type MailIdentity = {
  local: string;
  name: string;
  createdAt: number;
};

export type MailFolder = "inbox" | "sent" | "drafts" | "outbox";

export type MailMessage = {
  id: string;
  at: number;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  text?: string;
  folder: MailFolder;
  status: "queued" | "sent" | "failed" | "preview" | "draft";
  error?: string;
  starred?: boolean;
  read?: boolean;
};

export type MailBook = {
  identities: MailIdentity[];
  messages: MailMessage[];
};

export function defaultIdentities(): MailIdentity[] {
  return [{ local: "admin", name: "Solphia", createdAt: 0 }];
}

export function emptyMail(): MailBook {
  return { identities: defaultIdentities(), messages: [] };
}

export function ensureMail(book?: MailBook | null): MailBook {
  const b = book || emptyMail();
  if (!Array.isArray(b.identities) || !b.identities.length) b.identities = defaultIdentities();
  if (!Array.isArray(b.messages)) b.messages = [];
  if (!b.identities.some((i) => i.local === "admin")) {
    b.identities.unshift({ local: "admin", name: "Solphia", createdAt: 0 });
  }
  return b;
}

export function mailAddress(local: string): string {
  return `${local.trim().toLowerCase()}@${MAIL_DOMAIN}`;
}

export function localOf(addr: string): string {
  return addr.trim().toLowerCase().split("@")[0] || "";
}

export function identityOk(local: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._-]{0,30}[a-z0-9])?$/.test(local.trim().toLowerCase());
}

export function createIdentity(
  book: MailBook,
  opts: { local: string; name?: string; now?: number },
): { ok: true; identity: MailIdentity } | { ok: false; error: string } {
  const local = (opts.local || "").trim().toLowerCase();
  if (!identityOk(local)) return { ok: false, error: "bad_local" };
  if (book.identities.length >= MAIL_IDENT_MAX) return { ok: false, error: "full" };
  if (book.identities.some((i) => i.local === local)) return { ok: false, error: "taken" };
  const identity: MailIdentity = {
    local,
    name: (opts.name || local).trim().slice(0, 48) || local,
    createdAt: opts.now || Date.now(),
  };
  book.identities.push(identity);
  return { ok: true, identity };
}

export function sphaMarkUrl(): string {
  return `${SITE_URL.replace(/\/$/, "")}/spha-mark.png?v=2`;
}

/** Cut-and-paste SPHA mark — never the Solana logo. */
export function signatureHtml(fromName = "Solphia", fromEmail = mailAddress("admin")): string {
  const mark = sphaMarkUrl();
  return `<table cellpadding="0" cellspacing="0" style="margin-top:28px;font-family:Georgia,serif;">
  <tr>
    <td style="padding-right:14px;vertical-align:middle;">
      <img src="${mark}" alt="SPHA" width="44" height="44" style="display:block;border:0;width:44px;height:44px;" />
    </td>
    <td style="vertical-align:middle;border-left:1px solid #2a1d3a;padding-left:14px;">
      <div style="font-size:16px;color:#f4f0ea;letter-spacing:0.04em;">${escapeHtml(fromName)}</div>
      <div style="font-size:12px;color:#14f195;font-family:ui-monospace,monospace;margin-top:2px;">${escapeHtml(fromEmail)}</div>
      <div style="font-size:11px;color:#7a708c;margin-top:6px;letter-spacing:0.22em;">SOLPHIA</div>
    </td>
  </tr>
</table>`;
}

export function withSignature(html: string, fromName?: string, fromEmail?: string): string {
  if (/spha-mark\.png/i.test(html)) return html;
  return `${html}${signatureHtml(fromName, fromEmail)}`;
}

export function composeMail(
  book: MailBook,
  opts: {
    fromLocal: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    html: string;
    folder?: MailFolder;
    now?: number;
  },
): { ok: true; message: MailMessage } | { ok: false; error: string } {
  const ident = book.identities.find((i) => i.local === opts.fromLocal.trim().toLowerCase());
  if (!ident) return { ok: false, error: "no_identity" };
  const to = (opts.to || "").trim();
  if (opts.folder !== "drafts" && !isEmail(to)) return { ok: false, error: "bad_to" };
  const from = mailAddress(ident.local);
  const html = withSignature(opts.html || "", ident.name, from);
  const rec: MailMessage = {
    id: `em_${(opts.now || Date.now()).toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    at: opts.now || Date.now(),
    from,
    to,
    cc: (opts.cc || "").trim() || undefined,
    bcc: (opts.bcc || "").trim() || undefined,
    subject: (opts.subject || "").trim().slice(0, 180) || "(no subject)",
    html,
    folder: opts.folder || "outbox",
    status: opts.folder === "drafts" ? "draft" : "queued",
    read: true,
  };
  book.messages.push(rec);
  if (book.messages.length > MAIL_MSG_MAX) book.messages.splice(0, book.messages.length - MAIL_MSG_MAX);
  return { ok: true, message: rec };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
}
