export type WalletStyle = "sniper" | "post_grad" | "narrative_hold" | "exit_liquidity" | "measured";
export type WalletStatus = "copying" | "cooling" | "clustered" | "watching";

export interface Holding {
  mint: string;
  symbol?: string;
  holdPct?: number;
  mcapUsd?: number;
  ageMin?: number;
}

export interface WalletStats {
  handle: string;
  slug: string;
  address: string;
  pnl7d: number;
  pnl30d: number;
  winRate: number;
  winRate1d?: number;
  trades7d?: number;
  tokens7d?: number;
  avgTradeUsd?: number;
  worstTradeUsd?: number;
  holdings: Holding[];
  tradeMints?: string[];
}

export interface WalletQuality extends WalletStats {
  style: WalletStyle;
  styleLabel: string;
  medianHoldMin?: number;
  maxDrawdownPct: number;
  decay: number;
  stillGood: boolean;
  clusteredWith: string[];
  quality: number;
  afterFeeUsd: number;
  copied: boolean;
  status: WalletStatus;
  why: string;
}

export const ROUND_TRIP_DRAG = 0.016;
export const MIN_COPY_QUALITY = 64;
export const MIN_COPY_WINRATE = 50;
export const CLUSTER_JACCARD = 0.55;

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** 1 = this week's PnL matches a 30-day pace. <<1 means the wallet went cold. */
export function weekDecay(pnl7d: number, pnl30d: number): number {
  if (pnl7d <= 0) return 0;
  if (pnl30d <= 0) return 1;
  const expected = pnl30d * (7 / 30);
  if (expected <= 0) return 1;
  return clamp(pnl7d / expected, 0, 1.6) / 1.6;
}

export function stillGoodThisWeek(s: Pick<WalletStats, "pnl7d" | "pnl30d" | "winRate">): boolean {
  if (s.pnl7d <= 0) return false;
  if (s.winRate < MIN_COPY_WINRATE) return false;
  return weekDecay(s.pnl7d, s.pnl30d) >= 0.35;
}

export function medianHoldMin(holdings: Holding[]): number | undefined {
  const ages = holdings.map((h) => h.ageMin).filter((n): n is number => n != null && n >= 0);
  if (!ages.length) return undefined;
  ages.sort((a, b) => a - b);
  return ages[Math.floor(ages.length / 2)];
}

export function drawdownPct(s: Pick<WalletStats, "pnl7d" | "worstTradeUsd">): number {
  if (!s.worstTradeUsd || s.worstTradeUsd >= 0) return 0;
  const base = Math.max(Math.abs(s.pnl7d), Math.abs(s.worstTradeUsd), 1);
  return clamp((Math.abs(s.worstTradeUsd) / base) * 100, 0, 100);
}

export function tagStyle(s: WalletStats): WalletStyle {
  const hold = medianHoldMin(s.holdings);
  if ((s.trades7d || 0) >= 2000 || (hold != null && hold < 25)) return "sniper";
  if (hold != null && hold >= 24 * 60) return "narrative_hold";
  if (s.winRate < 46 && s.pnl7d > 0) return "exit_liquidity";
  if ((s.tokens7d || 0) > 0 && (s.trades7d || 0) / (s.tokens7d || 1) < 3 && (hold || 0) > 90) return "post_grad";
  return "measured";
}

export const STYLE_LABEL: Record<WalletStyle, string> = {
  sniper: "Sniper",
  post_grad: "Post-grad",
  narrative_hold: "Narrative hold",
  exit_liquidity: "Exit-liquidity hunter",
  measured: "Measured",
};

/** $1,000 following this wallet for 7 days after Solphia's 0.35% fee + copy slippage. */
export function afterFeeUsdOn1k(s: WalletStats): number {
  const drag = ROUND_TRIP_DRAG;
  const turnover = (s.trades7d || 0) * (s.avgTradeUsd || 0);
  if (turnover > 1000 && s.pnl7d) {
    const roi = s.pnl7d / turnover;
    const ourTrades = clamp(Math.round((s.trades7d || 0) * 0.04), 4, 18);
    const size = 50;
    return Math.round((roi * ourTrades * size - ourTrades * size * drag) * 100) / 100;
  }
  const slice = s.pnl7d > 0 ? s.pnl7d * 0.0025 : s.pnl7d * 0.01;
  return Math.round((slice - 12) * 100) / 100;
}

