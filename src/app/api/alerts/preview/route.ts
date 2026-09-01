import { NextResponse } from "next/server";
import { alertEmailHtml } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  const html = alertEmailHtml({
    id: "preview",
    at: Date.now(),
    kind: "migration",
    title: "MIGRATION PEPECAT",
    body: "Organic curve 91% · safety 81 · Solphia would paper-buy $42 from the $1,000 book.",
    mint: "CRAMvzDsSpXYsFpcoDr6vFLJMBeftez1E7277xwPpump",
    score: 81,
    strategy: "migration_snipe",
  });
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
