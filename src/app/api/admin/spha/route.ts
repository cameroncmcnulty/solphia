import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { isSolanaAddress, clientIp } from "@/lib/security";
import { rpcUrl } from "@/lib/config";
import { treasuryAddress } from "@/lib/treasury";
import { audit, mutateState, pushBounded, readyState, withLaunch } from "@/lib/store";
import {
  SPHA_DECIMALS,
  SPHA_NAME,
  SPHA_SUPPLY,
  SPHA_SYMBOL,
  sphaAllocations,
  sphaCurveTokens,
  sphaMissingDest,
  mergeSphaTestLaunches,
  sphaLaunchMints,
  sphaReservedTokens,
  type SphaNetwork,
} from "@/lib/token/omics";
import { encodeTx, sphaRpc, buildSphaTeamMintTx } from "@/lib/token/mint";
import { connection } from "@/lib/solana/connection";
import { tokenUiAmount } from "@/lib/solana/tokenBalance";
import { createCoin, emptyLaunchBook } from "@/lib/launch/engine";
import { dbcEnabled, liveDbcConfig } from "@/lib/launch/dbcIds";
import { isTokenMetaUri, pinSphaTokenMeta, SPHA_DEFAULT_IMAGE } from "@/lib/token/sphaMeta";
import {
  SPHA_COUNTDOWN_MIN_MS,
  SPHA_MINT_LEAD_MS,
  emptySphaCountdown,
  normalizeSphaCountdown,
} from "@/lib/token/countdown";
import { countdownForAdmin, tickSphaCountdown } from "@/lib/token/sphaAutoLaunch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function destOf(s: Awaited<ReturnType<typeof readyState>>) {
  return {
    owner: s.ownerWallet || s.devWallet || "",
    foundation: s.foundationWallet || "",
    airdrop: s.airdropWallet || s.foundationWallet || "",
    treasury: s.treasuryWallet || treasuryAddress(),
    lp: "",
  };
}

function bookOf(s: { launch?: ReturnType<typeof emptyLaunchBook>; ownerWallet?: string }) {
  if (!s.launch) s.launch = emptyLaunchBook();
  if (s.ownerWallet && !s.launch.ownerWallet) s.launch.ownerWallet = s.ownerWallet;
  return s.launch;
}

type LaunchDeskRow = NonNullable<Awaited<ReturnType<typeof readyState>>["sphaLaunch"]> & {
  bals?: { owner: number; foundation: number; treasury: number; ownerSol?: number; curveSol?: number };
  fees?: { creatorFeesSol: number; creatorUnclaimedSol: number; partnerFeesSol: number; partnerUnclaimedSol: number };
};

async function enrichLaunchRow(
  row: NonNullable<Awaited<ReturnType<typeof readyState>>["sphaLaunch"]>,
  dest: ReturnType<typeof destOf>,
  dbc: typeof import("@/lib/launch/dbc") | null,
): Promise<LaunchDeskRow> {
  const conn = connection();
  const fnd = dest.airdrop || dest.foundation;
  const [ownerBal, fndBal, treasBal, fees, curveSol] = await Promise.all([
    dest.owner && isSolanaAddress(dest.owner) ? tokenUiAmount(conn, dest.owner, row.mint) : Promise.resolve({ amount: 0 }),
    fnd && isSolanaAddress(fnd) ? tokenUiAmount(conn, fnd, row.mint) : Promise.resolve({ amount: 0 }),
    dest.treasury && isSolanaAddress(dest.treasury)
      ? tokenUiAmount(conn, dest.treasury, row.mint)
      : Promise.resolve({ amount: 0 }),
    dbc ? dbc.dbcFeeBreakdown(row.mint).catch(() => null) : Promise.resolve(null),
    dbc ? dbc.dbcPoolQuoteSol(row.mint).catch(() => 0) : Promise.resolve(0),
  ]);
  const ownerTokens = Number(ownerBal.amount) || 0;
  let ownerSol = 0;
  if (dbc && ownerTokens > 0) {
    try {
      const q = await dbc.quoteDbcTrade({ mint: row.mint, side: "sell", tokens: ownerTokens });
      if (q.ok) ownerSol = Number(q.solOut) || 0;
    } catch {
      ownerSol = 0;
    }
  }
  return {
    ...row,
    bals: {
      owner: ownerTokens,
      foundation: Number(fndBal.amount) || 0,
      treasury: Number(treasBal.amount) || 0,
      ownerSol,
      curveSol: Number(curveSol) || 0,
    },
    fees: fees || { creatorFeesSol: 0, creatorUnclaimedSol: 0, partnerFeesSol: 0, partnerUnclaimedSol: 0 },
  };
}

