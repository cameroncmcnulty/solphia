import net from "node:net";
import tls from "node:tls";
import dns from "node:dns";
import { once } from "node:events";
import { mailHeloName } from "./dkim-public";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  /* node < 16 */
}

const CONNECT_MS = process.env.VERCEL ? 2_500 : 8_000;
const REPLY_MS = process.env.VERCEL ? 12_000 : 25_000;

export type SmtpReply = { code: number; text: string; lines: string[] };

export type SmtpSendInput = {
  envelopeFrom: string;
  envelopeTo: string[];
  raw: string;
  /** Skip MX lookup — tests and our own mail.solphia.io box. */
  host?: string;
  mxDomain?: string;
  port?: number;
  helo?: string;
  /** Worker process delivering to MX — do not POST back to ourselves. */
  skipWorker?: boolean;
};

function envHost(): string {
  return (process.env.SOLPHIA_MAIL_HOST || "").trim();
}

function envPort(): number | null {
  const n = Number(process.env.SOLPHIA_MAIL_PORT || "");
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : null;
}

export function mailHostOverride(): string {
  return envHost();
}

export function mailWorkerUrl(): string {
  return (process.env.SOLPHIA_MAIL_WORKER_URL || "").trim().replace(/\/$/, "");
}

export function mailWorkerSecret(): string {
  return (process.env.SOLPHIA_MAIL_WORKER_SECRET || "").trim();
}

export function mailHelo(): string {
  return (process.env.SOLPHIA_MAIL_HELO || mailHeloName()).trim() || mailHeloName();
}

/** Direct-to-MX uses 25. 587 is a fallback when 25 is blocked (Vercel). */
export function mailPorts(explicit?: number): number[] {
  if (explicit && explicit > 0) return [explicit];
  const env = envPort();
  if (env) return [env];
  return [25, 587];
}

function stripDot(host: string): string {
  return host.replace(/\.$/, "").toLowerCase();
}

/** Smarthosts we refuse. Recipient MX (aspmx.l.google.com) is not a smarthost. */
export function isThirdPartySmarthost(host: string): boolean {
  const h = stripDot(host);
  return (
    h === "gmail.com" ||
    h === "googlemail.com" ||
    h === "smtp.gmail.com" ||
    h === "smtp.googlemail.com" ||
    h.endsWith(".gmail.com") ||
    h.endsWith(".googlemail.com") ||
    h.includes("amazonses.com") ||
    h.startsWith("email-smtp.") ||
    h.includes("resend.com") ||
    h.includes("smtp.sendgrid.net") ||
    h.includes("mailgun.org") ||
    h.includes("postmarkapp.com") ||
    h.includes("agentmail.to") ||
    h.includes("sparkpostmail.com") ||
    h.includes("mailersend") ||
    h.includes("sendinblue") ||
    h.includes("brevo.com")
  );
}

