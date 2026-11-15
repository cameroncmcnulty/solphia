import { XAI_API_KEY, XAI_BASE } from "../../config";
import { pinBytes, pinataConfigured } from "../../pinata";

export const IMAGINE_MODEL = "grok-imagine-image-2.0";

type ImagineImage = { url?: string; b64_json?: string };

async function imagineTry(opts: {
  prompt: string;
  aspect: "1:1" | "16:9";
}): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!XAI_API_KEY) return null;
  const r = await fetch(`${XAI_BASE}/images/generations`, {
    method: "POST",
    headers: { authorization: `Bearer ${XAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: IMAGINE_MODEL,
      prompt: opts.prompt,
      n: 1,
      aspect_ratio: opts.aspect,
      quality: "medium",
      resolution: "2k",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { data?: ImagineImage[] };
  const row = j.data?.[0];
  if (!row) return null;
  if (row.b64_json) {
    const bytes = Buffer.from(row.b64_json, "base64");
    if (bytes.length < 32) return null;
    return { bytes, mime: "image/png" };
  }
  const url = (row.url || "").trim();
  if (!url.startsWith("http")) return null;
  const img = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!img.ok) return null;
  const mime = (img.headers.get("content-type") || "image/png").split(";")[0].trim() || "image/png";
  const bytes = Buffer.from(await img.arrayBuffer());
  if (bytes.length < 32) return null;
  return { bytes, mime };
}

async function imagineOnce(opts: {
  prompt: string;
  aspect: "1:1" | "16:9";
}): Promise<{ bytes: Buffer; mime: string } | null> {
  const first = await imagineTry(opts).catch(() => null);
  if (first) return first;
  return imagineTry(opts).catch(() => null);
}

export async function pinImagine(opts: {
  prompt: string;
  aspect: "1:1" | "16:9";
  name: string;
}): Promise<{ url: string; cid?: string } | null> {
  const got = await imagineOnce({ prompt: opts.prompt, aspect: opts.aspect }).catch(() => null);
  if (!got) return null;
  if (pinataConfigured()) {
    const pinned = await pinBytes(got.bytes, got.mime, opts.name, { budgetMs: 24_000 }).catch(() => null);
    if (pinned?.url) return { url: pinned.url, cid: pinned.cid };
  }
  const mime = got.mime || "image/png";
  if (got.bytes.length > 900_000) return null;
  return { url: `data:${mime};base64,${got.bytes.toString("base64")}` };
}

export async function generateV3Art(opts: {
  artPrompt: string;
  heroPrompt: string;
  handle: string;
}): Promise<{ image: string; heroImage: string; artCid?: string; heroCid?: string }> {
  const [logo, hero] = await Promise.all([
    pinImagine({ prompt: opts.artPrompt, aspect: "1:1", name: `v3-${opts.handle}-art` }),
    pinImagine({ prompt: opts.heroPrompt, aspect: "16:9", name: `v3-${opts.handle}-hero` }),
  ]);
  return {
    image: logo?.url || "",
    heroImage: hero?.url || "",
    artCid: logo?.cid,
    heroCid: hero?.cid,
  };
}
