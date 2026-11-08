import { Keypair, PublicKey } from "@solana/web3.js";
import { isSolanaAddress } from "../security";
import { audit, mutateState, pushBounded, readyState, withLaunch } from "../store";
import { loadProjectServerKeypair } from "../wallet/projectKeys";
import { treasuryAddress } from "../treasury";
import { durableConfigured, kvDel, kvGetJson, kvSetEx, kvSetNxEx, KEYS } from "../persist";
import { signPackedB64 } from "../solana/extraSign";
import { broadcastB64 } from "../solana/broadcast";
import { b64ToBytes, bytesToB64 } from "../solana/wire";
import { connection } from "../solana/connection";
import { encodeTx, buildSphaTeamMintTx } from "./mint";
import { pinSphaTokenMeta, isTokenMetaUri, SPHA_DEFAULT_IMAGE } from "./sphaMeta";
import {
  SPHA_BLURB,
  SPHA_NAME,
  SPHA_SUPPLY,
  SPHA_SYMBOL,
  SPHA_TELEGRAM,
  SPHA_WEBSITE,
  SPHA_X,
  sphaAllocations,
  sphaMissingDest,
} from "./omics";
import { createCoin, emptyLaunchBook } from "../launch/engine";
import { dbcEnabled } from "../launch/dbcIds";
import {
  emptySphaCountdown,
  normalizeSphaCountdown,
  SPHA_REHEARSAL_LEAD_MS,
  SPHA_REHEARSAL_MS,
  sphaInMintWindow,
  sphaTimedOut,
  type SphaCountdown,
  type SphaCountdownLaunch,
} from "./countdown";

const LOCK_TTL_S = 120;
const FIRST_BUY_SOL = 0.05;
const INFLIGHT_TTL_S = 40 * 60;

type InflightMint = {
  mint: string;
  secret: string;
  uri: string;
  image: string;
  at: number;
};

async function loadInflightMint(): Promise<InflightMint | null> {
  const raw = await kvGetJson(KEYS.sphaMintInflight).catch(() => null);
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const mint = typeof o.mint === "string" ? o.mint.trim() : "";
  const secret = typeof o.secret === "string" ? o.secret.trim() : "";
  if (!isSolanaAddress(mint) || !secret) return null;
  return {
    mint,
    secret,
    uri: typeof o.uri === "string" ? o.uri : "",
    image: typeof o.image === "string" ? o.image : SPHA_DEFAULT_IMAGE,
    at: Number(o.at) || 0,
  };
}

async function saveInflightMint(row: InflightMint): Promise<void> {
  await kvSetEx(KEYS.sphaMintInflight, row, INFLIGHT_TTL_S).catch(() => undefined);
}

async function clearInflightMint(): Promise<void> {
  await kvDel(KEYS.sphaMintInflight).catch(() => undefined);
}

async function mintAccountExists(mint: string): Promise<boolean> {
  try {
    const info = await connection().getAccountInfo(new PublicKey(mint), "confirmed");
    return Boolean(info);
  } catch {
    return false;
  }
}

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

async function withMintLock<T>(fn: () => Promise<T>): Promise<T | { skipped: true; reason: string }> {
  const got = await kvSetNxEx(KEYS.sphaMintLock, { at: Date.now() }, LOCK_TTL_S);
  if (got === false) {
    const durable = await import("../persist").then((m) => m.durableConfigured());
    if (durable) return { skipped: true, reason: "lock" };
  }
  try {
    return await fn();
  } finally {
    await kvDel(KEYS.sphaMintLock).catch(() => undefined);
  }
}

async function signSend(packed: string, signers: Keypair[]): Promise<string> {
  const signed = signPackedB64(packed, signers);
  return broadcastB64(signed, { skipPreflight: false });
}

