import { NextRequest, NextResponse } from "next/server";
import { findProjectByHandle, publicSitePack } from "@/lib/tools/v3/project";
import { v3HandleOf } from "@/lib/tools/v3/host";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await ctx.params;
  const handle = v3HandleOf(ticker);
  const p = await findProjectByHandle(handle);
  if (!p?.id) {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...publicSitePack(p) });
}
