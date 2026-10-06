import { NextResponse } from "next/server";
import { issueChallenge, turnstileSiteKey } from "@/lib/auth/challenge";

export const dynamic = "force-dynamic";

export async function GET() {
  const chal = issueChallenge();
  return NextResponse.json({
    token: chal.token,
    prompt: chal.prompt,
    turnstileSiteKey: turnstileSiteKey() || null,
  });
}