async function enrichLaunchRows(
  rows: NonNullable<Awaited<ReturnType<typeof readyState>>["sphaLaunch"]>[],
  dest: ReturnType<typeof destOf>,
  dbc: typeof import("@/lib/launch/dbc") | null,
): Promise<LaunchDeskRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      try {
        return await enrichLaunchRow(row, dest, dbc);
      } catch {
        return row;
      }
    }),
  );
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const s = await readyState();
  const dest = destOf(s);
  const network: SphaNetwork = s.sphaNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";
  const tests = mergeSphaTestLaunches(s.sphaTestLaunches, [], s.sphaTestLaunch || null);
  const dbc = await import("@/lib/launch/dbc").catch(() => null);
  const [launch, testLaunches] = await Promise.all([
    s.sphaLaunch ? enrichLaunchRow(s.sphaLaunch, dest, dbc).catch(() => s.sphaLaunch) : Promise.resolve(null),
    enrichLaunchRows(tests, dest, dbc),
  ]);
  const testLaunch = testLaunches.find((r) => r.mint === s.sphaTestLaunch?.mint) || testLaunches[0] || null;
  return NextResponse.json({
    ok: true,
    network,
    rpc: sphaRpc(network, rpcUrl()),
    name: SPHA_NAME,
    symbol: SPHA_SYMBOL,
    supply: SPHA_SUPPLY,
    decimals: SPHA_DECIMALS,
    reserved: sphaReservedTokens(),
    curve: sphaCurveTokens(),
    dest,
    missing: sphaMissingDest(dest),
    allocations: sphaAllocations(dest),
    launch,
    testLaunch,
    testLaunches,
    sphaDbcConfig: s.sphaDbcConfig || "",
    padConfig: liveDbcConfig(s.launch?.dbcConfig),
    dbc: dbcEnabled(),
    mints: sphaLaunchMints(s),
    countdown: countdownForAdmin(s.sphaCountdown, s.sphaMint || ""),
  });
}

const Prepare = z.object({
  action: z.literal("prepare"),
  mode: z.enum(["test", "official"]),
  payer: z.string(),
  mint: z.string(),
  name: z.string().max(32),
  symbol: z.string().max(12),
  uri: z.string().max(400).optional(),
  image: z.string().max(400).optional(),
  blurb: z.string().max(280).optional(),
  website: z.string().max(160).optional(),
});

const Team = z.object({
  action: z.literal("prepareTeam"),
  payer: z.string(),
  mint: z.string(),
});

const PoolMeta = z.object({
  action: z.literal("preparePoolMeta"),
  payer: z.string(),
  mint: z.string(),
  name: z.string().max(32),
  website: z.string().max(160).optional(),
  logo: z.string().max(255).optional(),
});

const Buy = z.object({
  action: z.enum(["prepareBuy", "prepareTrade"]),
  payer: z.string(),
  mint: z.string(),
  side: z.enum(["buy", "sell"]).optional(),
  sol: z.number().min(0.01).max(2).optional(),
  tokens: z.number().min(0).optional(),
});

const Claim = z.object({
  action: z.literal("prepareClaim"),
  kind: z.enum(["creator", "partner"]),
  payer: z.string(),
  mint: z.string(),
});

