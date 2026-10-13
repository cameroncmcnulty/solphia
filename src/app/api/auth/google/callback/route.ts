import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { retiredAuthBody } from "@/lib/auth/retired";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = SITE_URL.replace(/\/$/, "") || new URL(req.url).origin;
  const url = new URL("/", base);
  url.searchParams.set("auth_error", "wallet");
  return NextResponse.redirect(url);
}

export async function POST() {
  return NextResponse.json(retiredAuthBody(), { status: 410 });
}
