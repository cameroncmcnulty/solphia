import { NextRequest, NextResponse } from "next/server";
import { isSolanaAddress } from "@/lib/security";
import { loadState } from "@/lib/store";
import { isFounder } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey") || "";
  if (!isSolanaAddress(pubkey)) return NextResponse.json({ founder: false, plan: null });
  const s = loadState();
  const user = s.users.find((u) => u.pubkey === pubkey);
  const founder = isFounder(s, pubkey);
  return NextResponse.json({
    founder,
    plan: founder ? "full" : user?.plan || null,
    subscribedUntil: founder ? user?.subscribedUntil || Date.now() + 86400000 : user?.subscribedUntil || null,
  });
}