const Recorded = z.object({
  action: z.literal("record").optional(),
  mode: z.enum(["test", "official"]).optional(),
  pending: z.boolean().optional(),
  mint: z.string(),
  network: z.enum(["devnet", "mainnet-beta"]),
  name: z.string().max(32),
  symbol: z.string().max(12),
  supply: z.number().int().positive(),
  sigs: z.array(z.string().min(32).max(128)).min(1).max(8),
  allocations: z.array(z.object({ id: z.string(), wallet: z.string(), tokens: z.number() })).optional(),
  image: z.string().max(400).optional(),
  blurb: z.string().max(280).optional(),
  uri: z.string().max(400).optional(),
  website: z.string().max(160).optional(),
  config: z.string().max(64).optional(),
  payer: z.string().optional(),
});

const Schedule = z.object({
  action: z.literal("schedule"),
  launchAt: z.number().int().positive(),
  confirmOfficial: z.literal(true),
  confirmMainnet: z.boolean().optional(),
});

const ClearSchedule = z.object({
  action: z.literal("clearSchedule"),
});

const TickCountdown = z.object({
  action: z.literal("tickCountdown"),
});

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const raw = await req.json().catch(() => null);
  const asPrep = Prepare.safeParse(raw);
  if (asPrep.success) return prepare(req, asPrep.data);
  const asTeam = Team.safeParse(raw);
  if (asTeam.success) return prepareTeam(asTeam.data);
  const asPoolMeta = PoolMeta.safeParse(raw);
  if (asPoolMeta.success) return preparePoolMeta(asPoolMeta.data);
  const asBuy = Buy.safeParse(raw);
  if (asBuy.success) return prepareBuy(asBuy.data);
  const asClaim = Claim.safeParse(raw);
  if (asClaim.success) return prepareClaim(asClaim.data);
  const asSched = Schedule.safeParse(raw);
  if (asSched.success) return schedule(req, asSched.data);
  const asClear = ClearSchedule.safeParse(raw);
  if (asClear.success) return clearSchedule(req);
  const asTick = TickCountdown.safeParse(raw);
  if (asTick.success) return tick(req);
  const parsed = Recorded.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  return record(req, parsed.data);
}

async function schedule(req: NextRequest, b: z.infer<typeof Schedule>) {
  const now = Date.now();
  if (b.launchAt < now + SPHA_COUNTDOWN_MIN_MS) {
    return NextResponse.json(
      {
        error: "too_soon",
        message: "Set the official launch at least 10 minutes 30 seconds from now so the T-10 mint has a window.",
      },
      { status: 400 },
    );
  }
  const s = await readyState();
  if ((s.sphaMint || "").trim()) {
    return NextResponse.json({ error: "already_live", message: "Official $SPHA is already live." }, { status: 400 });
  }
  const cd = normalizeSphaCountdown(s.sphaCountdown);
  if ((cd.pendingMint || "").trim()) {
    return NextResponse.json({ error: "already_minted", message: "The official mint already exists. Wait for T-0 to reveal it." }, { status: 400 });
  }
  const net: SphaNetwork = s.sphaNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";
  if (net === "mainnet-beta" && b.confirmMainnet !== true) {
    return NextResponse.json(
      { error: "confirm_mainnet", message: "Confirm MAINNET official $SPHA to arm the countdown." },
      { status: 400 },
    );
  }
  const missing = sphaMissingDest(destOf(s));
  if (missing.length) {
    return NextResponse.json(
      { error: "missing_wallets", message: `Set project wallets first: ${missing.join(", ")}` },
      { status: 400 },
    );
  }
  await mutateState((st) => {
    st.sphaCountdown = {
      ...emptySphaCountdown(),
      launchAt: b.launchAt,
      mintLeadMs: SPHA_MINT_LEAD_MS,
      armedAt: now,
      status: "armed",
      at: now,
    };
    pushBounded(st.audit, audit("admin", "spha_schedule", String(b.launchAt), clientIp(req)), 400);
  });
  const after = await readyState();
  return NextResponse.json({
    ok: true,
    countdown: countdownForAdmin(after.sphaCountdown, after.sphaMint || "", now),
  });
}

