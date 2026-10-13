import { NextResponse } from "next/server";
import { issueChallenge, turnstileLive, turnstileSiteKey } from "@/lib/auth/challenge";

export const dynamic = "force-dynamic";

export async function GET() {
  const chal = issueChallenge();
  return NextResponse.json({
    token: chal.token,
    prompt: chal.prompt,
    turnstileSiteKey: turnstileLive() ? turnstileSiteKey() : null,
  });
}
