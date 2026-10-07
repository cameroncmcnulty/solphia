import { createHash, createPrivateKey, createSign, type KeyObject } from "node:crypto";
import {
  DKIM_DOMAIN,
  DKIM_PUBLIC_P,
  DKIM_SELECTOR,
  dkimDnsHost,
  dkimDnsTxt,
} from "./dkim-public";
import { CRLF, headerName } from "./rfc5322";

export {
  DKIM_DOMAIN,
  DKIM_PUBLIC_P,
  DKIM_SELECTOR,
  dkimDnsHost,
  dkimDnsTxt,
};

const SIGNED = ["from", "to", "subject", "date", "message-id", "mime-version", "content-type"] as const;

export function dkimPrivateKeyPem(): string {
  const raw = (process.env.SOLPHIA_DKIM_PRIVATE_KEY || "").trim();
  if (!raw) return "";
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function dkimReady(): boolean {
  const pem = dkimPrivateKeyPem();
  return pem.includes("PRIVATE KEY") && pem.length > 80;
}

function loadKey(): KeyObject {
  return createPrivateKey(dkimPrivateKeyPem());
}

export function canonicalizeHeader(name: string, value: string): string {
  const v = value.replace(/\r?\n[ \t]+/g, " ").replace(/[ \t]+/g, " ").trim();
  return `${name.toLowerCase()}:${v}`;
}

export function canonicalizeBody(body: string): string {
  let s = body.replace(/\r\n/g, "\n").replace(/\n/g, CRLF);
  s = s
    .split(CRLF)
    .map((line) => line.replace(/[ \t]+$/g, "").replace(/[ \t]+/g, " "))
    .join(CRLF);
  s = s.replace(/(?:\r\n)+$/, CRLF);
  if (!s.endsWith(CRLF)) s += CRLF;
  if (s === CRLF) return CRLF;
  return s;
}

function foldB(sig: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < sig.length; i += 70) chunks.push(sig.slice(i, i + 70));
  return chunks.join(`${CRLF} `);
}

export function signDkim(
  headers: Record<string, string>,
  headerOrder: string[],
  body: string,
  key: KeyObject = loadKey(),
): string {
  const bh = createHash("sha256").update(canonicalizeBody(body)).digest("base64");
  const hFields = SIGNED.filter((n) => headers[n]);
  const t = Math.floor(Date.now() / 1000);
  const tags = [
    `v=1`,
    `a=rsa-sha256`,
    `c=relaxed/relaxed`,
    `d=${DKIM_DOMAIN}`,
    `s=${DKIM_SELECTOR}`,
    `t=${t}`,
    `bh=${bh}`,
    `h=${hFields.join(":")}`,
    `b=`,
  ];
  const dkimValue = tags.join("; ");
  const canon: string[] = [];
  for (const name of hFields) {
    const orig = headerOrder.find((k) => k.toLowerCase() === name) || name;
    canon.push(canonicalizeHeader(name, headers[orig] || headers[name] || ""));
  }
  canon.push(canonicalizeHeader("dkim-signature", dkimValue));
  const signer = createSign("RSA-SHA256");
  signer.update(canon.join(CRLF));
  signer.end();
  const b = signer.sign(key).toString("base64");
  return `${dkimValue}${foldB(b)}`;
}

export function attachDkim(
  headers: Record<string, string>,
  headerOrder: string[],
  body: string,
): { headers: Record<string, string>; headerOrder: string[] } {
  const sig = signDkim(headers, headerOrder, body);
  return {
    headers: { "dkim-signature": sig, ...headers },
    headerOrder: ["dkim-signature", ...headerOrder],
  };
}

export function headerLine(name: string, value: string): string {
  return `${headerName(name)}: ${value}`;
}
