import { isSolanaAddress } from "../security";
import {
  ANTI_SNIPE_MS,
  ANTI_SNIPE_SOL,
  CURVE_SALE,
  DEV_BUY_MAX_SOL,
  emptyCurve,
  graduatePool,
  marketCapSol,
  MAX_WALLET_BPS,
  MIN_TRADE_SOL,
  progressPct,
  quoteBuy,
  quoteSell,
  spotPriceSol,
  TOKEN_SUPPLY,
  type CurveState,
} from "./curve";

export type LaunchStatus = "curve" | "graduated";

export type LaunchHolder = {
  owner: string;
  tokens: number;
  spentSol: number;
  receivedSol: number;
};

export type LaunchFill = {
  id: string;
  at: number;
  owner: string;
  side: "buy" | "sell";
  sol: number;
  tokens: number;
  feeSol: number;
  priceSol: number;
};

export type LaunchLinks = {
  website?: string;
  x?: string;
  telegram?: string;
  discord?: string;
};

export type LaunchCoin = {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  blurb: string;
  links: LaunchLinks;
  mintAuthority: "revoked";
  freezeAuthority: "revoked";
  creator: string;
  createdAt: number;
  curve: CurveState;
  status: LaunchStatus;
  holders: Record<string, LaunchHolder>;
  fills: LaunchFill[];
  devRewardsSol: number;
  ownerFeesSol: number;
  treasuryFeesSol: number;
  graduatedAt?: number;
  pool?: { sol: number; tokens: number };
};

export type LaunchBook = {
  coins: LaunchCoin[];
  ownerWallet: string;
  ownerEarningsSol: number;
  treasuryFeesSol: number;
};

export function emptyLaunchBook(): LaunchBook {
  return { coins: [], ownerWallet: "", ownerEarningsSol: 0, treasuryFeesSol: 0 };
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function tickerOk(s: string): boolean {
  return /^[A-Z0-9]{2,10}$/.test(s);
}

function nameOk(s: string): boolean {
  return s.trim().length >= 2 && s.trim().length <= 24;
}

function cleanLink(raw?: string, kind?: "website" | "x" | "telegram" | "discord"): string {
  const s = (raw || "").trim().slice(0, 160);
  if (!s) return "";
  if (kind === "x") {
    const h = s.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) return "";
    return `https://x.com/${h}`;
  }
  if (kind === "telegram") {
    const h = s.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "").replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{3,32}$/.test(h)) return "";
    return `https://t.me/${h}`;
  }
  if (kind === "discord") {
    if (/^https?:\/\/(discord\.gg|discord\.com\/invite)\//i.test(s)) return s.split("?")[0];
    if (/^[A-Za-z0-9-]{3,32}$/.test(s)) return `https://discord.gg/${s}`;
    return "";
  }
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.toString().slice(0, 160);
  } catch {
    return "";
  }
}

function imageOk(raw?: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(s)) return "";
  if (s.length > 280_000) return "";
  return s;
}

export function publicCoin(c: LaunchCoin, solUsd = 0, viewer?: string) {
  const px = spotPriceSol(c.curve);
  return {
    id: c.id,
    mint: c.mint,
    name: c.name,
    symbol: c.symbol,
    image: c.image || "",
    blurb: c.blurb,
    links: c.links || {},
    mintAuthority: "revoked" as const,
    freezeAuthority: "revoked" as const,
    creator: c.creator,
    createdAt: c.createdAt,
    status: c.status,
    priceSol: px,
    marketCapSol: marketCapSol(c.curve),
    marketCapUsd: solUsd > 0 ? marketCapSol(c.curve) * solUsd : 0,
    progress: progressPct(c.curve),
    realSol: c.curve.realSol,
    tokensSold: c.curve.tokensSold,
    holders: Object.keys(c.holders).length,
    fills: c.fills.slice(-24).reverse(),
    devRewardsSol: c.devRewardsSol,
    graduatedAt: c.graduatedAt || null,
    myTokens: viewer ? c.holders[viewer]?.tokens || 0 : 0,
  };
}

