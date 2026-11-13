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
import { userWalletsOf } from "../admin/platform";
import { LIVE_SIGNER_SECRET } from "../config";
import { feeVaultKeypair } from "../fees/vault";
import { listDelegatedSigners } from "../live/signer";
import { BATCH_RELAY_LAMPORTS } from "./identities";
import { listCampaignSigners, loadCampaign } from "./batchLaunch";

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
  launchSol: number;
  liveSol: number;
  vaultSol: number;
  liveCount: number;
  vaultCount: number;
  movableSol: number;
  keepRelaySol: number;
  lockedSol: number;
  campaignRunning: boolean;
  remainingSends: number;
  legs: SweepLeg[];
  note: string;
};

const TX_FEE = 15_000;
const CHUNK = 100;
const MAX_SENDS = 80;

async function signerFor(role: string): Promise<Keypair | null> {
  if (role === "treasury") return harvestKeypair() || (await loadProjectServerKeypair("treasury"));
  if (role === "owner") return await loadProjectServerKeypair("owner");
  if (role === "foundation") return await loadProjectServerKeypair("foundation");
  return null;
}

async function balancesOf(pks: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const uniq = [...new Set(pks.filter((p) => isSolanaAddress(p)))];
  if (!uniq.length) return map;
  const conn = connection();
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const chunk = uniq.slice(i, i + CHUNK);
    try {
      const infos = await conn.getMultipleAccountsInfo(
        chunk.map((p) => new PublicKey(p)),
        "confirmed",
      );
      infos.forEach((info, j) => map.set(chunk[j]!, info?.lamports || 0));
    } catch {
      for (const pk of chunk) map.set(pk, 0);
    }
  }
  return map;
}

async function sendLamports(from: Keypair, to: PublicKey, lamports: number): Promise<string> {
  const conn = connection();
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to, lamports }),
  );
  tx.feePayer = from.publicKey;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.sign(from);
  const sig = await broadcastB64(bytesToB64(tx.serialize()), { skipPreflight: false });
  await waitForSignature(sig, 20);
  return sig;
}

type Packed = { role: string; pk: string; kp: Keypair | null };

const GROUP_ROLES = new Set(["tools-launch", "live-trading", "fee-vault"]);

async function packSources(): Promise<Packed[]> {
  const s = await readyState();
  const owner = ownerAddress();
  const seen = new Set<string>();
  const out: Packed[] = [];
  const push = (row: Packed) => {
    if (!row.pk || !isSolanaAddress(row.pk) || seen.has(row.pk)) return;
    seen.add(row.pk);
    out.push(row);
  };
  const rows: { role: string; pk: string; signRole: string }[] = [
    { role: "treasury", pk: treasuryAddress(), signRole: "treasury" },
    { role: "foundation", pk: (s.foundationWallet || "").trim(), signRole: "foundation" },
    { role: "airdrop", pk: (s.airdropWallet || "").trim(), signRole: "foundation" },
    { role: "dev", pk: (s.devWallet || "").trim(), signRole: "owner" },
    { role: "lp", pk: (s.lpWallet || "").trim(), signRole: "owner" },
  ];
  for (const row of rows) {
    if (!row.pk || !isSolanaAddress(row.pk)) continue;
    const kp = await signerFor(row.signRole);
    push({ role: row.role, pk: row.pk, kp: kp && kp.publicKey.toBase58() === row.pk ? kp : null });
  }
  const launches = await listCampaignSigners().catch(() => [] as { pk: string; kp: Keypair }[]);
  for (const w of launches) push({ role: "tools-launch", pk: w.pk, kp: w.kp });

  const users = userWalletsOf(s).slice(0, 400);
  const extraOwners = Object.values(s.traders || {})
    .filter((t) => t.auto?.liveDelegate || t.tradingPubkey)
    .map((t) => t.owner);
  const delegated = await listDelegatedSigners(extraOwners).catch(() => []);
  for (const d of delegated) {
    if (d.pubkey === owner) continue;
    push({ role: "live-trading", pk: d.pubkey, kp: d.kp });
  }

  const vaultSeed = (process.env.FEE_VAULT_SECRET || process.env.LIVE_SIGNER_SECRET || LIVE_SIGNER_SECRET || "").trim();
  if (vaultSeed) {
    const vaultOwners = new Set<string>([
      owner,
      treasuryAddress(),
      (s.foundationWallet || "").trim(),
      ...users,
      ...extraOwners,
      ...Object.values(s.traders || {}).map((t) => t.owner),
    ]);
    for (const pk of vaultOwners) {
      if (!isSolanaAddress(pk)) continue;
      const kp = feeVaultKeypair(pk, vaultSeed);
      if (!kp) continue;
      const vaultPk = kp.publicKey.toBase58();
      if (vaultPk === owner) continue;
      push({ role: "fee-vault", pk: vaultPk, kp });
    }
  }
  return out;
}