async function clearSchedule(req: NextRequest) {
  const s = await readyState();
  const cd = normalizeSphaCountdown(s.sphaCountdown);
  if ((s.sphaMint || "").trim() || cd.status === "live") {
    return NextResponse.json({ error: "already_live", message: "Official $SPHA is already live." }, { status: 400 });
  }
  if ((cd.pendingMint || "").trim()) {
    return NextResponse.json({ error: "already_minted", message: "The official mint already exists. The countdown cannot be cleared." }, { status: 400 });
  }
  await mutateState((st) => {
    st.sphaCountdown = { ...emptySphaCountdown(), at: Date.now() };
    pushBounded(st.audit, audit("admin", "spha_schedule_clear", "cleared", clientIp(req)), 400);
  });
  return NextResponse.json({ ok: true, countdown: countdownForAdmin(emptySphaCountdown(), "", Date.now()) });
}

async function tick(_req: NextRequest) {
  const out = await tickSphaCountdown();
  const s = await readyState();
  return NextResponse.json({
    ...out,
    countdown: countdownForAdmin(s.sphaCountdown, s.sphaMint || ""),
  });
}

async function prepare(req: NextRequest, b: z.infer<typeof Prepare>) {
  if (!isSolanaAddress(b.payer) || !isSolanaAddress(b.mint)) {
    return NextResponse.json({ error: "bad_wallet", message: "Owner wallet and mint are required." }, { status: 400 });
  }
  if (!dbcEnabled()) {
    return NextResponse.json({ error: "dbc_off", message: "The bonding curve is not enabled." }, { status: 400 });
  }
  const s = await readyState();
  const dest = destOf(s);
  const missing = sphaMissingDest(dest);
  if (missing.length) {
    return NextResponse.json(
      { error: "missing_wallets", message: `Set project wallets first: ${missing.join(", ")}` },
      { status: 400 },
    );
  }
  const dbc = await import("@/lib/launch/dbc");
  const name = b.name.trim() || SPHA_NAME;
  const symbol = b.symbol.trim().toUpperCase() || SPHA_SYMBOL;
  const website = (b.website || "https://solphia.io").trim();
  let uri = (b.uri || "").trim();
  let image = (b.image || "").trim();
  if (!isTokenMetaUri(uri)) {
    const pinned = await pinSphaTokenMeta({
      name,
      symbol,
      description: b.blurb,
      image: image || SPHA_DEFAULT_IMAGE,
      website,
    });
    if (!pinned?.uri || !isTokenMetaUri(pinned.uri)) {
      return NextResponse.json(
        { error: "meta_uri", message: "Pin token metadata first. Homepage URLs are not metadata." },
        { status: 400 },
      );
    }
    uri = pinned.uri;
    image = pinned.image;
  }
  try {
    const built = await dbc.buildSphaDbcLaunchTx({
      payer: b.payer,
      mint: b.mint,
      name,
      symbol,
      uri: uri.slice(0, 255),
    });
    return NextResponse.json({
      ok: true,
      mode: b.mode,
      mint: built.mint,
      tx: built.transaction,
      config: built.config,
      configSecret: built.configSecret,
      supply: SPHA_SUPPLY,
      firstBuyIncluded: Boolean(built.firstBuyIncluded),
      uri,
      image: image || SPHA_DEFAULT_IMAGE,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the launch.";
    return NextResponse.json({ error: "chain_failed", message }, { status: 400 });
  }
}

async function prepareTeam(b: z.infer<typeof Team>) {
  if (!isSolanaAddress(b.payer) || !isSolanaAddress(b.mint)) {
    return NextResponse.json({ error: "bad_wallet", message: "Owner wallet and mint are required." }, { status: 400 });
  }
  const s = await readyState();
  const dest = destOf(s);
  const missing = sphaMissingDest(dest);
  if (missing.length) {
    return NextResponse.json(
      { error: "missing_wallets", message: `Set project wallets first: ${missing.join(", ")}` },
      { status: 400 },
    );
  }
  try {
    const built = await buildSphaTeamMintTx({ conn: connection(), payer: b.payer, mint: b.mint, dest });
    return NextResponse.json({
      ok: true,
      mint: b.mint,
      tx: encodeTx(built.transaction),
      legs: built.legs,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build team mint.";
    return NextResponse.json({ error: "chain_failed", message }, { status: 400 });
  }
}

async function preparePoolMeta(b: z.infer<typeof PoolMeta>) {
  if (!isSolanaAddress(b.payer) || !isSolanaAddress(b.mint)) {
    return NextResponse.json({ error: "bad_wallet", message: "Owner wallet and mint are required." }, { status: 400 });
  }
  try {
    const dbc = await import("@/lib/launch/dbc");
    const built = await dbc.buildDbcPoolMetadataTx({
      payer: b.payer,
      mint: b.mint,
      name: b.name.trim() || SPHA_NAME,
      website: b.website || "https://solphia.io",
      logo: b.logo || SPHA_DEFAULT_IMAGE,
    });
    return NextResponse.json({ ok: true, mint: b.mint, tx: built.transaction, pool: built.pool });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build pool metadata.";
    return NextResponse.json({ error: "chain_failed", message }, { status: 400 });
  }
}

async function prepareBuy(b: z.infer<typeof Buy>) {
  if (!isSolanaAddress(b.payer) || !isSolanaAddress(b.mint)) {
    return NextResponse.json({ error: "bad_wallet", message: "Buyer wallet and mint are required." }, { status: 400 });
  }
  const side = b.side === "sell" ? "sell" : "buy";
  try {
    const dbc = await import("@/lib/launch/dbc");
    const pool = await dbc.waitForDbcPool(b.mint, 16);
    if (!pool) {
      return NextResponse.json({ error: "curve_missing", message: "Pool not on-chain yet." }, { status: 400 });
    }
    let tokens = b.tokens;
    if (side === "sell") {
      const bag = await tokenUiAmount(connection(), b.payer, b.mint);
      const have = bag.amount;
      if (!(have > 0)) {
        return NextResponse.json({ error: "empty_bag", message: "This wallet has none of that token to sell." }, { status: 400 });
      }
      tokens = tokens && tokens > 0 ? Math.min(tokens, have) : have;
    }
    const built = await dbc.buildDbcTradeTx({
      mint: b.mint,
      owner: b.payer,
      side,
      sol: side === "buy" ? b.sol || 0.05 : undefined,
      tokens: side === "sell" ? tokens : undefined,
    });
    if (!built.ok) {
      return NextResponse.json({ error: built.error, message: side === "sell" ? "Could not build the sell." : "Could not build the first buy." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      mint: b.mint,
      side,
      tx: built.transaction,
      tokensOut: built.tokensOut,
      solOut: built.solOut,
      feeSol: built.feeSol,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the swap.";
    return NextResponse.json({ error: "chain_failed", message }, { status: 400 });
  }
}

async function record(req: NextRequest, b: z.infer<typeof Recorded>) {
  if (!isSolanaAddress(b.mint)) return NextResponse.json({ error: "bad_mint" }, { status: 400 });
  const mode = b.mode || "official";
  const official = mode === "official";
  const pending = Boolean(b.pending && official);
  const s0 = await readyState();
  const dest = destOf(s0);
  const allocations = b.allocations?.length ? b.allocations : sphaAllocations(dest).map((a) => ({ id: a.id, wallet: a.wallet, tokens: a.tokens }));
  const row = {
    mint: b.mint,
    network: b.network,
    name: b.name,
    symbol: b.symbol,
    supply: SPHA_SUPPLY,
    launchedAt: Date.now(),
    sigs: b.sigs,
    allocations,
    image: b.image,
    blurb: b.blurb,
    uri: b.uri,
    website: b.website,
    config: b.config && isSolanaAddress(b.config) ? b.config : undefined,
  };
  const payer = (b.payer || dest.owner || "").trim();
  await mutateState((s) => {
    if (official && pending) {
      const next = normalizeSphaCountdown(s.sphaCountdown);
      next.status = "minted";
      next.pendingMint = b.mint;
      next.pendingConfig = row.config;
      next.pendingSigs = b.sigs;
      next.pendingLaunch = row;
      next.error = undefined;
      next.at = Date.now();
      s.sphaCountdown = next;
      s.sphaNetwork = b.network;
      if (b.config && isSolanaAddress(b.config)) s.sphaDbcConfig = b.config;
    } else if (official) {
      s.sphaMint = b.mint;
      s.sphaNetwork = b.network;
      s.sphaLaunch = row;
      if (b.config && isSolanaAddress(b.config)) s.sphaDbcConfig = b.config;
    } else {
      s.sphaTestLaunches = mergeSphaTestLaunches(s.sphaTestLaunches, [], s.sphaTestLaunch || null);
      s.sphaTestLaunches = mergeSphaTestLaunches(s.sphaTestLaunches, [], row);
      s.sphaTestLaunch = row;
    }
    pushBounded(
      s.audit,
      audit("admin", pending ? "spha_pending_mint" : official ? "spha_launch" : "spha_test", `${b.network} ${b.mint}`, clientIp(req)),
      400,
    );
  });
  if (payer && isSolanaAddress(payer)) {
    await withLaunch((st) => {
      const book = bookOf(st);
      createCoin(book, {
        creator: payer,
        name: b.name,
        symbol: b.symbol,
        blurb: b.blurb,
        image: b.image,
        website: b.website,
        mint: b.mint,
        venue: "solphia",
      });
    }, true);
  }
  return NextResponse.json({ ok: true, mint: b.mint, official: official && !pending, pending });
}

async function prepareClaim(b: z.infer<typeof Claim>) {
  if (!isSolanaAddress(b.payer) || !isSolanaAddress(b.mint)) {
    return NextResponse.json({ error: "bad_wallet", message: "Wallet and mint are required." }, { status: 400 });
  }
  if (!dbcEnabled()) {
    return NextResponse.json({ error: "dbc_off", message: "The bonding curve is not enabled." }, { status: 400 });
  }
  try {
    const dbc = await import("@/lib/launch/dbc");
    if (b.kind === "creator") {
      const built = await dbc.buildDbcClaimCreatorTx({ mint: b.mint, owner: b.payer });
      if (!built.ok) {
        return NextResponse.json(
          {
            error: built.error || "empty",
            message:
              built.error === "empty"
                ? "No unclaimed creator fees on this pool. Creator fees pay the wallet that launched the curve."
                : built.error || "Could not build the creator claim.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: true, kind: "creator", mint: b.mint, tx: built.transaction });
    }
    const s = await readyState();
    const treas = destOf(s).treasury;
    if (!isSolanaAddress(treas)) {
      return NextResponse.json({ error: "need_wallets", message: "Set the treasury project wallet first." }, { status: 400 });
    }
    const built = await dbc.buildDbcClaimPartnerTx({ mint: b.mint, owner: treas, receiver: treas });
    if (!built.ok) {
      return NextResponse.json(
        {
          error: built.error || "empty",
          message:
            built.error === "empty"
              ? "No unclaimed partner fees on this pool. Fees sit in the curve until you claim."
              : "Could not build the partner claim.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, kind: "partner", mint: b.mint, tx: built.transaction, from: treas });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the claim.";
    return NextResponse.json({ error: "chain_failed", message }, { status: 400 });
  }
}
