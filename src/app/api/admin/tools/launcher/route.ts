import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import {
  campaignFuel,
  campaignSummary,
  loadCampaign,
  pauseCampaign,
  publicCampaign,
  refreshSnipers,
  resetCampaign,
  resumeCampaign,
  startCampaign,
  stopCampaign,
  tickBatchLaunch,
} from "@/lib/tools/batchLaunch";
import {
  DEFAULT_NARRATIVE,
  DEFAULT_RANDOM,
  DEFAULT_WINDOW_MS,
} from "@/lib/tools/identities";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({
  action: z.enum(["start", "pause", "resume", "stop", "reset", "tick"]),
  narrative: z.number().int().min(0).max(400).optional(),
  random: z.number().int().min(0).max(400).optional(),
  windowHours: z.number().min(0.05).max(24).optional(),
});

async function desk() {
  const campaign = publicCampaign(await loadCampaign());
  const fuel = await campaignFuel(campaign);
  return { campaign, fuel, summary: campaignSummary(campaign) };
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await refreshSnipers(10);
  } catch {
    /* desk still loads */
  }
  return NextResponse.json({ ok: true, ...(await desk()) });
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
      return NextResponse.json({ ok: true, ...(await desk()) });
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
    return NextResponse.json({ ok: true, ...(await desk()) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tools launcher failed.";
    return NextResponse.json({ error: "tools_failed", message }, { status: 400 });
  }
}
