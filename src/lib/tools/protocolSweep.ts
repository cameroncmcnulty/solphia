import { ComputeBudgetProgram, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { isSolanaAddress } from "../security";
import { connection, waitForSignature } from "../solana/connection";
import { bytesToB64 } from "../solana/wire";
import { broadcastB64 } from "../solana/broadcast";
import { harvestKeypair } from "../treasury/withdraw";
import { TREASURY_KEEP_LAMPORTS } from "../treasury/plan";
import { treasuryAddress } from "../treasury";
import { ownerAddress } from "../ownerWallet";
import { loadProjectServerKeypair } from "../wallet/projectKeys";
import { readyState } from "../store";
import { peekPlatformOnchain } from "../admin/onchain";
import { BATCH_RELAY_LAMPORTS } from "./identities";
import { loadCampaign } from "./batchLaunch";

export type SweepLeg = {
  role: string;
  from: string;
  sol: number;
  keepSol: number;
  sendSol: number;
  hot: boolean;
  skip?: string;
};

export type SweepPreview = {
  owner: string;
  userWalletSol: number;
  protocolSol: number;
  padTvlSol: number;
  movableSol: number;
  keepRelaySol: number;
  legs: SweepLeg[];
  note: string;
};

const TX_FEE = 15_000;

function keepFor(role: string, relayReserved: boolean): number {
  if (role === "treasury" && relayReserved) return TREASURY_KEEP_LAMPORTS + BATCH_RELAY_LAMPORTS;
  return TREASURY_KEEP_LAMPORTS;
}

async function signerFor(role: string): Promise<Keypair | null> {
  if (role === "treasury") return harvestKeypair() || (await loadProjectServerKeypair("treasury"));
  if (role === "owner") return await loadProjectServerKeypair("owner");
  if (role === "foundation") return await loadProjectServerKeypair("foundation");
  return null;
}

export async function previewProtocolSweep(): Promise<SweepPreview> {
  const s = await readyState();
  const owner = ownerAddress();
  const campaign = await loadCampaign().catch(() => null);
  const relayReserved = Boolean(campaign && !campaign.relayFunded && campaign.status !== "done");
  const sources: { role: string; pk: string }[] = [
    { role: "treasury", pk: treasuryAddress() },
    { role: "foundation", pk: (s.foundationWallet || "").trim() },
    { role: "airdrop", pk: (s.airdropWallet || "").trim() },
    { role: "dev", pk: (s.devWallet || "").trim() },
    { role: "lp", pk: (s.lpWallet || "").trim() },
  ];
  const conn = connection();
  const legs: SweepLeg[] = [];
  for (const src of sources) {
    if (!src.pk || !isSolanaAddress(src.pk)) continue;
    if (src.pk === owner) {
      legs.push({ role: src.role, from: src.pk, sol: 0, keepSol: 0, sendSol: 0, hot: false, skip: "already_owner" });
      continue;
    }
    const roleKey = src.role === "airdrop" ? "foundation" : src.role === "dev" || src.role === "lp" ? "owner" : src.role;
    const kp = await signerFor(roleKey);
    const hot = Boolean(kp && kp.publicKey.toBase58() === src.pk);
    let lamports = 0;
    try {
      lamports = await conn.getBalance(new PublicKey(src.pk), "confirmed");
    } catch {
      lamports = 0;
    }
    const keep = keepFor(src.role, relayReserved);
    const send = Math.max(0, lamports - keep - TX_FEE);
    let skip: string | undefined;
    if (!hot) skip = "no_hot_key";
    else if (send < 1_000_000) skip = "dust";
    legs.push({
      role: src.role,
      from: src.pk,
      sol: lamports / LAMPORTS_PER_SOL,
      keepSol: keep / LAMPORTS_PER_SOL,
      sendSol: skip ? 0 : send / LAMPORTS_PER_SOL,
      hot,
      skip,
    });
  }
  const movableSol = legs.reduce((n, l) => n + l.sendSol, 0);
  const onchain = peekPlatformOnchain();
  let padTvlSol = 0;
  for (const coin of s.launch?.coins || []) padTvlSol += Number(coin.curve?.realSol) || 0;
  return {
    owner,
    userWalletSol: Number(onchain?.userSol) || 0,
    protocolSol: legs.reduce((n, l) => n + l.sol, 0),
    padTvlSol,
    movableSol,
    keepRelaySol: relayReserved ? BATCH_RELAY_LAMPORTS / LAMPORTS_PER_SOL : 0,
    legs,
    note: "User wallets and bonding-curve TVL stay put. Only protocol wallets with a hot key move to owner.",
  };
}

export async function sweepProtocolToOwner(): Promise<{
  ok: boolean;
  movedSol: number;
  signatures: string[];
  preview: SweepPreview;
  error?: string;
}> {
  const preview = await previewProtocolSweep();
  if (!isSolanaAddress(preview.owner)) {
    return { ok: false, movedSol: 0, signatures: [], preview, error: "Set the owner wallet first." };
  }
  const conn = connection();
  const to = new PublicKey(preview.owner);
  const signatures: string[] = [];
  let moved = 0;
  for (const leg of preview.legs) {
    if (leg.skip || !(leg.sendSol > 0)) continue;
    const roleKey = leg.role === "airdrop" ? "foundation" : leg.role === "dev" || leg.role === "lp" ? "owner" : leg.role;
    const kp = await signerFor(roleKey);
    if (!kp || kp.publicKey.toBase58() !== leg.from) continue;
    const lamports = Math.floor(leg.sendSol * LAMPORTS_PER_SOL);
    if (lamports < 1_000_000) continue;
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
      SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: to, lamports }),
    );
    tx.feePayer = kp.publicKey;
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.sign(kp);
    const sig = await broadcastB64(bytesToB64(tx.serialize()), { skipPreflight: false });
    await waitForSignature(sig, 20);
    signatures.push(sig);
    moved += leg.sendSol;
  }
  return { ok: true, movedSol: moved, signatures, preview: await previewProtocolSweep() };
}