export async function revealOfficialSpha(now = Date.now()): Promise<{
  ok: boolean;
  revealed: boolean;
  mint: string;
  error?: string;
}> {
  const s = await readyState();
  const cd = normalizeSphaCountdown(s.sphaCountdown);
  const pending = (cd.pendingMint || "").trim();
  const live = (s.sphaMint || "").trim();
  if (live) {
    if (cd.status !== "live") {
      await mutateState((st) => {
        const next = normalizeSphaCountdown(st.sphaCountdown);
        next.status = "live";
        next.revealedAt = next.revealedAt || now;
        next.at = now;
        st.sphaCountdown = next;
      });
    }
    return { ok: true, revealed: true, mint: live };
  }
  if (!pending) return { ok: true, revealed: false, mint: "" };
  if (!sphaTimedOut(cd, now) && cd.status !== "live") {
    return { ok: true, revealed: false, mint: "" };
  }
  await mutateState((st) => {
    const next = normalizeSphaCountdown(st.sphaCountdown);
    const mint = (next.pendingMint || pending).trim();
    if (!mint) return;
    st.sphaMint = mint;
    if (next.pendingLaunch) st.sphaLaunch = next.pendingLaunch;
    if (next.pendingConfig && isSolanaAddress(next.pendingConfig)) st.sphaDbcConfig = next.pendingConfig;
    next.status = "live";
    next.revealedAt = now;
    next.at = now;
    st.sphaCountdown = next;
    pushBounded(st.audit, audit("admin", "spha_reveal", mint), 400);
  });
  const after = await readyState();
  return { ok: true, revealed: Boolean(after.sphaMint), mint: after.sphaMint || pending };
}

