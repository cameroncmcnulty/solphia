import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security";
import { runMarketTick } from "@/lib/tick";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":tick", 12, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const tick = await runMarketTick();
  return NextResponse.json(tick);
}
