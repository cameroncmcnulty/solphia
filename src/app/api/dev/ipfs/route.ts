import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":ipfs", 8, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const form = await req.formData();
  const file = form.get("file");
  const name = String(form.get("name") || "").slice(0, 32);
  const symbol = String(form.get("symbol") || "").slice(0, 10);
  if (!name || !symbol) return NextResponse.json({ error: "name_symbol" }, { status: 400 });
  const body = new FormData();
  if (file instanceof File) body.append("file", file, file.name || "image.png");
  body.append("name", name);
  body.append("symbol", symbol);
  body.append("description", String(form.get("description") || "").slice(0, 500));
  body.append("twitter", String(form.get("twitter") || ""));
  body.append("telegram", String(form.get("telegram") || ""));
  body.append("website", String(form.get("website") || ""));
  body.append("showName", "true");
  const r = await fetch("https://pump.fun/api/ipfs", { method: "POST", body });
  const text = await r.text();
  if (!r.ok) return NextResponse.json({ error: text.slice(0, 200) || "ipfs_failed" }, { status: 400 });
  try {
    const j = JSON.parse(text) as { metadataUri?: string; metadata?: { image?: string } };
    return NextResponse.json({
      uri: j.metadataUri || j.metadata?.image,
      raw: j,
    });
  } catch {
    return NextResponse.json({ error: "bad_ipfs" }, { status: 400 });
  }
}
