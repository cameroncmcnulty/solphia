import { NextResponse } from "next/server";
import { copyDesk } from "@/lib/copy/desk";

export const dynamic = "force-dynamic";

export async function GET() {
  const desk = await copyDesk();
  return NextResponse.json(desk);
}
