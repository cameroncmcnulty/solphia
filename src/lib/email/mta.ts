import { attachDkim, dkimReady } from "./dkim";
import { assembleRaw, buildMime, domainOf, type MimeInput } from "./rfc5322";
import { mailHostOverride, smtpSend } from "./smtp";

export async function deliverSolphiaMail(input: MimeInput): Promise<{ host: string; port: number }> {
  if (!dkimReady()) throw new Error("Solphia DKIM key is not set.");
  const mime = buildMime(input);
  if (!mime.envelopeFrom) throw new Error("missing MAIL FROM");
  if (!mime.envelopeTo.length) throw new Error("missing RCPT TO");
  const signed = attachDkim(mime.headers, mime.headerOrder, mime.body);
  const raw = assembleRaw(signed.headers, signed.headerOrder, mime.body);
  const override = mailHostOverride();
  if (override) {
    return smtpSend({
      envelopeFrom: mime.envelopeFrom,
      envelopeTo: mime.envelopeTo,
      raw,
      host: override,
    });
  }
  const groups = new Map<string, string[]>();
  for (const rcpt of mime.envelopeTo) {
    const d = domainOf(rcpt);
    if (!d) throw new Error(`bad_rcpt ${rcpt}`);
    const list = groups.get(d) || [];
    list.push(rcpt);
    groups.set(d, list);
  }
  let last: { host: string; port: number } | null = null;
  const errors: string[] = [];
  for (const [domain, rcpts] of groups) {
    try {
      last = await smtpSend({
        envelopeFrom: mime.envelopeFrom,
        envelopeTo: rcpts,
        raw,
        mxDomain: domain,
      });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "send failed");
    }
  }
  if (errors.length) throw new Error(errors.join("; "));
  return last || { host: "", port: 0 };
}