export async function previewProtocolSweep(opts?: { extractAll?: boolean }): Promise<SweepPreview> {
  const extractAll = opts?.extractAll !== false;
  const s = await readyState();
  const owner = ownerAddress();
  const campaign = await loadCampaign().catch(() => null);
  const campaignRunning = campaign?.status === "running";
  const relayReserved = !extractAll && Boolean(campaign && !campaign.relayFunded && campaign.status !== "done");
  const packed = await packSources();
  const bals = await balancesOf(packed.map((p) => p.pk));
  const legs: SweepLeg[] = [];
  let protocolSol = 0;
  const groups: Record<string, { sol: number; send: number; hot: number; n: number }> = {
    "tools-launch": { sol: 0, send: 0, hot: 0, n: 0 },
    "live-trading": { sol: 0, send: 0, hot: 0, n: 0 },
    "fee-vault": { sol: 0, send: 0, hot: 0, n: 0 },
  };
  let remainingSends = 0;
  const minSend = extractAll ? 1 : 1_000_000;
  for (const src of packed) {
    if (src.pk === owner) {
      if (!GROUP_ROLES.has(src.role)) {
        legs.push({ role: src.role, from: src.pk, sol: 0, keepSol: 0, sendSol: 0, hot: false, skip: "already_owner" });
      }
      continue;
    }
    const lamports = bals.get(src.pk) || 0;
    const sol = lamports / LAMPORTS_PER_SOL;
    const keep =
      extractAll ? 0 : src.role === "treasury" && relayReserved ? TREASURY_KEEP_LAMPORTS + BATCH_RELAY_LAMPORTS : TREASURY_KEEP_LAMPORTS;
    const send = Math.max(0, lamports - keep - TX_FEE);
    let skip: string | undefined;
    if (!src.kp) skip = "no_hot_key";
    else if (send < minSend) skip = "dust";
    const sendSol = skip ? 0 : send / LAMPORTS_PER_SOL;
    if (sendSol > 0) remainingSends += 1;
    if (GROUP_ROLES.has(src.role)) {
      const g = groups[src.role]!;
      g.n += 1;
      g.sol += sol;
      g.send += sendSol;
      if (src.kp) g.hot += 1;
      continue;
    }
    protocolSol += sol;
    legs.push({
      role: src.role,
      from: src.pk,
      sol,
      keepSol: keep / LAMPORTS_PER_SOL,
      sendSol,
      hot: Boolean(src.kp),
      skip,
    });
  }
  const labels: Record<string, string> = {
    "tools-launch": "launch wallets",
    "live-trading": "live trading wallets",
    "fee-vault": "fee vaults",
  };
  for (const role of ["tools-launch", "live-trading", "fee-vault"] as const) {
    const g = groups[role]!;
    if (!(g.n > 0 || g.sol > 0)) continue;
    legs.push({
      role,
      from: `${g.hot} ${labels[role]}`,
      sol: g.sol,
      keepSol: 0,
      sendSol: g.send,
      hot: g.hot > 0,
      skip: g.send > 0 ? undefined : g.hot ? "dust" : "no_hot_key",
    });
  }
  const movableSol = legs.reduce((n, l) => n + l.sendSol, 0);
  const onchain = peekPlatformOnchain();
  let padTvlSol = 0;
  for (const coin of s.launch?.coins || []) padTvlSol += Number(coin.curve?.realSol) || 0;
  const userWalletSol = Number(onchain?.userSol) || 0;
  const signedUserSol = groups["live-trading"]!.sol + groups["fee-vault"]!.sol;
  return {
    owner,
    userWalletSol,
    protocolSol,
    padTvlSol,
    launchSol: groups["tools-launch"]!.sol,
    liveSol: groups["live-trading"]!.sol,
    vaultSol: groups["fee-vault"]!.sol,
    liveCount: groups["live-trading"]!.hot,
    vaultCount: groups["fee-vault"]!.hot,
    movableSol,
    keepRelaySol: relayReserved ? BATCH_RELAY_LAMPORTS / LAMPORTS_PER_SOL : 0,
    lockedSol: Math.max(0, userWalletSol - signedUserSol) + padTvlSol,
    campaignRunning,
    remainingSends,
    legs,
    note: "EXTRACT ALL signs every protocol wallet, Tools launch wallet, delegated live-trading key, and fee vault the server can derive. Seed wallets live in the browser PIN vault and cannot be signed from here. Bonding-curve TVL stays in the pools. Click again if wallets remain.",
  };
}

export async function sweepProtocolToOwner(opts?: { extractAll?: boolean }): Promise<{
  ok: boolean;
  movedSol: number;
  signatures: string[];
  preview: SweepPreview;
  error?: string;
}> {
  const extractAll = opts?.extractAll !== false;
  const campaign = await loadCampaign().catch(() => null);
  if (campaign?.status === "running") {
    return {
      ok: false,
      movedSol: 0,
      signatures: [],
      preview: await previewProtocolSweep({ extractAll }),
      error: "Pause or stop the launcher first.",
    };
  }
  const preview = await previewProtocolSweep({ extractAll });
  if (!isSolanaAddress(preview.owner)) {
    return { ok: false, movedSol: 0, signatures: [], preview, error: "Set the owner wallet first." };
  }
  const to = new PublicKey(preview.owner);
  const packed = await packSources();
  const bals = await balancesOf(packed.map((p) => p.pk));
  const signatures: string[] = [];
  let moved = 0;
  let sent = 0;
  const minSend = extractAll ? 1 : 1_000_000;
  for (const src of packed) {
    if (!src.kp || src.pk === preview.owner) continue;
    const lamports = bals.get(src.pk) || 0;
    const keep =
      extractAll ? 0 : src.role === "treasury" && preview.keepRelaySol > 0 ? TREASURY_KEEP_LAMPORTS + BATCH_RELAY_LAMPORTS : TREASURY_KEEP_LAMPORTS;
    const send = Math.max(0, lamports - keep - TX_FEE);
    if (send < minSend) continue;
    if (sent >= MAX_SENDS) break;
    try {
      const sig = await sendLamports(src.kp, to, send);
      signatures.push(sig);
      moved += send / LAMPORTS_PER_SOL;
      sent += 1;
    } catch {
      /* keep going so one failed wallet does not block the rest */
    }
  }
  return { ok: true, movedSol: moved, signatures, preview: await previewProtocolSweep({ extractAll }) };
}
