import { NextResponse } from "next/server";
import { retiredAuthBody } from "@/lib/auth/retired";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(retiredAuthBody(), { status: 410 });
}

export async function POST() {
  return NextResponse.json(retiredAuthBody(), { status: 410 });
}
