import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, withAdminSession } from "@/lib/admin/auth";
import { ipfsMetadataUrl, pinBytes, pinataConfigured } from "@/lib/pinata";
import { loadProject, patchBrand, publicProject } from "@/lib/tools/v3/project";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

function isUpload(v: FormDataEntryValue | null): v is File {
  return Boolean(v) && typeof v === "object" && typeof (v as File).arrayBuffer === "function" && typeof (v as File).size === "number";
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const p = await loadProject();
  if (!p.id || p.status === "deleted") {
    return NextResponse.json({ error: "no_project", message: "Open a site dashboard first." }, { status: 400 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const file = form.get("file");
  if (!isUpload(file) || file.size < 32 || file.size > 900_000) {
    return NextResponse.json({ error: "bad_image", message: "Use a JPEG or PNG under 900 KB." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = ((file.type || "image/png").split(";")[0] || "image/png").trim();
  let image = "";
  if (pinataConfigured()) {
    const pinned = await pinBytes(buf, mime, `v3-${p.handle}-logo`, { budgetMs: 24_000 }).catch(() => null);
    if (pinned?.url) image = pinned.url;
    else if (pinned?.cid) image = ipfsMetadataUrl(pinned.cid, mime.includes("png") ? "png" : "jpg");
  }
  if (!image) {
    if (buf.length > 900_000) {
      return NextResponse.json({ error: "pin_image", message: "Could not pin the logo." }, { status: 400 });
    }
    image = `data:${mime};base64,${buf.toString("base64")}`;
  }
  const patched = await patchBrand({ image });
  if (!patched.ok) {
    return NextResponse.json({ error: patched.error, message: patched.error }, { status: 400 });
  }
  return withAdminSession(NextResponse.json({ ok: true, image: patched.project.image, project: publicProject(patched.project) }));
}