function localName(host: string): boolean {
  const h = stripDot(host);
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

async function resolveMxList(domain: string, servers?: string[]): Promise<string[]> {
  const r = new dns.promises.Resolver();
  if (servers?.length) r.setServers(servers);
  const recs = await r.resolveMx(domain);
  return recs
    .sort((a, b) => a.priority - b.priority)
    .map((row) => stripDot(row.exchange))
    .filter(Boolean);
}

export async function lookupMx(domain: string): Promise<string[]> {
  const d = stripDot(domain);
  if (!d) return [];
  for (const servers of [undefined, ["8.8.8.8", "1.1.1.1"]] as (string[] | undefined)[]) {
    try {
      const hosts = await resolveMxList(d, servers);
      if (hosts.length) return hosts;
    } catch {
      /* try next resolver */
    }
  }
  return [d];
}

async function sendViaWorker(input: SmtpSendInput): Promise<{ host: string; port: number }> {
  const url = mailWorkerUrl();
  const secret = mailWorkerSecret();
  if (!url || !secret) throw new Error("mail_worker_off");
  const r = await fetch(`${url}/send`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      envelopeFrom: input.envelopeFrom,
      envelopeTo: input.envelopeTo,
      raw: input.raw,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; host?: string; port?: number };
  if (!r.ok || !j.ok) {
    throw new Error(typeof j.error === "string" && j.error ? j.error : `mail_worker_${r.status}`);
  }
  return { host: j.host || "worker", port: j.port || 443 };
}

function takeReply(buf: string): { reply: SmtpReply; rest: string } | null {
  let pos = 0;
  const lines: string[] = [];
  while (pos < buf.length) {
    const i = buf.indexOf("\r\n", pos);
    if (i < 0) return null;
    const line = buf.slice(pos, i);
    pos = i + 2;
    if (!/^\d{3}(?:[- ].*)?$/.test(line)) continue;
    lines.push(line);
    const sep = line.length > 3 ? line.charAt(3) : " ";
    if (sep !== "-") {
      const code = Number(line.slice(0, 3));
      const text = lines.map((l) => (l.length > 4 ? l.slice(4) : "")).join("\n");
      return { reply: { code, text, lines }, rest: buf.slice(pos) };
    }
  }
  return null;
}

class SmtpSession {
  private socket: net.Socket;
  private buf = "";
  private quitting = false;
  private pending: Array<{
    resolve: (r: SmtpReply) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(socket: net.Socket) {
    this.socket = socket;
    this.attach(socket);
  }

  private attach(socket: net.Socket) {
    socket.on("data", (chunk: Buffer) => {
      this.buf += chunk.toString("utf8");
      for (;;) {
        const parsed = takeReply(this.buf);
        if (!parsed) break;
        this.buf = parsed.rest;
        const waiter = this.pending.shift();
        if (waiter) {
          clearTimeout(waiter.timer);
          waiter.resolve(parsed.reply);
        }
      }
    });
    const fail = (err: Error) => {
      if (this.quitting) return;
      const waiters = this.pending.splice(0);
      for (const w of waiters) {
        clearTimeout(w.timer);
        w.reject(err);
      }
    };
    socket.on("error", (err) => fail(err instanceof Error ? err : new Error("smtp_socket")));
    socket.on("close", () => fail(new Error("smtp_closed")));
  }

  read(): Promise<SmtpReply> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.pending.findIndex((w) => w.timer === timer);
        if (i >= 0) this.pending.splice(i, 1);
        reject(new Error("smtp_timeout"));
      }, REPLY_MS);
      this.pending.push({ resolve, reject, timer });
    });
  }

  async cmd(line: string): Promise<SmtpReply> {
    this.socket.write(`${line}\r\n`);
    return this.read();
  }

  async startTls(servername: string) {
    const r = await this.cmd("STARTTLS");
    if (r.code !== 220) throw new Error(`starttls ${r.code} ${r.text}`.trim());
    this.socket.removeAllListeners("data");
    this.socket.removeAllListeners("error");
    this.socket.removeAllListeners("close");
    const secure = tls.connect({
      socket: this.socket,
      servername: localName(servername) ? undefined : servername,
      minVersion: "TLSv1.2",
      rejectUnauthorized: !localName(servername),
    });
    await once(secure, "secureConnect");
    this.socket = secure;
    this.buf = "";
    this.attach(secure);
  }

  async data(raw: string) {
    const r = await this.cmd("DATA");
    if (r.code !== 354) throw new Error(`data ${r.code} ${r.text}`.trim());
    const stuffed = stuffDots(raw);
    this.socket.write(stuffed.endsWith("\r\n") ? `${stuffed}.\r\n` : `${stuffed}\r\n.\r\n`);
    const done = await this.read();
    if (done.code !== 250) throw new Error(`data ${done.code} ${done.text}`.trim());
  }

  async quit() {
    this.quitting = true;
    try {
      await this.cmd("QUIT");
    } catch {
      /* ignore */
    }
    try {
      this.socket.end();
    } catch {
      /* ignore */
    }
  }
}

