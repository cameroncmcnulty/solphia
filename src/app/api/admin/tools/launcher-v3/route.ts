import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, withAdminSession } from "@/lib/admin/auth";
import { isSolanaAddress } from "@/lib/security";
import { draftProject, loadArchive, loadProject, patchSocials, publicProject } from "@/lib/tools/v3/project";
import {
  adminDeskShape,
  armCountdown,
  clearCountdown,
  launchFuel,
  refreshSnipers,
  sendLaunchSol,
  signLaunchTx,
  stopLaunch,
  tickV3,
} from "@/lib/tools/v3/launch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({
  action: z.enum(["draft", "socials", "arm", "clearCountdown", "tick", "stop", "send", "sign"]),
  idea: z.string().min(2).max(280).optional(),
  x: z.string().max(120).optional(),
  telegram: z.string().max(120).optional(),
  launchAt: z.number().optional(),
  dest: z.string().max(44).optional(),
  sol: z.number().positive().max(10_000).optional(),
  transaction: z.string().min(16).max(80_000).optional(),
});

async function desk() {
  const project = publicProject(await loadProject());
  const fuel = await launchFuel(project).catch(() => ({
    wallet: project.launchWallet,
    sol: 0,
    needSol: 0.2,
    enough: false,
    hot: false,
  }));
  let archive = await loadArchive().catch(() => []);
  return { ...adminDeskShape(project, fuel), archive, version: "v3" as const };
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await tickV3();
  } catch {
    /* desk still loads */
  }
  try {
    await refreshSnipers();
  } catch {
    /* desk still loads */
  }
  return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "draft") {
      const started = await draftProject(b.idea || "");
      if (!started.ok) {
        return NextResponse.json({ error: "draft_failed", message: started.error, ...(await desk()) }, { status: 400 });
      }
      return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
    }
    if (b.action === "socials") {
      await patchSocials({ x: b.x, telegram: b.telegram });
      return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
    }
    if (b.action === "arm") {
      const launchAt = Number(b.launchAt) || 0;
      const armed = await armCountdown(launchAt);
      if (!armed.ok) {
        return NextResponse.json({ error: "arm_failed", message: armed.error, ...(await desk()) }, { status: 400 });
      }
      return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
    }
    if (b.action === "clearCountdown") {
      await clearCountdown();
      return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
    }
    if (b.action === "tick") {
      await tickV3();
      return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
    }
    if (b.action === "stop") {
      const stopped = await stopLaunch();
      if (!stopped.ok) {
        return NextResponse.json({ error: "stop_failed", message: stopped.error, stopResult: stopped, ...(await desk()) }, { status: 400 });
      }
      return withAdminSession(NextResponse.json({ ok: true, stopResult: stopped, ...(await desk()) }));
    }
    if (b.action === "send") {
      const dest = (b.dest || "").trim();
      if (!isSolanaAddress(dest)) return NextResponse.json({ error: "bad_dest" }, { status: 400 });
      const sent = await sendLaunchSol(dest, b.sol);
      if (!sent.ok) {
        return NextResponse.json({ error: "send_failed", message: sent.error, sendResult: sent, ...(await desk()) }, { status: 400 });
      }
      return withAdminSession(NextResponse.json({ ok: true, sendResult: sent, ...(await desk()) }));
    }
    if (b.action === "sign") {
      const packed = (b.transaction || "").trim();
      if (packed.length < 16) return NextResponse.json({ error: "bad_tx", message: "Missing transaction." }, { status: 400 });
      const signed = await signLaunchTx(packed);
      if (!signed.ok || !signed.signature) {
        return NextResponse.json({ error: "sign_failed", message: signed.error, ...(await desk()) }, { status: 400 });
      }
      return withAdminSession(NextResponse.json({ ok: true, signature: signed.signature, ...(await desk()) }));
    }
    return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "V3 launcher failed.";
    return NextResponse.json({ error: "tools_failed", message }, { status: 400 });
  }
}
