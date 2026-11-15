import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, withAdminSession } from "@/lib/admin/auth";
import {
  archiveCampaign,
  campaignFuel,
  campaignSummary,
  loadCampaign,
  loadLaunchArchive,
  listOldWallets,
  pauseCampaign,
  publicCampaign,
  reclaimOldWalletsToTreasury,
  refreshSnipers,
  resetCampaign,
  resumeCampaign,
  startCampaign,
  stopCampaign,
  tickBatchLaunch,
} from "@/lib/tools/batchLaunch";
import { extractLaunchedWalletsToOwner, previewProtocolSweep, sweepProtocolToOwner } from "@/lib/tools/protocolSweep";
import {
  DEFAULT_NARRATIVE,
  DEFAULT_RANDOM,
  DEFAULT_WINDOW_MS,
} from "@/lib/tools/identities";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({
  action: z.enum(["start", "pause", "resume", "stop", "reset", "tick", "sweepProtocol", "extractAll", "extractLaunched", "reclaimOldWallets"]),
  narrative: z.number().int().min(0).max(400).optional(),
  random: z.number().int().min(0).max(400).optional(),
  total: z.number().int().min(1).max(400).optional(),
  narrativePct: z.number().min(0).max(100).optional(),
  windowHours: z.number().min(0.05).max(24).optional(),
  windowMinutes: z.number().min(1).max(1440).optional(),
});

async function desk() {
  const campaign = publicCampaign(await loadCampaign());
  let archive = await loadLaunchArchive().catch(() => []);
  try {
    archive = await archiveCampaign(campaign);
  } catch {
    /* persisted archive still loads */
  }
  const fuel = await campaignFuel(campaign);
  const sweep = await previewProtocolSweep().catch(() => null);
  const oldWallets = await listOldWallets().catch(() => ({
    count: 0,
    reclaimable: 0,
    incinerator: "https://sol-incinerator.com/tools",
    rows: [],
  }));
  return { campaign, fuel, summary: campaignSummary(campaign), sweep, archive, oldWallets };
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await refreshSnipers(16);
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
    if (b.action === "start") {
      const started = await startCampaign({
        narrative: b.narrative ?? DEFAULT_NARRATIVE,
        random: b.random ?? DEFAULT_RANDOM,
        windowMs: Math.round((b.windowHours ?? DEFAULT_WINDOW_MS / 3_600_000) * 3_600_000),
      });
      if (!started.ok) {
        return NextResponse.json({ error: "start_failed", message: started.error, fuel: started.fuel }, { status: 400 });
      }
      try {
        await tickBatchLaunch({ limit: 1 });
      } catch {
        /* cron continues the rest */
      }
      return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
    }
    if (b.action === "pause") await pauseCampaign();
    else if (b.action === "resume") {
      await resumeCampaign();
      try {
        await tickBatchLaunch({ limit: 1 });
      } catch {
        /* cron continues */
      }
    } else if (b.action === "stop") await stopCampaign();
    else if (b.action === "reset") await resetCampaign();
    else if (b.action === "tick") await tickBatchLaunch({ limit: 1 });
    else if (b.action === "extractAll" || b.action === "extractLaunched") {
      const result = await extractLaunchedWalletsToOwner();
      if (!result.ok) {
        return NextResponse.json(
          { error: "sweep_failed", message: result.error, sweepResult: result, ...(await desk()) },
          { status: 400 },
        );
      }
      return withAdminSession(NextResponse.json({ ok: true, sweepResult: result, ...(await desk()) }));
    } else if (b.action === "reclaimOldWallets") {
      const result = await reclaimOldWalletsToTreasury({ limit: 20 });
      if (!result.ok) {
        return NextResponse.json(
          { error: "reclaim_failed", message: result.error, reclaimResult: result, ...(await desk()) },
          { status: 400 },
        );
      }
      return withAdminSession(NextResponse.json({ ok: true, reclaimResult: result, ...(await desk()) }));
    } else if (b.action === "sweepProtocol") {
      const result = await sweepProtocolToOwner({ extractAll: true });
      if (!result.ok) {
        return NextResponse.json(
          { error: "sweep_failed", message: result.error, sweepResult: result, ...(await desk()) },
          { status: 400 },
        );
      }
      return withAdminSession(NextResponse.json({ ok: true, sweepResult: result, ...(await desk()) }));
    }
    return withAdminSession(NextResponse.json({ ok: true, ...(await desk()) }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tools launcher failed.";
    return NextResponse.json({ error: "tools_failed", message }, { status: 400 });
  }
}
