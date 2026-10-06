import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Email signup goes through a one-time code. Keep this path so old clients fail clearly. */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "verify_email", message: "Enter the one-time code we email you to create the account." },
    { status: 400 },
  );
}
