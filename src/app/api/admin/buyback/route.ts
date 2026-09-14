import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { isSolanaAddress, clientIp } from "@/lib/security";
import { audit, mutateState, pushBounded } from "@/lib/store";
import { runBuybackBurn } from "@/lib/token/buyback";
import { sphaMintOf } from "@/lib/token/solphia";
import { readyState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  mint: z.string().optional(),
  sol: z.number().positive().max(50),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = await readyState();
  return NextResponse.json({
    ok: true,
    defaultMint: sphaMintOf(s.sphaMint),
    last: s.buybacks?.[s.buybacks.length - 1] || null,
    runs: (s.buybacks || []).slice(-12).reverse(),
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const s = await readyState();
  const mint = (parsed.data.mint || sphaMintOf(s.sphaMint) || "").trim();
  if (!isSolanaAddress(mint)) {
    return NextResponse.json({ error: "bad_mint", message: "Set a CA to buy back and burn." }, { status: 400 });
  }
  const out = await runBuybackBurn({ mint, sol: parsed.data.sol });
  if (!out.ok) return NextResponse.json({ error: out.error, message: out.message }, { status: 400 });
  await mutateState((st) => {
    if (!st.buybacks) st.buybacks = [];
    st.buybacks.push({
      at: Date.now(),
      mint: out.mint,
      sol: parsed.data.sol,
      tokens: out.tokens,
      swapSig: out.swapSig,
      burnSig: out.burnSig,
      feeSol: out.feeSol,
    });
    if (st.buybacks.length > 40) st.buybacks.splice(0, st.buybacks.length - 40);
    pushBounded(st.audit, audit("admin", "buyback", `${parsed.data.sol} SOL → ${out.mint}`, clientIp(req)), 400);
  });
  return NextResponse.json({
    ok: true,
    mint: out.mint,
    tokens: out.tokens,
    swapSig: out.swapSig,
    burnSig: out.burnSig,
    feeSol: out.feeSol,
  });
}