export function qualityScore(s: WalletStats, clustered: boolean): number {
  let q = 42;
  q += clamp((s.winRate - 50) * 1.5, -24, 24);
  q += weekDecay(s.pnl7d, s.pnl30d) * 22;
  if (s.pnl7d > 50_000) q += 10;
  else if (s.pnl7d > 5_000) q += 6;
  else if (s.pnl7d > 0) q += 2;
  else q -= 18;
  q -= drawdownPct(s) * 0.22;
  if (clustered) q -= 14;
  if ((s.winRate1d || 0) > 0 && (s.winRate1d || 0) < 40) q -= 8;
  return Math.round(clamp(q, 0, 100));
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / new Set([...A, ...B]).size;
}

export function detectClusters(rows: WalletStats[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const w of rows) out.set(w.handle, []);
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i].holdings.map((h) => h.mint).filter(Boolean);
    if (a.length < 4) continue;
    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j].holdings.map((h) => h.mint).filter(Boolean);
      if (b.length < 4) continue;
      if (jaccard(a, b) < CLUSTER_JACCARD) continue;
      out.get(rows[i].handle)!.push(rows[j].handle);
      out.get(rows[j].handle)!.push(rows[i].handle);
    }
  }
  return out;
}

export function gradeWallets(rows: WalletStats[]): WalletQuality[] {
  const clusters = detectClusters(rows);
  const prelim = rows.map((s) => {
    const clusteredWith = clusters.get(s.handle) || [];
    const style = tagStyle(s);
    const decay = weekDecay(s.pnl7d, s.pnl30d);
    const stillGood = stillGoodThisWeek(s);
    const quality = qualityScore(s, clusteredWith.length > 0);
    return { s, style, decay, stillGood, quality, clusteredWith };
  });

  const bestInCluster = new Map<string, number>();
  for (const p of prelim) {
    if (!p.clusteredWith.length) continue;
    const names = [p.s.handle, ...p.clusteredWith];
    const best = Math.max(...names.map((n) => prelim.find((x) => x.s.handle === n)?.quality || 0));
    bestInCluster.set(p.s.handle, best);
  }

  return prelim
    .map((p) => {
      const isLeader = !p.clusteredWith.length || p.quality >= (bestInCluster.get(p.s.handle) || 0);
      const clusteredBlock = p.clusteredWith.length > 0 && !isLeader;
      let status: WalletStatus = "watching";
      let copied = false;
      let why: string;
      if (p.s.winRate < MIN_COPY_WINRATE) {
        why = `Win rate ${p.s.winRate.toFixed(0)}% is below ${MIN_COPY_WINRATE}% after fees.`;
      } else if (!p.stillGood) {
        status = "cooling";
        why = "Hot on 30d, quiet this week — she waits.";
      } else if (clusteredBlock) {
        status = "clustered";
        why = `Same bag as ${p.clusteredWith[0]} — she copies the better book.`;
      } else if (p.quality < MIN_COPY_QUALITY) {
        why = `Quality ${p.quality} is under ${MIN_COPY_QUALITY}.`;
      } else {
        copied = true;
        status = "copying";
        why = `Quality ${p.quality}. ${STYLE_LABEL[p.style]}. Still printing this week.`;
      }
      return {
        ...p.s,
        style: p.style,
        styleLabel: STYLE_LABEL[p.style],
        medianHoldMin: medianHoldMin(p.s.holdings),
        maxDrawdownPct: Math.round(drawdownPct(p.s)),
        decay: Math.round(p.decay * 100) / 100,
        stillGood: p.stillGood,
        clusteredWith: p.clusteredWith,
        quality: p.quality,
        afterFeeUsd: afterFeeUsdOn1k(p.s),
        copied,
        status,
        why,
      };
    })
    .sort((a, b) => b.quality - a.quality || b.pnl7d - a.pnl7d);
}

export function fromCopyWallet(
  w: { handle: string; slug: string; address: string; pnl7d: number; pnl30d: number; winRate: number },
  extra: Partial<WalletStats> = {},
): WalletStats {
  return {
    handle: w.handle,
    slug: w.slug,
    address: w.address,
    pnl7d: w.pnl7d,
    pnl30d: w.pnl30d,
    winRate: w.winRate,
    holdings: [],
    ...extra,
  };
}
