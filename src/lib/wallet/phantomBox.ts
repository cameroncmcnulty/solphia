import nacl from "tweetnacl";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const PHANTOM_PARAMS = [
  "phantom_encryption_public_key",
  "nonce",
  "data",
  "errorCode",
  "errorMessage",
  "ph",
] as const;

export type PhAfter = {
  kind: "launch_config" | "launch_pool" | "claim" | "swap" | "generic";
  owner?: string;
  mint?: string;
  mintSecret?: string;
  config?: string;
  tokensOut?: number;
  uri?: string;
  image?: string;
  name?: string;
  symbol?: string;
  blurb?: string;
  website?: string;
  x?: string;
  telegram?: string;
  discord?: string;
  launchBuySol?: number;
  id?: string;
  claim?: boolean;
  partner?: boolean;
  side?: string;
  sol?: number;
  tokens?: number;
};

export type PhSession = { dappSk: string; phantomPk: string; session: string };

export type PhJob = {
  id: string;
  at: number;
  dappSk: string;
  phantomPk?: string;
  session?: string;
  packed?: string;
  extraSecrets?: string[];
  after?: PhAfter;
  redirectPath?: string;
  pubkey?: string;
  signature?: string;
  done?: boolean;
};

export function slimAfter(after?: PhAfter): PhAfter | undefined {
  if (!after) return undefined;
  const image = after.image && after.image.startsWith("data:") ? undefined : after.image;
  return { ...after, image };
}

export function slimJob(job: PhJob): PhJob {
  return { ...job, after: slimAfter(job.after) };
}

export function isPhJob(v: unknown): v is PhJob {
  if (!v || typeof v !== "object") return false;
  const j = v as PhJob;
  return typeof j.id === "string" && j.id.length > 8 && typeof j.dappSk === "string" && j.dappSk.length > 20;
}

export function isPhSession(v: unknown): v is PhSession {
  if (!v || typeof v !== "object") return false;
  const s = v as PhSession;
  return Boolean(s.dappSk && s.phantomPk && s.session);
}

export function b58enc(bytes: Uint8Array): string {
  if (!bytes.length) return "";
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  let n = BigInt("0x" + hex);
  let out = "";
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out || "1";
}

export function b58dec(s: string): Uint8Array {
  let n = 0n;
  for (const ch of s) {
    const v = B58.indexOf(ch);
    if (v < 0) throw new Error("bad b58");
    n = n * 58n + BigInt(v);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const body = hex === "00" || hex === "" ? new Uint8Array(0) : Uint8Array.from(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  let zeros = 0;
  while (zeros < s.length && s[zeros] === "1") zeros += 1;
  const out = new Uint8Array(zeros + body.length);
  out.set(body, zeros);
  return out;
}

export function newDappKey(): { sk: string; pk: string } {
  const kp = nacl.box.keyPair();
  return { sk: b58enc(kp.secretKey), pk: b58enc(kp.publicKey) };
}

export function dappPublic(skB58: string): string {
  return b58enc(nacl.box.keyPair.fromSecretKey(b58dec(skB58)).publicKey);
}

export function encryptBox(secretSkB58: string, theirPkB58: string, payload: object): { nonce: string; box: string; dappPk: string } {
  const dapp = nacl.box.keyPair.fromSecretKey(b58dec(secretSkB58));
  const nonce = nacl.randomBytes(24);
  const shared = nacl.box.before(b58dec(theirPkB58), dapp.secretKey);
  const box = nacl.box.after(new TextEncoder().encode(JSON.stringify(payload)), nonce, shared);
  return { nonce: b58enc(nonce), box: b58enc(box), dappPk: b58enc(dapp.publicKey) };
}

export function decryptBox(secretSkB58: string, theirPkB58: string, nonceB58: string, dataB58: string): Record<string, string> | null {
  try {
    const shared = nacl.box.before(b58dec(theirPkB58), b58dec(secretSkB58));
    const opened = nacl.box.open.after(b58dec(dataB58), b58dec(nonceB58), shared);
    if (!opened) return null;
    return JSON.parse(new TextDecoder().decode(opened)) as Record<string, string>;
  } catch {
    return null;
  }
}

export function newJobId(): string {
  return b58enc(nacl.randomBytes(16));
}
