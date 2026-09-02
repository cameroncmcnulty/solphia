import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isSolanaAddress, rateLimit } from "@/lib/security";
import { loadState, mutateState } from "@/lib/store";
import { heliusEnabled, connection } from "@/lib/solana/connection";
import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = loadState();
  return NextResponse.json({
    watch: s.watchWallets,
    helius: heliusEnabled(),
    note: heliusEnabled()
      ? "Helius connected — signature history and funding-graph rug clock are on."
      : "Testing stage: add wallets now. Live copy-stream waits for Helius.",
  });
}

const Body = z.object({ pubkey: z.string() });

export async function POST(req: NextRequest) {
  if (!rateLimit(clientIp(req) + ":wallets", 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isSolanaAddress(parsed.data.pubkey)) {
    return NextResponse.json({ error: "bad_pubkey" }, { status: 400 });
  }
  await mutateState((s) => {
    if (!s.watchWallets.includes(parsed.data.pubkey)) s.watchWallets.push(parsed.data.pubkey);
  });
  let recent: { signature: string; slot: number; err: unknown }[] = [];
  if (heliusEnabled()) {
    try {
      const sigs = await connection().getSignaturesForAddress(new PublicKey(parsed.data.pubkey), { limit: 8 });
      recent = sigs.map((x) => ({ signature: x.signature, slot: x.slot, err: x.err }));
    } catch {
      recent = [];
    }
  }
  return NextResponse.json({ ok: true, watch: loadState().watchWallets, recent });
}