export async function mintOfficialPending(now = Date.now()): Promise<{
  ok: boolean;
  minted: boolean;
  mint: string;
  needsSigner?: boolean;
  error?: string;
}> {
  const s0 = await readyState();
  const cd0 = normalizeSphaCountdown(s0.sphaCountdown);
  if ((s0.sphaMint || "").trim()) return { ok: true, minted: true, mint: s0.sphaMint || "" };
  if ((cd0.pendingMint || "").trim()) return { ok: true, minted: true, mint: cd0.pendingMint || "" };
  if (!(cd0.launchAt > 0) || !sphaInMintWindow(cd0, now)) {
    return { ok: true, minted: false, mint: "" };
  }
  if (cd0.status === "minting" && cd0.mintingAt && now - cd0.mintingAt < 90_000) {
    return { ok: true, minted: false, mint: "" };
  }
  if (cd0.rehearsal) return mintRehearsalPending(now);
  if (!durableConfigured()) {
    return { ok: false, minted: false, mint: "", error: "Official mint requires the durable store." };
  }
  if (!dbcEnabled()) return { ok: false, minted: false, mint: "", error: "The bonding curve is not enabled." };

  const locked = await withMintLock(async () => {
    const s = await readyState();
    const cd = normalizeSphaCountdown(s.sphaCountdown);
    if ((s.sphaMint || "").trim()) return { ok: true as const, minted: true, mint: s.sphaMint || "" };
    if ((cd.pendingMint || "").trim()) return { ok: true as const, minted: true, mint: cd.pendingMint || "" };
    const dest = destOf(s);
    const missing = sphaMissingDest(dest);
    if (missing.length) {
      return { ok: false as const, minted: false, mint: "", error: `Set project wallets first: ${missing.join(", ")}` };
    }
    const owner = await loadProjectServerKeypair("owner");
    if (!owner) {
      await mutateState((st) => {
        const next = normalizeSphaCountdown(st.sphaCountdown);
        next.status = "armed";
        next.error = "needs_signer";
        next.at = Date.now();
        st.sphaCountdown = next;
      });
      return { ok: false as const, minted: false, mint: "", needsSigner: true, error: "needs_signer" };
    }
    await mutateState((st) => {
      const next = normalizeSphaCountdown(st.sphaCountdown);
      next.status = "minting";
      next.mintingAt = Date.now();
      next.error = undefined;
      next.at = Date.now();
      st.sphaCountdown = next;
    });

    const payer = owner.publicKey.toBase58();
    const name = SPHA_NAME;
    const symbol = SPHA_SYMBOL;
    const website = (s.sphaSocials?.website || "").trim() || SPHA_WEBSITE;
    const x = (s.sphaSocials?.x || "").trim() || SPHA_X;
    const telegram = (s.sphaSocials?.telegram || "").trim() || SPHA_TELEGRAM;
    const blurb = SPHA_BLURB;
    const inflight = await loadInflightMint();
    let mintKp: Keypair;
    try {
      mintKp = inflight ? Keypair.fromSecretKey(b64ToBytes(inflight.secret)) : Keypair.generate();
    } catch {
      mintKp = Keypair.generate();
    }
    const mint = mintKp.publicKey.toBase58();
    let uri = inflight?.uri && isTokenMetaUri(inflight.uri) ? inflight.uri : "";
    let image = inflight?.image || SPHA_DEFAULT_IMAGE;

    if (await mintAccountExists(mint)) {
      const allocations = sphaAllocations(dest).map((a) => ({ id: a.id, wallet: a.wallet, tokens: a.tokens }));
      const row: SphaCountdownLaunch = {
        mint,
        network: "mainnet-beta",
        name,
        symbol,
        supply: SPHA_SUPPLY,
        launchedAt: Date.now(),
        sigs: ["recovered"],
        allocations,
        image,
        blurb,
        uri,
        website,
      };
      await mutateState((st) => {
        st.sphaNetwork = "mainnet-beta";
        const next = normalizeSphaCountdown(st.sphaCountdown);
        next.status = "minted";
        next.pendingMint = mint;
        next.pendingSigs = ["recovered"];
        next.pendingLaunch = row;
        next.error = undefined;
        next.at = Date.now();
        st.sphaCountdown = next;
        pushBounded(st.audit, audit("admin", "spha_pending_mint", mint), 400);
      });
      await clearInflightMint();
      return { ok: true as const, minted: true, mint };
    }

    if (!uri) {
      const pinned = await pinSphaTokenMeta({
        name,
        symbol,
        description: blurb,
        image,
        website,
        x,
        telegram,
      });
      if (!pinned?.uri || !isTokenMetaUri(pinned.uri)) {
        await mutateState((st) => {
          const next = normalizeSphaCountdown(st.sphaCountdown);
          next.status = "failed";
          next.error = "meta_uri";
          next.at = Date.now();
          st.sphaCountdown = next;
        });
        return { ok: false as const, minted: false, mint: "", error: "Pin token metadata first." };
      }
      uri = pinned.uri;
      image = pinned.image || image;
    }

    await saveInflightMint({ mint, secret: bytesToB64(mintKp.secretKey), uri, image, at: Date.now() });

    const dbc = await import("../launch/dbc");
    let built: Awaited<ReturnType<typeof dbc.buildSphaDbcLaunchTx>>;
    try {
      built = await dbc.buildSphaDbcLaunchTx({
        payer,
        mint,
        name,
        symbol,
        uri: uri.slice(0, 255),
      });
    } catch (e) {
      await mutateState((st) => {
        const next = normalizeSphaCountdown(st.sphaCountdown);
        next.status = "failed";
        next.error = e instanceof Error ? e.message : "Could not build the launch.";
        next.at = Date.now();
        st.sphaCountdown = next;
      });
      return { ok: false as const, minted: false, mint: "", error: e instanceof Error ? e.message : "Could not build the launch." };
    }
    const extras: Keypair[] = [owner, mintKp];
    if (built.configSecret) extras.push(Keypair.fromSecretKey(b64ToBytes(built.configSecret)));
    let sig = "";
    try {
      sig = await signSend(built.transaction, extras);
    } catch (e) {
      if (!(await mintAccountExists(mint))) {
        await mutateState((st) => {
          const next = normalizeSphaCountdown(st.sphaCountdown);
          next.status = "failed";
          next.error = e instanceof Error ? e.message : "send failed";
          next.at = Date.now();
          st.sphaCountdown = next;
        });
        return { ok: false as const, minted: false, mint: "", error: e instanceof Error ? e.message : "send failed" };
      }
      sig = "recovered";
    }
    const allocations = sphaAllocations(dest).map((a) => ({ id: a.id, wallet: a.wallet, tokens: a.tokens }));
    const row: SphaCountdownLaunch = {
      mint,
      network: "mainnet-beta",
      name,
      symbol,
      supply: SPHA_SUPPLY,
      launchedAt: Date.now(),
      sigs: [sig],
      allocations,
      image,
      blurb,
      uri,
      website,
      config: built.config,
    };

    await mutateState((st) => {
      st.sphaNetwork = "mainnet-beta";
      const next = normalizeSphaCountdown(st.sphaCountdown);
      next.status = "minted";
      next.pendingMint = mint;
      next.pendingConfig = built.config;
      next.pendingSigs = [sig];
      next.pendingLaunch = row;
      next.error = undefined;
      next.at = Date.now();
      st.sphaCountdown = next;
      pushBounded(st.audit, audit("admin", "spha_pending_mint", mint), 400);
    });
    await clearInflightMint();

    try {
      const team = await buildSphaTeamMintTx({ conn: connection(), payer, mint, dest });
      await signSend(encodeTx(team.transaction), [owner]);
    } catch {
      /* pending CA still counts */
    }
    try {
      const meta = await dbc.buildDbcPoolMetadataTx({
        payer,
        mint,
        name,
        website,
        logo: image,
      });
      await signSend(meta.transaction, [owner]);
    } catch {
      /* pool meta pending */
    }
    try {
      const pool = await dbc.waitForDbcPool(mint, 16);
      if (pool) {
        const buy = await dbc.buildDbcTradeTx({ mint, owner: payer, side: "buy", sol: FIRST_BUY_SOL });
        if (buy.ok) await signSend(buy.transaction, [owner]);
      }
    } catch {
      /* first buy pending */
    }

    if (isSolanaAddress(payer)) {
      await withLaunch((st) => {
        const book = bookOf(st);
        createCoin(book, {
          creator: payer,
          name,
          symbol,
          blurb,
          image,
          website,
          x,
          telegram,
          mint,
          venue: "solphia",
        });
      }, true);
    }

    return { ok: true as const, minted: true, mint };
  });

  if (locked && typeof locked === "object" && "skipped" in locked) {
    return { ok: true, minted: false, mint: "" };
  }
  return locked;
}

