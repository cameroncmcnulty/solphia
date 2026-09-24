import { NextRequest, NextResponse } from "next/server";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { b58dec, b58enc, decryptBox, dappPublic, encryptBox, newDappKey, newJobId, type PhAfter, type PhJob } from "@/lib/wallet/phantomBox";
import { delPhJob, getPhJob, loadPhSession, putPhJob, savePhSession } from "@/lib/wallet/phantomJob";
import { extrasFromSecrets, signedTxB64 } from "@/lib/solana/extraSign";
import { broadcastB64 } from "@/lib/solana/broadcast";
import { b64ToBytes } from "@/lib/solana/wire";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function originOf(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "solphia.io";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function redirectFor(req: NextRequest, job: PhJob): string {
  const origin = originOf(req);
  const path = (job.redirectPath || "/launch").split("#")[0] || "/launch";
  const u = new URL(path.startsWith("http") ? path : origin + (path.startsWith("/") ? path : "/" + path));
  u.searchParams.delete("phantom_encryption_public_key");
  u.searchParams.delete("nonce");
  u.searchParams.delete("data");
  u.searchParams.delete("errorCode");
  u.searchParams.delete("errorMessage");
  u.searchParams.set("ph", job.id);
  return u.toString();
}

function connectUrl(req: NextRequest, job: PhJob): string {
  const origin = originOf(req);
  const q = new URLSearchParams({
    app_url: `${origin}/`,
    dapp_encryption_public_key: dappPublic(job.dappSk),
    redirect_link: redirectFor(req, job),
    cluster: "mainnet-beta",
  });
  return `https://phantom.app/ul/v1/connect?${q.toString()}`;
}

function signUrl(req: NextRequest, job: PhJob): string | null {
  if (!job.packed || !job.session || !job.phantomPk) return null;
  let raw: Uint8Array;
  try {
    raw = b64ToBytes(job.packed);
  } catch {
    return null;
  }
  const boxed = encryptBox(job.dappSk, job.phantomPk, { transaction: b58enc(raw), session: job.session });
  const q = new URLSearchParams({
    dapp_encryption_public_key: boxed.dappPk,
    nonce: boxed.nonce,
    redirect_link: redirectFor(req, job),
    payload: boxed.box,
  });
  return `https://phantom.app/ul/v1/signTransaction?${q.toString()}`;
}

async function openJob(req: NextRequest, body: Record<string, unknown>) {
  const pubkey = typeof body.pubkey === "string" && isSolanaAddress(body.pubkey) ? body.pubkey : "";
  const packed = typeof body.packed === "string" ? body.packed : "";
  const extraSecrets = Array.isArray(body.extraSecrets)
    ? body.extraSecrets.filter((s): s is string => typeof s === "string" && s.length > 8).slice(0, 4)
    : [];
  const after = body.after && typeof body.after === "object" ? (body.after as PhAfter) : undefined;
  const redirectPath = typeof body.redirectPath === "string" ? body.redirectPath.slice(0, 400) : "/launch";
  const sess = pubkey ? await loadPhSession(pubkey) : null;
  const keys = sess?.dappSk ? { sk: sess.dappSk, pk: dappPublic(sess.dappSk) } : newDappKey();
  const job: PhJob = {
    id: newJobId(),
    at: Date.now(),
    dappSk: keys.sk,
    phantomPk: sess?.phantomPk,
    session: sess?.session,
    packed: packed || undefined,
    extraSecrets: extraSecrets.length ? extraSecrets : undefined,
    after,
    redirectPath,
    pubkey: pubkey || undefined,
  };
  await putPhJob(job);
  if (job.session && job.phantomPk && job.packed) {
    const url = signUrl(req, job);
    if (url) return NextResponse.json({ id: job.id, url, mode: "sign" });
  }
  return NextResponse.json({ id: job.id, url: connectUrl(req, job), mode: "connect" });
}

async function completeJob(req: NextRequest, body: Record<string, unknown>) {
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "missing_job" }, { status: 400 });
  const job = await getPhJob(id);
  if (!job) return NextResponse.json({ error: "Launch session expired. Tap Launch again." }, { status: 400 });
  if (job.done && job.signature) {
    return NextResponse.json({ signature: job.signature, after: job.after, pubkey: job.pubkey });
  }
  const err = typeof body.errorCode === "string" ? body.errorCode : "";
  if (err) {
    const message = typeof body.errorMessage === "string" && body.errorMessage ? body.errorMessage : "Signature declined in Phantom.";
    return NextResponse.json({ error: message, declined: /user rejected|4001/i.test(message + err) });
  }
  const nonce = typeof body.nonce === "string" ? body.nonce : "";
  const data = typeof body.data === "string" ? body.data : "";
  const phantomPk = (typeof body.phantom_encryption_public_key === "string" && body.phantom_encryption_public_key) || job.phantomPk || "";
  if (!nonce || !data || !phantomPk) {
    return NextResponse.json({ error: "Phantom came back empty. Tap Launch again." }, { status: 400 });
  }
  const json = decryptBox(job.dappSk, phantomPk, nonce, data);
  if (!json) {
    job.session = undefined;
    job.phantomPk = undefined;
    await putPhJob(job);
    return NextResponse.json({ error: "Could not read Phantom's reply.", url: connectUrl(req, job), mode: "connect" });
  }
  if (json.public_key && json.session) {
    if (!isSolanaAddress(json.public_key)) {
      return NextResponse.json({ error: "Phantom returned a bad wallet." }, { status: 400 });
    }
    job.pubkey = json.public_key;
    job.session = json.session;
    job.phantomPk = phantomPk;
    await putPhJob(job);
    await savePhSession(json.public_key, { dappSk: job.dappSk, phantomPk, session: json.session });
    if (job.packed) {
      const url = signUrl(req, job);
      if (url) return NextResponse.json({ id: job.id, pubkey: json.public_key, url, mode: "sign" });
    }
    return NextResponse.json({ id: job.id, pubkey: json.public_key, mode: "connect" });
  }
  if (!json.transaction) {
    return NextResponse.json({ error: "Phantom did not return a signed transaction." }, { status: 400 });
  }
  let signed: Uint8Array;
  try {
    signed = b58dec(json.transaction);
  } catch {
    return NextResponse.json({ error: "Phantom's signature was unreadable." }, { status: 400 });
  }
  const extras = extrasFromSecrets(job.extraSecrets);
  let b64: string;
  try {
    b64 = signedTxB64(signed, extras.length ? extras : undefined);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not attach the mint signature." },
      { status: 400 },
    );
  }
  let signature: string;
  try {
    signature = await broadcastB64(b64);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Broadcast failed." }, { status: 400 });
  }
  job.done = true;
  job.signature = signature;
  job.extraSecrets = undefined;
  await putPhJob(job);
  if (job.after?.kind === "generic" || !job.after) await delPhJob(job.id);
  return NextResponse.json({ signature, after: job.after, pubkey: job.pubkey, mint: job.after?.mint });
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientIp(req) + ":phantom", 30, 60_000)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_body" }, { status: 400 });
    const action = body.action === "complete" ? "complete" : "open";
    return action === "complete" ? await completeJob(req, body) : await openJob(req, body);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "phantom failed" }, { status: 500 });
  }
}
