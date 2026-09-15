import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { clientIp } from "@/lib/security";
import { audit, pushBounded, withMail } from "@/lib/store";
import { queueEmail } from "@/lib/email/send";
import {
  composeMail,
  createIdentity,
  ensureMail,
  mailAddress,
  signatureHtml,
} from "@/lib/email/desk";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  action: z.enum(["create", "draft", "send", "star", "read", "delete"]),
  local: z.string().max(32).optional(),
  name: z.string().max(48).optional(),
  fromLocal: z.string().max(32).optional(),
  to: z.string().max(120).optional(),
  cc: z.string().max(240).optional(),
  bcc: z.string().max(240).optional(),
  subject: z.string().max(180).optional(),
  html: z.string().max(80_000).optional(),
  id: z.string().optional(),
  starred: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = await withMail((st) => st, false);
  const book = ensureMail(s.mail);
  return NextResponse.json({
    ok: true,
    identities: book.identities.map((i) => ({ ...i, email: mailAddress(i.local) })),
    messages: [...book.messages].reverse().slice(0, 200),
    signature: signatureHtml("Solphia", mailAddress("admin")),
    admin: mailAddress("admin"),
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;
  const ip = clientIp(req);

  if (b.action === "create") {
    const out = await withMail((s) => {
      s.mail = ensureMail(s.mail);
      const r = createIdentity(s.mail, { local: b.local || "", name: b.name });
      pushBounded(s.audit, audit("admin", "mail_identity", b.local || "", ip), 400);
      return r;
    }, true);
    if (!out.ok) {
      const message = out.error === "taken" ? "That address is already in use." : "Use letters, numbers, dots, or dashes.";
      return NextResponse.json({ error: out.error, message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, identity: { ...out.identity, email: mailAddress(out.identity.local) } });
  }

  if (b.action === "draft" || b.action === "send") {
    const composed = await withMail((s) => {
      s.mail = ensureMail(s.mail);
      return composeMail(s.mail, {
        fromLocal: b.fromLocal || "admin",
        to: b.to || "",
        cc: b.cc,
        bcc: b.bcc,
        subject: b.subject || "",
        html: b.html || "",
        folder: b.action === "draft" ? "drafts" : "outbox",
      });
    }, true);
    if (!composed.ok) {
      const message = composed.error === "bad_to" ? "Enter a real recipient." : "Could not compose.";
      return NextResponse.json({ error: composed.error, message }, { status: 400 });
    }
    if (b.action === "draft") return NextResponse.json({ ok: true, message: composed.message });
    const sent = await withMail(async (s) => {
      s.mail = ensureMail(s.mail);
      const rec = s.mail.messages.find((m) => m.id === composed.message.id);
      if (!rec) return composed.message;
      const out = await queueEmail(s, rec.to, rec.subject, rec.html, { from: rec.from, cc: rec.cc, bcc: rec.bcc });
      rec.status = out.status;
      rec.error = out.error;
      rec.folder = out.status === "sent" || out.status === "preview" ? "sent" : "outbox";
      pushBounded(s.audit, audit("admin", "mail_send", rec.to, ip), 400);
      return rec;
    }, true);
    return NextResponse.json({ ok: true, message: sent });
  }

  const out = await withMail((s) => {
    s.mail = ensureMail(s.mail);
    const rec = s.mail.messages.find((m) => m.id === b.id);
    if (!rec) return { ok: false as const, error: "missing" };
    if (b.action === "star") rec.starred = typeof b.starred === "boolean" ? b.starred : !rec.starred;
    if (b.action === "read") rec.read = true;
    if (b.action === "delete") s.mail.messages = s.mail.messages.filter((m) => m.id !== b.id);
    return { ok: true as const };
  }, true);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
