import fs from "fs";
import path from "path";
import { SITE_URL, XAI_API_KEY, XAI_BASE } from "../config";
import { DATA_DIR, loadState, mutateState, audit, pushBounded } from "../store";
import type { AppState, PromoItem, PromoPending } from "../types";

export const PROMO_CAP = 24;
const FACE = `${SITE_URL.replace(/\/$/, "")}/solphia-face.png`;
const HERO = `${SITE_URL.replace(/\/$/, "")}/solphia-hero.png`;
const OG = `${SITE_URL.replace(/\/$/, "")}/og.jpg`;

function promoDir() {
  const dir = path.join(DATA_DIR, "promos");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function promoPath(file: string) {
  return path.join(promoDir(), file);
}

function id() {
  return `prm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function aestheticPnl() {
  const pct = 0.4 + Math.random() * 3.1;
  const usd = 18 + Math.random() * 92;
  return `+${pct.toFixed(1)}% · +$${usd.toFixed(0)} USDC`;
}

type Aspect = "1:1" | "16:9" | "9:16";

type Brief = {
  kind: "image" | "video";
  aspect: Aspect;
  useFace?: boolean;
  useHero?: boolean;
  headline: string;
  caption: string;
  prompt: string;
  pnlLabel: string;
};

function briefs(now = Date.now()): Brief[] {
  const pnl = aestheticPnl();
  const day = new Date(now).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const base =
    "Dark void #04000a, acid green #14F195, Solana violet #9945FF. Cinematic, sharp, premium fintech. SOLPHIA wordmark. solphia.io. No memecoins, no seed phrases, no leverage, no cartoon mascot.";
  const job =
    "She is a non-custodial Solana bot. She holds SOL, USDC, and official SPYx (S&P 500), QQQx (Nasdaq-100), and GLDx (gold). She clips whichever pair is stretched. Spot only. Keys stay in Phantom.";
  return [
    {
      kind: "image",
      aspect: "1:1",
      useFace: true,
      headline: "She watches the tape",
      pnlLabel: pnl,
      caption: `${job}\n\nIllustrative mark ${pnl} — not a live promise.\nPaper first. Kill switch on.\n\nsolphia.io`,
      prompt: `${base} Keep this woman's face and likeness exactly. Close portrait, circuit-green eyes, calm. Tiny overlay text "SOLPHIA" and "${pnl}". ${job} Square social post.`,
    },
    {
      kind: "image",
      aspect: "16:9",
      useHero: true,
      headline: "SOL vs S&P, Nasdaq, gold",
      pnlLabel: pnl,
      caption: `SOLPHIA splits a bag across SOL, USDC, S&P 500, Nasdaq-100, and gold — official xStocks only. When one sleeve stretches she clips it. When nothing moved she sits.\n\n${pnl} on a quiet ${day} (aesthetic, not a live print).\n\nsolphia.io`,
      prompt: `${base} Widescreen brand film still. Use this hero as the scene. Overlay SOLPHIA, solphia.io, and "${pnl}". Five sleeves: SOL USDC SPYx QQQx GLDx. ${job}`,
    },
    {
      kind: "image",
      aspect: "9:16",
      useFace: true,
      headline: "Add SOL. She runs.",
      pnlLabel: pnl,
      caption: `Connect Phantom once. Add SOL. She trades official SPYx, QQQx, and GLDx from the wallet on your phone — no extra popups. 0.2 SOL / 30 days + 0.1% a clip.\n\n${pnl} · story frame · solphia.io`,
      prompt: `${base} Keep her face. Vertical story 9:16. Big type SOLPHIA and solphia.io. Small "${pnl}". Phone-first. ${job}`,
    },
    {
      kind: "video",
      aspect: "9:16",
      useFace: true,
      headline: "The desk is live",
      pnlLabel: pnl,
      caption: `5 seconds of her. Dark desk. Green tick. She holds SOL against the S&P, Nasdaq, and gold.\n\n${job}\n\n${pnl} (for the post, not a live book).\nsolphia.io`,
      prompt: `${base} Animate this still. Slow camera push on her face, faint green data moving in the eyes, "SOLPHIA" and solphia.io hold on screen. Calm, no chaos, no coins flying. ${job}`,
    },
  ];
}

export function prunePromos(state: AppState) {
  if (!state.promos) state.promos = [];
  while (state.promos.length > PROMO_CAP) {
    const old = state.promos.shift();
    if (old?.file) {
      try {
        fs.unlinkSync(promoPath(old.file));
      } catch {
        /* gone */
      }
    }
  }
}

