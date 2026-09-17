import { NextResponse } from "next/server";
import { publicBook } from "@/lib/tick";

export const dynamic = "force-dynamic";

/** Paper fills are off. The desk is live-only after a paid SOL seat. */
export async function GET() {
  return NextResponse.json({ error: "live_only", paper: publicBook(null) }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: "live_only" }, { status: 410 });
}
