import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin/auth";
import { CRON_SECRET } from "@/lib/config";
import { projectExpectedPk, projectServerReady, saveProjectSecrets } from "@/lib/wallet/projectKeys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  treasury: z.string().optional(),
  owner: z.string().optional(),
  foundation: z.string().optional(),
});

function allowed(req: NextRequest): boolean {
  if (isAdminRequest(req)) return true;
  const auth = req.headers.get("authorization") || "";
  const q = req.nextUrl.searchParams.get("secret") || "";
  return Boolean(CRON_SECRET && (auth === `Bearer ${CRON_SECRET}` || q === CRON_SECRET));
}

export async function GET(req: NextRequest) {
  if (!allowed(req)) return NextResponse.json({ error: "denied" }, { status: 401 });
  const ready = await projectServerReady();
  return NextResponse.json({
    ok: true,
    ready,
    pubkeys: {
      treasury: projectExpectedPk("treasury"),
      owner: projectExpectedPk("owner"),
      foundation: projectExpectedPk("foundation"),
    },
  });
}

export async function POST(req: NextRequest) {
  if (!allowed(req)) return NextResponse.json({ error: "denied" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const out = await saveProjectSecrets(parsed.data);
  if (!out.ok) return NextResponse.json({ error: "bad_key", message: out.error }, { status: 400 });
  return NextResponse.json({ ok: true, ready: out.ready });
}
