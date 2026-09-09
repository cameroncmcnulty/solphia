import type { RiskFactor, RiskReport, TokenSnapshot } from "../types";
import { scoreToken } from "../risk/engine";
import { hasTelegram, hasTwitter } from "../desk/grad";
import { TAPE_BOARD, type TapeCoin } from "./tape";

const COPYCAT = ["SPHA", "SOLPHIA", "SOLANA", "PUMPFUN", "BONK", "WIF", "TRUMP", "LAUNCHCOIN"];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function grade(score: number): RiskReport["grade"] {
  if (score >= 88) return "S";
  if (score >= 78) return "A";
  if (score >= 68) return "B";
  if (score >= 52) return "C";
  if (score >= 32) return "D";
  return "X";
}

function add(factors: RiskFactor[], id: string, label: string, delta: number, detail: string) {
  if (!delta) return;
  factors.push({ id, label, delta, detail });
}

function handleLooksSpam(raw?: string): boolean {
  const h = (raw || "").replace(/^https?:\/\//i, "").replace(/^(www\.)?/i, "").replace(/^(x|twitter)\.com\//i, "").replace(/^@/, "");
  const slug = h.split(/[/?#\s]/)[0] || "";
  if (!slug) return false;
  if (slug.length >= 12 && !/[aeiou]/i.test(slug)) return true;
  if (/(.)\1{3,}/.test(slug)) return true;
  if (/^[0-9_]+$/.test(slug)) return true;
  return false;
}

function handleMatches(symbol: string, name: string, raw?: string): boolean {
  const h = (raw || "").toLowerCase();
  if (!h) return false;
  const tick = symbol.toLowerCase();
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (tick.length >= 3 && h.includes(tick)) || (n.length >= 4 && h.includes(n.slice(0, 8)));
}

function looksCopycat(name: string, symbol: string): boolean {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const n = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return COPYCAT.some((w) => s === w || s.startsWith(w) || n === w || n.includes(w));
}

function looksSpamName(name: string): boolean {
  const t = name.trim();
  if (t.length < 3) return true;
  if (/(.)\1{3,}/.test(t)) return true;
  if (/^[0-9\s$]+$/.test(t)) return true;
  return false;
}

export function toSnapshot(coin: TapeCoin, solUsd: number, now = Date.now()): TokenSnapshot {
  const usd = solUsd > 0 ? solUsd : 0;
  const vol1h = (coin.vol1h ?? 0) * usd;
  const unique = coin.unique1h || 0;
  const buys = coin.buys1h ?? 0;
  const txns1h = coin.txns1h ?? buys + (coin.sells1h ?? 0);
  const organic = unique > 0 && (buys || txns1h) ? clamp(unique / Math.max(buys || txns1h, 1), 0, 1) : undefined;
  return {
    mint: coin.mint || coin.id,
    name: coin.name,
    symbol: coin.symbol,
    image: coin.image,
    venue: "launchlab",
    creator: coin.creator,
    createdAt: coin.createdAt,
    priceUsd: (coin.priceSol || 0) * usd,
    marketCapUsd: coin.marketCapUsd || (coin.marketCapSol || 0) * usd,
    liquidityUsd: (coin.liqSol || coin.realSol || 0) * usd,
    volume5m: (coin.vol5m ?? 0) * usd,
    volume1h: vol1h,
    volume24h: (coin.vol24h ?? coin.volSol ?? 0) * usd,
    txns5m: coin.txns5m ?? 0,
    txns1h,
    buys1h: buys,
    sells1h: coin.sells1h ?? 0,
    uniqueTraders1h: unique,
    priceChange5m: (coin.change5m || 0) * 100,
    priceChange1h: (coin.change1h || 0) * 100,
    priceChange6h: (coin.change6h || 0) * 100,
    priceChange24h: (coin.change24h || 0) * 100,
    bondingProgress: coin.progress || 0,
    graduated: coin.status === "graduated",
    nsfw: false,
    banned: false,
    livestream: false,
    replyCount: 0,
    verified: [coin.links?.x, coin.links?.telegram, coin.links?.website, coin.links?.discord].filter(Boolean).length >= 3,
    socials: {
      twitter: coin.links?.x,
      telegram: coin.links?.telegram,
      website: coin.links?.website,
      discord: coin.links?.discord,
    },
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    lpLockedOrBurned: true,
    top10HolderPct: (coin.holders || 0) >= 8 ? coin.top10HolderPct : undefined,
    bundleRatio: (coin.holders || 0) >= 4 ? coin.bundleRatio : undefined,
    organicBuyRatio: organic,
    devSoldPct: coin.devSoldPct,
    deployerDeathRate: coin.deployerDeathRate,
    deployerTokenCount: coin.deployerTokenCount,
    creatorRecentLaunches: coin.creatorRecentLaunches,
  };
}

export type LaunchAudit = RiskReport & {
  extra: RiskFactor[];
  socials: number;
  elite: boolean;
};

/**
 * Full pad audit: Solphia risk engine (authorities, holders, volume, unique
 * flow, bundle, deployer death, toxic tape, P(grad)) plus project quality —
 * social stack, handle hygiene, art, blurb, copycat tickers, factory wallets,
 * wash, and dumped charts.
 */
export function auditLaunchCoin(coin: TapeCoin, solUsd: number, now = Date.now()): LaunchAudit {
  const snap = toSnapshot(coin, solUsd, now);
  const base = scoreToken(snap, now);
  const extra: RiskFactor[] = [];
  const veto: string[] = [];
  const caps = [...base.caps];
  const hard = (r: string) =>
    /freeze/i.test(r) ||
    /print more/i.test(r) ||
    /banned/i.test(r) ||
    /bundled/i.test(r) ||
    /mostly died/i.test(r) ||
    /sold into the graduation/i.test(r);
  for (const r of base.vetoReasons) {
    if (hard(r)) veto.push(r);
    else caps.push(r);
  }

  const x = hasTwitter(snap.socials.twitter);
  const tg = hasTelegram(snap.socials.telegram);
  const web = Boolean(snap.socials.website && /^https?:\/\//i.test(snap.socials.website));
  const dc = Boolean(snap.socials.discord && /discord/i.test(snap.socials.discord));
  const socials = [x, tg, web, dc].filter(Boolean).length;

  if (socials === 4) add(extra, "stack", "Full social stack", 10, "X, Telegram, Discord, and a site.");
  else if (socials >= 2) add(extra, "stack", "Socials on the coin", 5, `${socials} of 4 channels live.`);
  else if (socials === 0) add(extra, "stack", "No socials", -8, "Throwaway launches skip the page.");

  if (tg) add(extra, "tg", "Telegram on the coin", 6, "Telegram is the strongest public grad lift.");
  if (x) add(extra, "x", "X presence", 3, "Public X handle.");
  if (dc) add(extra, "dc", "Community Discord", 4, "A room to actually talk.");
  if (web) add(extra, "web", "Project site", 3, "They shipped a URL.");

  if (handleLooksSpam(coin.links?.x)) add(extra, "xspam", "X handle looks generated", -6, "Gibberish handles track with throwaways.");
  else if (handleMatches(coin.symbol, coin.name, coin.links?.x)) add(extra, "xfit", "Handle matches the coin", 4, "Branded, not a burner.");

  if (coin.image) add(extra, "art", "Has art", 4, "Square art on the tape.");
  else add(extra, "art", "No art", -3, "No image is a red flag on this pad.");

  const blurb = (coin.blurb || "").trim();
  if (blurb.length >= 24) add(extra, "blurb", "Has a real one-liner", 4, "They wrote more than a ticker.");
  else if (!blurb) add(extra, "blurb", "Empty bio", -2, "No description.");

  if (looksCopycat(coin.name, coin.symbol)) add(extra, "copy", "Copycat ticker", -12, "Clones of known names rarely survive.");
  if (looksSpamName(coin.name) || coin.symbol.length < 3) add(extra, "thin", "Thin name", -4, "Too short or spammy.");

  if (coin.holders <= 1) add(extra, "solo", "Only the creator", -10, "Nobody else holds this.");
  else if (coin.holders >= 12) add(extra, "crowd", "Real holder set", 5, `${coin.holders} wallets.`);

  const recent = coin.creatorRecentLaunches ?? 1;
  if (recent >= 4) {
    add(extra, "factory", "Serial launcher", -14, `${recent} coins from this wallet in 24h.`);
    veto.push("This wallet is spraying coins.");
  } else if (recent >= 2) add(extra, "factory", "Already launched today", -6, `${recent} coins in 24h.`);

  const txns1h = coin.txns1h ?? 0;
  const unique1h = coin.unique1h ?? 0;
  if (txns1h >= 12 && unique1h > 0 && txns1h / unique1h >= 6) {
    add(extra, "wash", "Washy tape", -10, `${txns1h} clips / ${unique1h} wallets.`);
  }

  const spark = coin.spark || [];
  if (spark.length >= 8) {
    const first = spark[0]?.c || 0;
    const last = spark[spark.length - 1]?.c || 0;
    const ageMin = (now - coin.createdAt) / 60_000;
    if (first > 0 && last / first < 0.7 && ageMin > 20) add(extra, "dump", "Chart already dumped", -8, "Tape faded after the open.");
    else if (first > 0 && last / first > 1.15 && unique1h >= 6) add(extra, "bid", "Tape still bid", 5, "Holders are not dumping the spark.");
  }

  if ((coin.progress || 0) >= 0.08 && (coin.progress || 0) <= 0.75 && unique1h >= 8) {
    add(extra, "curve", "Curve filling with people", 6, `${Math.round((coin.progress || 0) * 100)}% bonded · ${unique1h} unique.`);
  }

  if ((coin.devSoldPct || 0) > 0.4) add(extra, "devout", "Creator sold a chunk", -8, `${Math.round((coin.devSoldPct || 0) * 100)}% of the creator stack sold.`);

  let score = 38;
  for (const f of [...base.factors, ...extra]) score += f.delta;
  if (veto.length) score = Math.min(score, 12);
  score = Math.round(clamp(score, 0, 100));
  const g = grade(score);
  const factors = [...base.factors, ...extra];
  const top = [...factors].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const why = veto[0] || top?.detail || base.why;
  const verdict: RiskReport["verdict"] = veto.length || score < 52 ? "skip" : score >= 68 ? "trade" : "wait";

  return {
    ...base,
    score,
    grade: g,
    verdict,
    vetoed: veto.length > 0,
    vetoReasons: veto,
    caps,
    factors,
    summary: verdict === "skip" ? `Skip — ${why}` : verdict === "trade" ? `Take it — ${why}` : `Wait — ${why}`,
    why,
    extra,
    socials,
    elite: score >= 78 && !veto.length,
  };
}

export function rankTape<T extends TapeCoin>(
  coins: T[],
  solUsd: number,
  now = Date.now(),
  board = TAPE_BOARD,
): { coin: T; audit: LaunchAudit; rank: number }[] {
  const scored = coins.map((coin) => ({ coin, audit: auditLaunchCoin(coin, solUsd, now) }));
  scored.sort((a, b) => {
    if (a.audit.vetoed !== b.audit.vetoed) return a.audit.vetoed ? 1 : -1;
    if (b.audit.score !== a.audit.score) return b.audit.score - a.audit.score;
    const va = a.coin.vol1h ?? a.coin.volSol ?? 0;
    const vb = b.coin.vol1h ?? b.coin.volSol ?? 0;
    if (vb !== va) return vb - va;
    return b.coin.createdAt - a.coin.createdAt;
  });
  return scored.slice(0, board).map((row, i) => ({ ...row, rank: i + 1 }));
}
