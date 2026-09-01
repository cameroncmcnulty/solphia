import { NextRequest, NextResponse } from "next/server";
import { loadState } from "@/lib/store";
import { clientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":alerts", 40, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const state = loadState();
  return NextResponse.json({ alerts: state.alerts.slice(-80).reverse() });
}