async function finalizeOfficialPending(now = Date.now()): Promise<void> {
  if (!durableConfigured()) return;
  const s = await readyState();
  const cd = normalizeSphaCountdown(s.sphaCountdown);
  if (cd.rehearsal) return;
  const mint = (cd.pendingMint || s.sphaMint || "").trim();
  if (!mint || !isSolanaAddress(mint)) return;
  const owner = await loadProjectServerKeypair("owner");
  if (!owner) return;
  const payer = owner.publicKey.toBase58();
  const name = cd.pendingLaunch?.name || SPHA_NAME;
  const website = cd.pendingLaunch?.website || SPHA_WEBSITE;
  const image = cd.pendingLaunch?.image || SPHA_DEFAULT_IMAGE;
  const dest = destOf(s);
  try {
    try {
      const team = await buildSphaTeamMintTx({ conn: connection(), payer, mint, dest });
      await signSend(encodeTx(team.transaction), [owner]);
    } catch {
      /* team slices may already exist */
    }
    const dbc = await import("../launch/dbc");
    const pool = await dbc.waitForDbcPool(mint, 8);
    if (!pool) return;
    try {
      const meta = await dbc.buildDbcPoolMetadataTx({ payer, mint, name, website, logo: image });
      await signSend(meta.transaction, [owner]);
    } catch {
      /* pool meta may already exist */
    }
    try {
      const buy = await dbc.buildDbcTradeTx({ mint, owner: payer, side: "buy", sol: FIRST_BUY_SOL });
      if (buy.ok) await signSend(buy.transaction, [owner]);
    } catch {
      /* first buy may already have landed */
    }
    if (isSolanaAddress(payer)) {
      await withLaunch((st) => {
        const book = bookOf(st);
        createCoin(book, {
          creator: payer,
          name,
          symbol: cd.pendingLaunch?.symbol || SPHA_SYMBOL,
          blurb: cd.pendingLaunch?.blurb || SPHA_BLURB,
          image,
          website,
          x: (s.sphaSocials?.x || "").trim() || SPHA_X,
          telegram: (s.sphaSocials?.telegram || "").trim() || SPHA_TELEGRAM,
          mint,
          venue: "solphia",
        });
      }, true);
    }
    await mutateState((st) => {
      const next = normalizeSphaCountdown(st.sphaCountdown);
      if (next.pendingLaunch) next.pendingLaunch = { ...next.pendingLaunch, launchedAt: next.pendingLaunch.launchedAt || now };
      next.at = now;
      st.sphaCountdown = next;
    });
  } catch {
    /* next cron tick retries */
  }
}

async function mintRehearsalPending(now: number): Promise<{
  ok: boolean;
  minted: boolean;
  mint: string;
  error?: string;
}> {
  if (durableConfigured()) {
    return { ok: false, minted: false, mint: "", error: "Local rehearsal only." };
  }
  const mint = Keypair.generate().publicKey.toBase58();
  await mutateState((st) => {
    const next = normalizeSphaCountdown(st.sphaCountdown);
    if (!next.rehearsal) return;
    const row: SphaCountdownLaunch = {
      ...(next.pendingLaunch || {
        network: "devnet",
        name: "Solphia Test",
        symbol: "TESTSPHA",
        supply: SPHA_SUPPLY,
        launchedAt: now,
        sigs: ["rehearsal"],
        allocations: [],
        image: "/spha-mark.png",
        blurb: "Solphia protocol token. Swaps fund listings, buybacks, and burns.",
        website: "https://solphia.io",
      }),
      mint,
      launchedAt: now,
      sigs: ["rehearsal"],
    };
    next.status = "minted";
    next.pendingMint = mint;
    next.pendingSigs = ["rehearsal"];
    next.pendingLaunch = row;
    next.error = undefined;
    next.at = now;
    st.sphaCountdown = next;
    pushBounded(st.audit, audit("admin", "spha_rehearsal_mint", mint), 400);
  });
  return { ok: true, minted: true, mint };
}

