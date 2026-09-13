import { NextResponse } from "next/server";
import { readyState } from "@/lib/store";
import { SOLPHIA_TOKEN, sphaMintOf } from "@/lib/token/solphia";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readyState();
  const socials = s.sphaSocials || {};
  return NextResponse.json({
    name: SOLPHIA_TOKEN.name,
    symbol: SOLPHIA_TOKEN.symbol,
    mint: sphaMintOf(s.sphaMint),
    socials: {
      x: socials.x || "",
      telegram: socials.telegram || "",
      discord: socials.discord || "",
    },
  });
}