export function createCoin(
  book: LaunchBook,
  opts: {
    creator: string;
    name: string;
    symbol: string;
    blurb?: string;
    image?: string;
    website?: string;
    x?: string;
    telegram?: string;
    discord?: string;
    launchBuySol?: number;
    now?: number;
  },
): { ok: true; coin: LaunchCoin } | { ok: false; error: string } {
  if (!isSolanaAddress(opts.creator)) return { ok: false, error: "bad_wallet" };
  const name = opts.name.trim();
  const symbol = opts.symbol.trim().toUpperCase();
  if (!nameOk(name)) return { ok: false, error: "bad_name" };
  if (!tickerOk(symbol)) return { ok: false, error: "bad_ticker" };
  if (book.coins.some((c) => c.symbol === symbol && c.status === "curve")) {
    return { ok: false, error: "ticker_taken" };
  }
  const img = imageOk(opts.image);
  if (opts.image && !img) return { ok: false, error: "bad_image" };
  const launchBuy = Math.max(0, Number(opts.launchBuySol) || 0);
  if (launchBuy && launchBuy > DEV_BUY_MAX_SOL) return { ok: false, error: "dev_buy_cap" };
  const now = opts.now || Date.now();
  const mint = `curve:${symbol}:${now.toString(36)}`;
  const coin: LaunchCoin = {
    id: id("ln"),
    mint,
    name,
    symbol,
    image: img,
    blurb: (opts.blurb || "").slice(0, 280),
    links: {
      website: cleanLink(opts.website, "website") || undefined,
      x: cleanLink(opts.x, "x") || undefined,
      telegram: cleanLink(opts.telegram, "telegram") || undefined,
      discord: cleanLink(opts.discord, "discord") || undefined,
    },
    mintAuthority: "revoked",
    freezeAuthority: "revoked",
    creator: opts.creator,
    createdAt: now,
    curve: emptyCurve(),
    status: "curve",
    holders: {},
    fills: [],
    devRewardsSol: 0,
    ownerFeesSol: 0,
    treasuryFeesSol: 0,
  };
  book.coins.unshift(coin);
  if (book.coins.length > 120) book.coins.length = 120;
  if (launchBuy >= MIN_TRADE_SOL) {
    const bought = buyCoin(book, { id: coin.id, owner: opts.creator, sol: launchBuy, now, skipSnipe: true });
    if (!bought.ok) return bought;
    return { ok: true, coin: bought.coin };
  }
  return { ok: true, coin };
}

function holderOf(coin: LaunchCoin, owner: string): LaunchHolder {
  const h = coin.holders[owner];
  if (h) return h;
  const n = { owner, tokens: 0, spentSol: 0, receivedSol: 0 };
  coin.holders[owner] = n;
  return n;
}

function creditFees(book: LaunchBook, coin: LaunchCoin, split: { dev: number; owner: number; treasury: number }) {
  coin.devRewardsSol += split.dev;
  coin.ownerFeesSol += split.owner;
  coin.treasuryFeesSol += split.treasury;
  book.ownerEarningsSol += split.owner;
  book.treasuryFeesSol += split.treasury;
}

function maybeGraduate(coin: LaunchCoin, now: number) {
  if (coin.curve.phase !== "graduated" || coin.status === "graduated") return;
  const pool = graduatePool(coin.curve);
  coin.status = "graduated";
  coin.graduatedAt = now;
  if (pool) coin.pool = pool;
}