export async function rehearseSphaCountdown(now = Date.now()): Promise<{
  ok: boolean;
  error?: string;
  countdown?: ReturnType<typeof countdownForAdmin>;
}> {
  if (durableConfigured()) {
    return { ok: false, error: "Local rehearsal only. Durable store is live." };
  }
  const s = await readyState();
  const cd = normalizeSphaCountdown(s.sphaCountdown);
  const rehearsalMint = Boolean(cd.rehearsal);
  if ((s.sphaMint || "").trim() && !rehearsalMint) {
    return { ok: false, error: "Official $SPHA is already live on this instance." };
  }
  await mutateState((st) => {
    st.sphaMint = "";
    if ((st.sphaLaunch?.symbol || "").toUpperCase() === "TESTSPHA") st.sphaLaunch = undefined;
    st.sphaSocials = {
      x: "https://x.com/solphiaio",
      telegram: "https://t.me/solphiaio",
      discord: "",
      website: "https://solphia.io",
    };
    st.sphaSocialsAt = now;
    st.sphaCountdown = {
      ...emptySphaCountdown(),
      launchAt: now + SPHA_REHEARSAL_MS,
      mintLeadMs: SPHA_REHEARSAL_LEAD_MS,
      armedAt: now,
      status: "armed",
      rehearsal: true,
      pendingLaunch: {
        mint: "",
        network: "devnet",
        name: "Solphia Test",
        symbol: "TESTSPHA",
        supply: SPHA_SUPPLY,
        launchedAt: 0,
        sigs: [],
        allocations: [],
        image: "/spha-mark.png",
        blurb: "Solphia protocol token. Swaps fund listings, buybacks, and burns.",
        website: "https://solphia.io",
      },
      at: now,
    };
    pushBounded(st.audit, audit("admin", "spha_rehearsal", String(now + SPHA_REHEARSAL_MS)), 400);
  });
  const after = await readyState();
  return { ok: true, countdown: countdownForAdmin(after.sphaCountdown, after.sphaMint || "", now) };
}

export async function tickSphaCountdown(now = Date.now()): Promise<{
  ok: boolean;
  phase: string;
  minted: boolean;
  revealed: boolean;
  mint: string;
  needsSigner?: boolean;
  error?: string;
}> {
  const s = await readyState();
  const cd = normalizeSphaCountdown(s.sphaCountdown || emptySphaCountdown());
  const live = (s.sphaMint || "").trim();
  if (live) {
    const revealed = await revealOfficialSpha(now);
    return { ok: true, phase: "live", minted: true, revealed: revealed.revealed, mint: live };
  }
  if (!(cd.launchAt > 0)) {
    return { ok: true, phase: "soon", minted: false, revealed: false, mint: "" };
  }
  let minted = Boolean(cd.pendingMint);
  let mint = cd.pendingMint || "";
  let needsSigner = false;
  let error: string | undefined;
  if (sphaInMintWindow(cd, now) && !minted) {
    const m = await mintOfficialPending(now);
    minted = m.minted;
    mint = m.mint || mint;
    needsSigner = Boolean(m.needsSigner);
    error = m.error;
    if (!m.ok && !m.needsSigner) {
      return { ok: false, phase: "failed", minted: false, revealed: false, mint: "", error };
    }
  }
  if (minted || mint) {
    try {
      await finalizeOfficialPending(now);
    } catch {
      /* reveal still runs */
    }
  }
  let revealed = false;
  if (sphaTimedOut(normalizeSphaCountdown((await readyState()).sphaCountdown), now)) {
    const r = await revealOfficialSpha(now);
    revealed = r.revealed;
    mint = r.mint || mint;
  }
  const after = await readyState();
  const phase = (after.sphaMint || "").trim()
    ? "live"
    : (after.sphaCountdown?.pendingMint || "").trim()
      ? "minted"
      : sphaInMintWindow(after.sphaCountdown, now)
        ? "minting"
        : "counting";
  return { ok: true, phase, minted, revealed, mint, needsSigner, error };
}

export function countdownForAdmin(c: SphaCountdown | null | undefined, publicMint: string, now = Date.now()) {
  const row = normalizeSphaCountdown(c);
  return {
    ...row,
    publicMint: (publicMint || "").trim(),
    mintAt: Math.max(0, row.launchAt - (row.mintLeadMs || 0)),
    remainingMs: row.launchAt > 0 ? Math.max(0, row.launchAt - now) : 0,
    inMintWindow: sphaInMintWindow(row, now),
    timedOut: sphaTimedOut(row, now),
  };
}
