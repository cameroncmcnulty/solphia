const CRLF = "\r\n";

export function envelopeAddr(raw: string): string {
  const s = (raw || "").trim();
  const m = /<([^>]+)>/.exec(s);
  return (m ? m[1] : s).trim().toLowerCase();
}

export function domainOf(addr: string): string {
  const at = envelopeAddr(addr).lastIndexOf("@");
  return at >= 0 ? envelopeAddr(addr).slice(at + 1) : "";
}

export function formatDate(at = Date.now()): string {
  return new Date(at).toUTCString().replace(/GMT$/, "+0000");
}

export function messageId(at = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `<${at.toString(36)}.${rand}@solphia.io>`;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

function encodeWord(s: string): string {
  if (/^[\x20-\x7e]*$/.test(s) && !/[\r\n]/.test(s)) return s;
  const b64 = Buffer.from(s, "utf8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

export function quotedPrintable(input: string): string {
  const bytes = Buffer.from(input, "utf8");
  let out = "";
  let col = 0;
  const push = (chunk: string) => {
    if (col + chunk.length > 75) {
      out += `=${CRLF}`;
      col = 0;
    }
    out += chunk;
    col += chunk.length;
  };
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i]!;
    const isLast = i === bytes.length - 1;
    const safe = (c >= 33 && c <= 60) || (c >= 62 && c <= 126) || ((c === 9 || c === 32) && !isLast);
    if (safe) push(String.fromCharCode(c));
    else push(`=${c.toString(16).toUpperCase().padStart(2, "0")}`);
  }
  return out;
}

export function foldHeader(name: string, value: string): string {
  if (/[\r\n]/.test(value)) return `${name}: ${value}`;
  const line = `${name}: ${value}`;
  if (line.length <= 78) return line;
  const chunks: string[] = [`${name}:`];
  let rest = value;
  while (rest.length) {
    const take = rest.slice(0, 70);
    rest = rest.slice(70);
    chunks.push(` ${take}`);
  }
  return chunks.join(CRLF);
}

export type MimeInput = {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  at?: number;
};

export type MimeMessage = {
  envelopeFrom: string;
  envelopeTo: string[];
  headers: Record<string, string>;
  headerOrder: string[];
  body: string;
  rawWithoutDkim: string;
};

export function buildMime(input: MimeInput): MimeMessage {
  const at = input.at || Date.now();
  const from = (input.from || "").trim();
  const to = (input.to || "").trim();
  const cc = (input.cc || "").trim();
  const bcc = (input.bcc || "").trim();
  const envelopeFrom = envelopeAddr(from);
  const envelopeTo = [to, cc, bcc].flatMap((v) =>
    v
      ? v.split(",").map((x) => envelopeAddr(x)).filter(Boolean)
      : [],
  );
  const html = input.html || "";
  const text = htmlToText(html);
  const boundary = `solphia${at.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const textPart = quotedPrintable(text || " ");
  const htmlPart = quotedPrintable(html || "<p></p>");
  const body = [
    `This is a multi-part message in MIME format.`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    textPart,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    htmlPart,
    `--${boundary}--`,
    ``,
  ].join(CRLF);

  const headers: Record<string, string> = {
    from,
    to,
    subject: encodeWord((input.subject || "").replace(/[\r\n]+/g, " ").slice(0, 180)),
    date: formatDate(at),
    "message-id": messageId(at),
    "mime-version": "1.0",
    "content-type": `multipart/alternative; boundary="${boundary}"`,
  };
  if (cc) headers.cc = cc;
  const headerOrder = ["from", "to", ...(cc ? ["cc"] : []), "subject", "date", "message-id", "mime-version", "content-type"];
  const headerBlock = headerOrder.map((k) => foldHeader(headerName(k), headers[k] || "")).join(CRLF);
  return {
    envelopeFrom,
    envelopeTo,
    headers,
    headerOrder,
    body,
    rawWithoutDkim: `${headerBlock}${CRLF}${CRLF}${body}`,
  };
}

export function headerName(k: string): string {
  const lower = k.toLowerCase();
  if (lower === "dkim-signature") return "DKIM-Signature";
  if (lower === "message-id") return "Message-ID";
  if (lower === "mime-version") return "MIME-Version";
  return k
    .split("-")
    .map((p) => (p === "id" ? "ID" : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("-");
}

export function assembleRaw(headers: Record<string, string>, order: string[], body: string): string {
  const block = order.map((k) => foldHeader(headerName(k), headers[k] || "")).join(CRLF);
  return `${block}${CRLF}${CRLF}${body}`;
}

export { CRLF };
