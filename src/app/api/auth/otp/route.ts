import { NextResponse } from "next/server";
import { retiredAuthBody } from "@/lib/auth/retired";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(retiredAuthBody(), { status: 410 });
}
