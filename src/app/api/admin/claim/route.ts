import { NextRequest, NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { isSolanaAddress, clientIp } from "@/lib/security";
import { rpcUrl } from "@/lib/config";
import { treasuryAddress } from "@/lib/treasury";
import { ownerAddress } from "@/lib/ownerWallet";
import { planTreasuryWithdraw } from "@/lib/treasury/withdraw";
import { audit, mutateState, pushBounded, readyState } from "@/lib/store";
import { emptyLaunchBook } from "@/lib/launch/engine";
import { creditPartnerClaim } from "@/lib/fees/income";
import { FEE_DUST_LAMPORTS } from "@/lib/fees/payout";
import { dbcEnabled } from "@/lib/launch/dbcIds";
import { enrichProfitDesk } from "@/lib/profit/onchain";
import { buildProfitDesk } from "@/lib/profit/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Post = z.object({
  wallet: z.enum(["treasury", "owner"]),
  mint: z.string().optional(),
  mints: z.array(z.string()).optional(),
});

const Put = z.object({
  wallet: z.enum(["treasury", "owner"]),
  signature: z.string().min(32).max(128),
  claimSol: z.number().nonnegative().optional(),
});

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const state = await readyState();
  const profits = await enrichProfitDesk(buildProfitDesk(state), state);
  return NextResponse.json({
    ok: true,
    profits,
    claimable: profits.claimable,
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Post.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const treasury = treasuryAddress();
  const owner = ownerAddress();
  if (!isSolanaAddress(treasury) || !isSolanaAddress(owner)) {
    return NextResponse.json({ error: "need_wallets", message: "Set treasury and owner wallets first." }, { status: 400 });
  }
  const state = await readyState();
  if (parsed.data.wallet === "treasury") {
    return claimTreasury(parsed.data, treasury);
  }
  return claimOwner(treasury, owner, state.launch?.ownerEarningsSol || 0);
}

async function claimTreasury(
  body: { mint?: string; mints?: string[] },
  treasury: string,
) {
  if (!dbcEnabled()) {
    return NextResponse.json(
      { error: "empty", message: "No pad partner fees to pull. Jupiter referral fees claim at referral.jup.ag." },
      { status: 400 },
    );
  }
  const { buildDbcClaimPartnerBatch } = await import("@/lib/launch/dbc");
  const extra = (body.mints || []).filter((m) => isSolanaAddress(m));
  const mint = body.mint && isSolanaAddress(body.mint) ? body.mint : extra[0] || "";
  const mints = [mint, ...extra].filter((m) => isSolanaAddress(m));
  const built = await buildDbcClaimPartnerBatch({ mints, owner: treasury });
  if (!built.ok) {
    return NextResponse.json(
      {
        error: built.error || "empty",
        message:
          built.error === "empty"
            ? "No unclaimed pad partner fees. Open-market Jupiter fees sit in the referral account until you claim them at referral.jup.ag."
            : "Could not build the treasury claim.",
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    wallet: "treasury",
    needsSignature: true,
    from: treasury,
    transaction: built.transaction,
    claimSol: built.claimSol,
    claimMints: built.mints,
    remaining: built.remaining,
    remainingSol: built.remainingSol,
    remainingMints: built.remainingMints,
    message: "Connect the treasury Phantom to pull partner fees into treasury.",
  });
}

async function claimOwner(treasury: string, owner: string, ownerUnclaimed: number) {
  if (treasury === owner) {
    return NextResponse.json({ error: "same_wallet", message: "Owner and treasury are the same address." }, { status: 400 });
  }
  const sol = Math.max(0, Number(ownerUnclaimed) || 0);
  if (!(sol > 0) || Math.round(sol * LAMPORTS_PER_SOL) < FEE_DUST_LAMPORTS) {
    return NextResponse.json(
      {
        error: "empty",
        message: "No owner share ready. Claim treasury income first if pad fees are still sitting on-chain.",
      },
      { status: 400 },
    );
  }
  const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
  const balanceLamports = await conn.getBalance(new PublicKey(treasury));
  const plan = planTreasuryWithdraw(balanceLamports, "sol", sol);
  if (!plan.ok) {
    const message =
      plan.error === "empty"
        ? "Treasury is too low. Pull pad fees with Claim treasury first, and keep 0.002 SOL in treasury."
        : "Owner share is under 0.001 SOL.";
    return NextResponse.json({ error: plan.error, message }, { status: 400 });
  }
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(treasury),
      toPubkey: new PublicKey(owner),
      lamports: plan.lamports,
    }),
  );
  tx.feePayer = new PublicKey(treasury);
  tx.recentBlockhash = blockhash;
  const unsigned = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return NextResponse.json({
    ok: true,
    wallet: "owner",
    needsSignature: true,
    from: treasury,
    to: owner,
    transaction: Buffer.from(unsigned).toString("base64"),
    claimSol: plan.sol,
    message: "Connect the treasury Phantom to send the owner share.",
  });
}

export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Put.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const claimSol = Number(parsed.data.claimSol) || 0;
  await mutateState((s) => {
    if (!s.launch) s.launch = emptyLaunchBook();
    if (parsed.data.wallet === "treasury" && claimSol > 0) {
      creditPartnerClaim(s.launch, claimSol);
    }
    if (parsed.data.wallet === "owner") {
      const have = s.launch.ownerEarningsSol || 0;
      const paid = claimSol > 0 ? Math.min(have, claimSol) : have;
      s.launch.ownerEarningsSol = Math.max(0, have - paid);
    }
    pushBounded(
      s.audit,
      audit("admin", `claim_${parsed.data.wallet}`, `${claimSol.toFixed(4)} SOL ${parsed.data.signature.slice(0, 8)}`, clientIp(req)),
      400,
    );
  });
  return NextResponse.json({ ok: true });
}