export function buyCoin(
  book: LaunchBook,
  opts: { id: string; owner: string; sol: number; now?: number; skipSnipe?: boolean },
): { ok: true; fill: LaunchFill; coin: LaunchCoin } | { ok: false; error: string } {
  if (!isSolanaAddress(opts.owner)) return { ok: false, error: "bad_wallet" };
  const coin = book.coins.find((c) => c.id === opts.id);
  if (!coin) return { ok: false, error: "not_found" };
  if (coin.status !== "curve") return { ok: false, error: "graduated" };
  const now = opts.now || Date.now();
  if (!opts.skipSnipe && now - coin.createdAt < ANTI_SNIPE_MS && opts.sol > ANTI_SNIPE_SOL) {
    return { ok: false, error: "anti_snipe" };
  }
  const q = quoteBuy(coin.curve, opts.sol);
  if (!q.ok) return q;
  const h = holderOf(coin, opts.owner);
  const nextTokens = h.tokens + (q.tokensOut || 0);
  if (nextTokens > (TOKEN_SUPPLY * MAX_WALLET_BPS) / 10_000) return { ok: false, error: "wallet_cap" };
  if (nextTokens > CURVE_SALE) return { ok: false, error: "wallet_cap" };
  coin.curve = q.newCurve;
  h.tokens = nextTokens;
  h.spentSol += opts.sol;
  creditFees(book, coin, q.split);
  const fill: LaunchFill = {
    id: id("lf"),
    at: now,
    owner: opts.owner,
    side: "buy",
    sol: opts.sol,
    tokens: q.tokensOut || 0,
    feeSol: q.feeSol,
    priceSol: q.priceSol,
  };
  coin.fills.push(fill);
  if (coin.fills.length > 200) coin.fills.splice(0, coin.fills.length - 200);
  maybeGraduate(coin, now);
  return { ok: true, fill, coin };
}

export function sellCoin(
  book: LaunchBook,
  opts: { id: string; owner: string; tokens: number; now?: number },
): { ok: true; fill: LaunchFill; coin: LaunchCoin } | { ok: false; error: string } {
  if (!isSolanaAddress(opts.owner)) return { ok: false, error: "bad_wallet" };
  const coin = book.coins.find((c) => c.id === opts.id);
  if (!coin) return { ok: false, error: "not_found" };
  if (coin.status !== "curve") return { ok: false, error: "graduated" };
  const h = holderOf(coin, opts.owner);
  if (opts.tokens > h.tokens + 1e-9) return { ok: false, error: "not_enough" };
  const q = quoteSell(coin.curve, opts.tokens);
  if (!q.ok) return q;
  const now = opts.now || Date.now();
  coin.curve = q.newCurve;
  h.tokens = Math.max(0, h.tokens - opts.tokens);
  h.receivedSol += q.solOut || 0;
  creditFees(book, coin, q.split);
  const fill: LaunchFill = {
    id: id("lf"),
    at: now,
    owner: opts.owner,
    side: "sell",
    sol: q.solOut || 0,
    tokens: opts.tokens,
    feeSol: q.feeSol,
    priceSol: q.priceSol,
  };
  coin.fills.push(fill);
  if (coin.fills.length > 200) coin.fills.splice(0, coin.fills.length - 200);
  return { ok: true, fill, coin };
}

export function withdrawDev(
  book: LaunchBook,
  opts: { id: string; owner: string },
): { ok: true; sol: number } | { ok: false; error: string } {
  const coin = book.coins.find((c) => c.id === opts.id);
  if (!coin) return { ok: false, error: "not_found" };
  if (coin.creator !== opts.owner) return { ok: false, error: "not_creator" };
  const sol = coin.devRewardsSol;
  if (!(sol > 0)) return { ok: false, error: "empty" };
  coin.devRewardsSol = 0;
  return { ok: true, sol };
}

export function withdrawOwner(book: LaunchBook, opts: { owner: string }): { ok: true; sol: number } | { ok: false; error: string } {
  if (!book.ownerWallet || book.ownerWallet !== opts.owner) return { ok: false, error: "not_owner" };
  const sol = book.ownerEarningsSol;
  if (!(sol > 0)) return { ok: false, error: "empty" };
  book.ownerEarningsSol = 0;
  return { ok: true, sol };
}

export function setOwnerWallet(book: LaunchBook, wallet: string) {
  if (wallet && !isSolanaAddress(wallet)) return { ok: false as const, error: "bad_wallet" };
  book.ownerWallet = wallet;
  return { ok: true as const };
}

export function quotePreview(coin: LaunchCoin, side: "buy" | "sell", amount: number) {
  if (side === "buy") return quoteBuy(coin.curve, amount);
  const tokens = amount;
  return quoteSell(coin.curve, tokens);
}

export { MIN_TRADE_SOL };