export function stuffDots(raw: string): string {
  let s = raw.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  if (!s.endsWith("\r\n")) s += "\r\n";
  return s
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function connect(host: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host, port });
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error(`smtp_connect_timeout ${host}:${port}`));
    }, CONNECT_MS);
    sock.once("connect", () => {
      clearTimeout(timer);
      sock.setTimeout(REPLY_MS);
      resolve(sock);
    });
    sock.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    sock.once("timeout", () => {
      sock.destroy();
      reject(new Error(`smtp_socket_timeout ${host}:${port}`));
    });
  });
}

async function sessionOn(host: string, port: number, helo: string, input: SmtpSendInput): Promise<void> {
  const sock = await connect(host, port);
  const s = new SmtpSession(sock);
  try {
    const greet = await s.read();
    if (greet.code !== 220) throw new Error(`banner ${greet.code} ${greet.text}`.trim());
    let ehlo = await s.cmd(`EHLO ${helo}`);
    if (ehlo.code >= 400) ehlo = await s.cmd(`HELO ${helo}`);
    if (ehlo.code >= 400) throw new Error(`ehlo ${ehlo.code} ${ehlo.text}`.trim());
    const caps = new Set(ehlo.lines.map((l) => l.slice(4).split(" ")[0]!.toUpperCase()));
    if (caps.has("STARTTLS") && !(sock instanceof tls.TLSSocket) && port !== 465) {
      await s.startTls(host);
      ehlo = await s.cmd(`EHLO ${helo}`);
      if (ehlo.code >= 400) throw new Error(`ehlo ${ehlo.code} ${ehlo.text}`.trim());
    }
    const mail = await s.cmd(`MAIL FROM:<${input.envelopeFrom}>`);
    if (mail.code !== 250) throw new Error(`mail ${mail.code} ${mail.text}`.trim());
    for (const rcpt of input.envelopeTo) {
      const to = await s.cmd(`RCPT TO:<${rcpt}>`);
      if (to.code !== 250 && to.code !== 251) throw new Error(`rcpt ${to.code} ${to.text}`.trim());
    }
    await s.data(input.raw);
  } finally {
    await s.quit().catch(() => sock.destroy());
  }
}

export async function smtpSend(input: SmtpSendInput): Promise<{ host: string; port: number }> {
  if (!input.envelopeFrom) throw new Error("missing MAIL FROM");
  if (!input.envelopeTo.length) throw new Error("missing RCPT TO");
  if (!input.skipWorker && mailWorkerUrl() && mailWorkerSecret()) {
    return sendViaWorker(input);
  }
  const helo = input.helo || mailHelo();
  const override = input.host || envHost();
  if (override && isThirdPartySmarthost(override)) {
    throw new Error("Solphia does not send through a third-party mail host.");
  }
  const hosts = override ? [stripDot(override)] : await lookupMx(input.mxDomain || "");
  if (!hosts.length) throw new Error("no_mx");
  const limited = process.env.VERCEL ? hosts.slice(0, 1) : hosts;
  const ports = mailPorts(input.port);
  let last: Error = new Error("smtp_failed");
  let blocked25 = false;
  for (const host of limited) {
    for (const port of ports) {
      if (port === 25 && blocked25) continue;
      try {
        await sessionOn(host, port, helo, input);
        return { host, port };
      } catch (err) {
        last = err instanceof Error ? err : new Error("smtp_failed");
        const msg = last.message;
        if (port === 25 && /timeout|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/i.test(msg)) blocked25 = true;
        if (/\b5\d\d\b/.test(msg) && /mail |rcpt |data /.test(msg)) throw last;
      }
    }
  }
  if (process.env.VERCEL && blocked25) {
    throw new Error(
      "Vercel blocks outbound port 25, which Gmail needs. Solphia's mailer is on. Same code on a box we control (SOLPHIA_MAIL_HOST) can deliver.",
    );
  }
  throw last;
}
