import { NextRequest, NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { isSolanaAddress, clientIp } from "@/lib/security";
import { rpcUrl } from "@/lib/config";
import { treasuryAddress } from "@/lib/treasury";
import { planTreasuryWithdraw, treasuryHot, treasuryKeypair } from "@/lib/treasury/withdraw";
import { audit, loadAllTraders, mutateState, pushBounded, readyState } from "@/lib/store";
import { lastPairPrices } from "@/lib/tick";
import { sphaMintOf } from "@/lib/token/solphia";
import { sendSignedTx } from "@/lib/tx/send";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Withdraw = z.object({
  kind: z.enum(["pct", "sol"]),
  value: z.number().positive().max(1_000_000),
  send: z.boolean().optional(),
});

async function solBalances(pks: string[]): Promise<Record<string, number>> {
  const uniq = [...new Set(pks.filter((p) => isSolanaAddress(p)))];
  const out: Record<string, number> = {};
  if (!uniq.length) return out;
  const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
  const infos = await conn.getMultipleAccountsInfo(uniq.map((p) => new PublicKey(p)));
  uniq.forEach((pk, i) => {
    out[pk] = (infos[i]?.lamports || 0) / LAMPORTS_PER_SOL;
  });
  return out;
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const state = await readyState();
  await loadAllTraders(state);
  const treasury = treasuryAddress();
  const owner = state.ownerWallet || state.launch?.ownerWallet || "";
  const dev = state.devWallet || "";
  const mint = sphaMintOf(state.sphaMint);
  const admins = state.adminWallets || [];
  const traders = Object.values(state.traders || {})
    .map((t) => ({
      owner: t.owner,
      tradingPubkey: t.tradingPubkey || t.auto?.tradingPubkey || "",
      mode: t.auto?.mode || "paper",
      killed: Boolean(t.book?.killed),
    }))
    .filter((t) => t.tradingPubkey)
    .slice(0, 40);
  const foundation = state.foundationWallet || "";
  const airdrop = state.airdropWallet || foundation;
  const lp = state.lpWallet || "";
  const keys = [treasury, owner, dev, foundation, airdrop, lp, ...admins, ...traders.map((t) => t.tradingPubkey)];
  const bal = await solBalances(keys);
  const solUsd = lastPairPrices().solUsd || 0;
  let tokens = 0;
  let decimals = 9;
  if (dev && mint && isSolanaAddress(dev) && isSolanaAddress(mint)) {
    try {
      const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
      const rows = await conn.getParsedTokenAccountsByOwner(new PublicKey(dev), { mint: new PublicKey(mint) });
      for (const row of rows.value) {
        const info = row.account.data.parsed?.info?.tokenAmount;
        if (!info) continue;
        decimals = Number(info.decimals) || decimals;
        tokens += Number(info.uiAmount) || 0;
      }
    } catch {
      tokens = 0;
    }
  }
  return NextResponse.json({
    ok: true,
    solUsd,
    hot: treasuryHot(),
    treasury: { pk: treasury, sol: bal[treasury] || 0 },
    owner: { pk: owner, sol: owner ? bal[owner] || 0 : 0 },
    dev: { pk: dev, sol: dev ? bal[dev] || 0 : 0, tokens, mint, decimals },
    foundation: { pk: foundation, sol: foundation ? bal[foundation] || 0 : 0 },
    airdrop: { pk: airdrop, sol: airdrop ? bal[airdrop] || 0 : 0 },
    lp: { pk: lp, sol: lp ? bal[lp] || 0 : 0 },
    admins: admins.map((pk) => ({ pk, sol: bal[pk] || 0 })),
    traders: traders.map((t) => ({ ...t, sol: bal[t.tradingPubkey] || 0 })),
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = Withdraw.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const state = await readyState();
  const from = treasuryAddress();
  const to = state.ownerWallet || state.launch?.ownerWallet || "";
  if (!isSolanaAddress(from) || !isSolanaAddress(to)) {
    return NextResponse.json({ error: "need_wallets", message: "Set treasury and owner wallets first." }, { status: 400 });
  }
  if (from === to) {
    return NextResponse.json({ error: "same_wallet", message: "Owner and treasury are the same address." }, { status: 400 });
  }
  const conn = new Connection(rpcUrl(), { commitment: "confirmed" });
  const balanceLamports = await conn.getBalance(new PublicKey(from));
  const plan = planTreasuryWithdraw(balanceLamports, parsed.data.kind, parsed.data.value);
  if (!plan.ok) {
    const message =
      plan.error === "empty"
        ? "Treasury is too low to withdraw. Keep 0.002 SOL in it."
        : plan.error === "dust"
          ? "That amount is under 0.001 SOL."
          : "Enter a percent (1–100) or a SOL amount.";
    return NextResponse.json({ error: plan.error, message }, { status: 400 });
  }
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(from),
      toPubkey: new PublicKey(to),
      lamports: plan.lamports,
    }),
  );
  tx.feePayer = new PublicKey(from);
  tx.recentBlockhash = blockhash;
  const preview = {
    ok: true,
    from,
    to,
    sol: plan.sol,
    remainingSol: plan.remainingSol,
    hot: treasuryHot(),
  };
  if (!parsed.data.send) {
    const unsigned = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    return NextResponse.json({
      ...preview,
      transaction: Buffer.from(unsigned).toString("base64"),
    });
  }
  const kp = treasuryKeypair();
  if (kp) {
    tx.sign(kp);
    const sent = await sendSignedTx(tx, { conn });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 400 });
    const sig = sent.signature;
    await mutateState((s) => {
      pushBounded(s.audit, audit("admin", "treasury_withdraw", `${plan.sol.toFixed(4)} SOL → ${to} ${sig.slice(0, 8)}`, clientIp(req)), 400);
    });
    return NextResponse.json({ ...preview, signature: sig });
  }
  const unsigned = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return NextResponse.json({
    ...preview,
    needsSignature: true,
    transaction: Buffer.from(unsigned).toString("base64"),
    message: "Connect the treasury Phantom to sign, or set TREASURY_SECRET on the server.",
  });
}

export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = z.object({ signature: z.string().min(32).max(128) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const state = await readyState();
  const to = state.ownerWallet || state.launch?.ownerWallet || "";
  await mutateState((s) => {
    pushBounded(
      s.audit,
      audit("admin", "treasury_withdraw", `signed ${body.data.signature.slice(0, 8)} → ${to || "owner"}`, clientIp(req)),
      400,
    );
  });
  return NextResponse.json({ ok: true });
}