async function imagineImage(prompt: string, aspect: Aspect, imageUrl?: string): Promise<{ b64?: string; url?: string; mime: string }> {
  if (!XAI_API_KEY) throw new Error("XAI_API_KEY missing");
  const endpoint = imageUrl ? `${XAI_BASE}/images/edits` : `${XAI_BASE}/images/generations`;
  const body: Record<string, unknown> = {
    model: "grok-imagine-image-2.0",
    prompt,
    aspect_ratio: aspect,
    quality: "low",
    response_format: "b64_json",
  };
  if (imageUrl) body.image = { url: imageUrl, type: "image_url" };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${XAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  const json = (await res.json()) as {
    data?: { b64_json?: string; url?: string; mime_type?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || `imagine ${res.status}`);
  const row = json.data?.[0];
  if (!row) throw new Error("no image");
  return { b64: row.b64_json, url: row.url, mime: row.mime_type || "image/jpeg" };
}

async function startVideo(prompt: string, aspect: Aspect, imageUrl?: string): Promise<string> {
  if (!XAI_API_KEY) throw new Error("XAI_API_KEY missing");
  const body: Record<string, unknown> = {
    model: "grok-imagine-video-1.5",
    prompt,
    duration: 5,
    aspect_ratio: aspect,
    resolution: "480p",
    generate_audio: false,
  };
  if (imageUrl) body.image = { url: imageUrl, type: "image_url" };
  const res = await fetch(`${XAI_BASE}/videos/generations`, {
    method: "POST",
    headers: { authorization: `Bearer ${XAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as { request_id?: string; error?: { message?: string } };
  if (!res.ok || !json.request_id) throw new Error(json.error?.message || `video ${res.status}`);
  return json.request_id;
}

async function pollVideo(requestId: string, ms = 12_000): Promise<string | null> {
  if (!XAI_API_KEY) return null;
  const start = Date.now();
  for (;;) {
    const res = await fetch(`${XAI_BASE}/videos/${requestId}`, {
      headers: { authorization: `Bearer ${XAI_API_KEY}` },
      signal: AbortSignal.timeout(8_000),
    });
    const json = (await res.json()) as { status?: string; video?: { url?: string } };
    if (json.status === "done" && json.video?.url) return json.video.url;
    if (json.status === "failed" || json.status === "expired") return null;
    if (Date.now() - start >= ms) return null;
    await new Promise((r) => setTimeout(r, 2500));
  }
}

async function writeBytes(buf: Buffer, ext: string): Promise<{ id: string; file: string }> {
  const pid = id();
  const file = `${pid}.${ext}`;
  fs.writeFileSync(promoPath(file), buf);
  return { id: pid, file };
}

async function persistRemote(url: string, ext: string): Promise<{ id: string; file: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error("download failed");
  const buf = Buffer.from(await res.arrayBuffer());
  return writeBytes(buf, ext);
}

function refUrl(brief: Brief) {
  if (brief.useFace) return FACE;
  if (brief.useHero) return HERO;
  return OG;
}

async function mintImage(brief: Brief): Promise<PromoItem> {
  let out: { b64?: string; url?: string; mime: string };
  try {
    out = await imagineImage(brief.prompt, brief.aspect, refUrl(brief));
  } catch {
    out = await imagineImage(brief.prompt, brief.aspect);
  }
  let stored: { id: string; file: string };
  let remoteUrl = out.url;
  if (out.b64) {
    stored = await writeBytes(Buffer.from(out.b64, "base64"), "jpg");
  } else if (out.url) {
    stored = await persistRemote(out.url, "jpg");
  } else {
    throw new Error("empty image");
  }
  return {
    id: stored.id,
    at: Date.now(),
    kind: "image",
    aspect: brief.aspect,
    headline: brief.headline,
    caption: brief.caption,
    pnlLabel: brief.pnlLabel,
    prompt: brief.prompt,
    mime: out.mime || "image/jpeg",
    file: stored.file,
    remoteUrl,
  };
}

function pushPromo(state: AppState, item: PromoItem) {
  if (!state.promos) state.promos = [];
  state.promos.push(item);
  prunePromos(state);
  pushBounded(state.audit, audit("admin", "promo", `${item.kind} ${item.aspect}`), 400);
}

export async function settlePendingPromo(waitMs = 12_000): Promise<boolean> {
  const pending = loadState().promoPending;
  if (!pending) return false;
  const url = await pollVideo(pending.requestId, waitMs);
  if (!url) {
    if (Date.now() - pending.at > 20 * 60 * 1000) {
      await mutateState((s) => {
        s.promoPending = null;
      });
    }
    return false;
  }
  const stored = await persistRemote(url, "mp4");
  await mutateState((s) => {
    pushPromo(s, {
      id: stored.id,
      at: Date.now(),
      kind: "video",
      aspect: pending.aspect,
      headline: pending.headline,
      caption: pending.caption,
      pnlLabel: pending.pnlLabel,
      prompt: pending.prompt,
      mime: "video/mp4",
      file: stored.file,
      remoteUrl: url,
    });
    s.promoPending = null;
  });
  return true;
}

export async function generatePromoPack(opts?: { force?: boolean; includeVideo?: boolean }): Promise<{ made: number; error?: string }> {
  if (!XAI_API_KEY) return { made: 0, error: "Set XAI_API_KEY to generate posts." };
  await settlePendingPromo().catch(() => false);
  const state = loadState();
  const day = utcDay();
  if (!opts?.force && state.lastPromoDay === day && (state.promos || []).some((p) => utcDay(p.at) === day)) {
    return { made: 0 };
  }
  const pack = briefs();
  const images = pack.filter((b) => b.kind === "image").slice(0, 3);
  const video = opts?.includeVideo === false ? null : pack.find((b) => b.kind === "video") || null;
  const results = await Promise.allSettled(images.map((b) => mintImage(b)));
  let made = 0;
  await mutateState((s) => {
    for (const r of results) {
      if (r.status === "fulfilled") {
        pushPromo(s, r.value);
        made += 1;
      }
    }
    if (made > 0) s.lastPromoDay = day;
  });
  if (video && !loadState().promoPending) {
    try {
      const requestId = await startVideo(video.prompt, video.aspect, FACE);
      const pending: PromoPending = {
        requestId,
        at: Date.now(),
        headline: video.headline,
        caption: video.caption,
        pnlLabel: video.pnlLabel,
        aspect: video.aspect,
        prompt: video.prompt,
      };
      await mutateState((s) => {
        s.promoPending = pending;
      });
    } catch {
      /* images still count */
    }
  }
  return { made };
}

export async function maybeGeneratePromos() {
  await settlePendingPromo().catch(() => false);
  const s = loadState();
  if (s.lastPromoDay === utcDay()) return { made: 0 };
  return generatePromoPack({ includeVideo: true });
}
