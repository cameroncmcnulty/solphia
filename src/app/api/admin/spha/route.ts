import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { isSolanaAddress, clientIp } from "@/lib/security";
import { rpcUrl } from "@/lib/config";
import { treasuryAddress } from "@/lib/treasury";
import { audit, mutateState, pushBounded, readyState } from "@/lib/store";
import {
  SPHA_DECIMALS,
  SPHA_NAME,
  SPHA_SUPPLY,
  SPHA_SYMBOL,
  sphaAllocations,
  sphaMissingDest,
  type SphaNetwork,
} from "@/lib/token/omics";
import { sphaRpc } from "@/lib/token/mint";

export const dynamic = "force-dynamic";

function destOf(s: Awaited<ReturnType<typeof readyState>>) {
  return {
    owner: s.devWallet || s.ownerWallet || "",
    foundation: s.foundationWallet || "",
    airdrop: s.airdropWallet || s.foundationWallet || "",
    treasury: s.treasuryWallet || treasuryAddress(),
    lp: s.lpWallet || "",
  };
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = await readyState();
  const dest = destOf(s);
  const network: SphaNetwork = s.sphaNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";
  return NextResponse.json({
    ok: true,
    network,
    rpc: sphaRpc(network, rpcUrl()),
    name: SPHA_NAME,
    symbol: SPHA_SYMBOL,
    supply: SPHA_SUPPLY,
    decimals: SPHA_DECIMALS,
    dest,
    missing: sphaMissingDest(dest),
    allocations: sphaAllocations(dest),
    launch: s.sphaLaunch || null,
  });
}

const Recorded = z.object({
  mint: z.string(),
  network: z.enum(["devnet", "mainnet-beta"]),
  name: z.string().max(32),
  symbol: z.string().max(12),
  supply: z.number().int().positive(),
  sigs: z.array(z.string().min(32).max(128)).min(1).max(8),
  allocations: z.array(z.object({ id: z.string(), wallet: z.string(), tokens: z.number() })),
  image: z.string().max(400).optional(),
  blurb: z.string().max(280).optional(),
  uri: z.string().max(400).optional(),
  website: z.string().max(160).optional(),
});

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Recorded.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = parsed.data;
  if (!isSolanaAddress(b.mint)) return NextResponse.json({ error: "bad_mint" }, { status: 400 });
  await mutateState((s) => {
    s.sphaMint = b.mint;
    s.sphaNetwork = b.network;
    s.sphaLaunch = {
      mint: b.mint,
      network: b.network,
      name: b.name,
      symbol: b.symbol,
      supply: b.supply,
      launchedAt: Date.now(),
      sigs: b.sigs,
      allocations: b.allocations,
      image: b.image,
      blurb: b.blurb,
      uri: b.uri,
      website: b.website,
    };
    pushBounded(s.audit, audit("admin", "spha_launch", `${b.network} ${b.mint}`, clientIp(req)), 400);
  });
  return NextResponse.json({ ok: true, mint: b.mint });
}
