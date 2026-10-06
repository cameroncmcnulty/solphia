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
  sphaReservedTokens,
  type SphaNetwork,
} from "@/lib/token/omics";
import { sphaRpc } from "@/lib/token/mint";
import { createCoin, emptyLaunchBook } from "@/lib/launch/engine";
import { dbcEnabled, liveDbcConfig } from "@/lib/launch/dbcIds";

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
    reserved: sphaReservedTokens(),
    curve: sphaCurveTokens(),
    dest,
    missing: sphaMissingDest(dest),
    allocations: sphaAllocations(dest),
    launch: s.sphaLaunch || null,
    testLaunch: s.sphaTestLaunch || null,
    sphaDbcConfig: s.sphaDbcConfig || "",
    padConfig: liveDbcConfig(s.launch?.dbcConfig),
    dbc: dbcEnabled(),
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
});

const Recorded = z.object({
  action: z.literal("record").optional(),
  mode: z.enum(["test", "official"]).optional(),
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

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const raw = await req.json().catch(() => null);
  const asPrep = Prepare.safeParse(raw);
  if (asPrep.success) return prepare(req, asPrep.data);
  const parsed = Recorded.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  return record(req, parsed.data);
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
  if (b.mode === "official") {
    const missing = sphaMissingDest(dest);
    if (missing.length) {
      return NextResponse.json(
        { error: "missing_wallets", message: `Set project wallets first: ${missing.join(", ")}` },
        { status: 400 },
      );
    }
  }
  const dbc = await import("@/lib/launch/dbc");
  const name = b.name.trim() || SPHA_NAME;
  const symbol = b.symbol.trim().toUpperCase() || SPHA_SYMBOL;
  const uri = (b.uri || "https://solphia.io").slice(0, 255);
  try {
    const built =
      b.mode === "official"
        ? await dbc.buildSphaDbcLaunchTx({ payer: b.payer, mint: b.mint, name, symbol, uri })
        : await dbc.buildDbcLaunchTx({
            payer: b.payer,
            mint: b.mint,
            name,
            symbol,
            uri,
            config: liveDbcConfig(s.launch?.dbcConfig),
          });
    return NextResponse.json({
      ok: true,
      mode: b.mode,
      mint: built.mint,
      tx: built.transaction,
      config: "config" in built ? built.config : undefined,
      configSecret: "configSecret" in built ? built.configSecret : undefined,
      supply: b.mode === "official" ? SPHA_SUPPLY : 1_000_000_000,
      firstBuyIncluded: Boolean(built.firstBuyIncluded),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not build the launch.";
    return NextResponse.json({ error: "chain_failed", message }, { status: 400 });
  }
}

async function record(req: NextRequest, b: z.infer<typeof Recorded>) {
  if (!isSolanaAddress(b.mint)) return NextResponse.json({ error: "bad_mint" }, { status: 400 });
  const mode = b.mode || "official";
  const official = mode === "official";
  const s0 = await readyState();
  const dest = destOf(s0);
  const allocations = b.allocations?.length ? b.allocations : sphaAllocations(dest).map((a) => ({ id: a.id, wallet: a.wallet, tokens: a.tokens }));
  const row = {
    mint: b.mint,
    network: b.network,
    name: b.name,
    symbol: b.symbol,
    supply: b.supply,
    launchedAt: Date.now(),
    sigs: b.sigs,
    allocations,
    image: b.image,
    blurb: b.blurb,
    uri: b.uri,
    website: b.website,
  };
  const payer = (b.payer || dest.owner || "").trim();
  await mutateState((s) => {
    if (official) {
      s.sphaMint = b.mint;
      s.sphaNetwork = b.network;
      s.sphaLaunch = row;
      if (b.config && isSolanaAddress(b.config)) s.sphaDbcConfig = b.config;
    } else {
      s.sphaTestLaunch = row;
    }
    pushBounded(s.audit, audit("admin", official ? "spha_launch" : "spha_test", `${b.network} ${b.mint}`, clientIp(req)), 400);
  });
  if (payer && isSolanaAddress(payer)) {
    await withLaunch((st) => {
      const book = bookOf(st);
      if (!official && b.config && isSolanaAddress(b.config) && !book.dbcConfig) {
        book.dbcConfig = b.config;
      }
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
  return NextResponse.json({ ok: true, mint: b.mint, official });
}
