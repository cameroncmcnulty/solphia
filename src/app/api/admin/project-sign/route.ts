import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { extrasFromSecrets, signPackedB64 } from "@/lib/solana/extraSign";
import { broadcastB64 } from "@/lib/solana/broadcast";
import { loadProjectServerKeypair, projectExpectedPk, projectServerReady, type ProjectSignRole } from "@/lib/wallet/projectKeys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

const Body = z.object({
  role: z.enum(["treasury", "owner", "foundation"]),
  transaction: z.string().min(16).max(80_000),
  extraSecrets: z.array(z.string()).max(8).optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
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
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", message: "Missing transaction." }, { status: 400 });
  }
  const role = parsed.data.role as ProjectSignRole;
  const kp = await loadProjectServerKeypair(role);
  if (!kp) {
    return NextResponse.json(
      { error: "no_signer", message: `No ${role} project key on the server.` },
      { status: 400 },
    );
  }
  try {
    const extra = extrasFromSecrets(parsed.data.extraSecrets);
    const signed = signPackedB64(parsed.data.transaction, [kp, ...extra]);
    const signature = await broadcastB64(signed, { skipPreflight: false });
    return NextResponse.json({ ok: true, signature });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sign failed";
    return NextResponse.json({ error: "sign_failed", message }, { status: 400 });
  }
}
