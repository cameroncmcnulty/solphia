import { getText } from "../feeds/http";
import type { Holding, WalletStats } from "./quality";

const MINT_RE = /\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/g;

function usd(raw: string): number | null {
  const t = raw.replace(/,/g, "").toUpperCase();
  const m = t.match(/([0-9.]+)\s*([KMB])?/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const mul = m[2] === "B" ? 1e9 : m[2] === "M" ? 1e6 : m[2] === "K" ? 1e3 : 1;
  return n * mul;
}

function num(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function parseKolHtml(html: string): Omit<WalletStats, "handle" | "slug" | "address"> {
  const p7 = html.match(/7D PnL[\s\S]{0,40}?\$([\d,.]+)\s*([KMB])?/i);
  const p30 = html.match(/30D PnL[\s\S]{0,40}?\$([\d,.]+)\s*([KMB])?/i);
  const wrBlock = html.match(/WR 7D[\s\S]{0,80}?([0-9.]+)\s*%\s*[·.]\s*([0-9.]+)\s*%/i);
  const wr7 = wrBlock ? Number(wrBlock[1]) : Number(html.match(/Win rate \(7d\)[\s\S]{0,40}?([0-9.]+)\s*%/i)?.[1]);
  const trades = num(html.match(/Trades \(7d\)[\s\S]{0,40}?([\d,]+)/i)?.[1]);
  const tokens = num(html.match(/Tokens traded[\s\S]{0,40}?([\d,]+)/i)?.[1]);
  const avg = html.match(/Avg trade size[\s\S]{0,40}?\$([\d,.]+)/i);
  const worst = html.match(/Worst trade[\s\S]{0,500}?[–\-−]\s*\$([\d,.]+)/i);

  const holdIdx = html.search(/Current Holdings/i);
  const tradeIdx = html.search(/Latest trades/i);
  const holdHtml = holdIdx >= 0 ? html.slice(holdIdx, tradeIdx > holdIdx ? tradeIdx : undefined) : "";
  const holdings = parseHoldings(holdHtml || html);

  return {
    pnl7d: p7 ? usd(p7[1] + (p7[2] || "")) || 0 : 0,
    pnl30d: p30 ? usd(p30[1] + (p30[2] || "")) || 0 : 0,
    winRate: Number.isFinite(wr7) ? wr7 : 0,
    winRate1d: wrBlock ? Number(wrBlock[2]) : undefined,
    trades7d: trades,
    tokens7d: tokens,
    avgTradeUsd: avg ? usd(avg[1]) || undefined : undefined,
    worstTradeUsd: worst ? -(usd(worst[1]) || 0) : undefined,
    holdings,
  };
}

export function parseHoldings(html: string): Holding[] {
  const out: Holding[] = [];
  const seen = new Set<string>();
  const re = /Holding\s+(\d+)%[\s\S]{0,500}?\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/gi;
  for (const m of html.matchAll(re)) {
    const mint = m[2];
    if (seen.has(mint)) continue;
    seen.add(mint);
    const chunk = m[0];
    const mcap = chunk.match(/\$([\d,.]+)\s*([KMB])?\s*MC/i);
    const age = chunk.match(/⏱\s*(\d+)\s*(min|h|d)/i);
    let ageMin: number | undefined;
    if (age) {
      const n = Number(age[1]);
      ageMin = age[2] === "d" ? n * 1440 : age[2] === "h" ? n * 60 : n;
    }
    out.push({
      mint,
      holdPct: Number(m[1]),
      mcapUsd: mcap ? usd(mcap[1] + (mcap[2] || "")) || undefined : undefined,
      ageMin,
    });
  }
  if (!out.length) {
    for (const m of html.matchAll(MINT_RE)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      out.push({ mint: m[1] });
    }
  }
  return out.slice(0, 24);
}

export function parseTradeMints(html: string): string[] {
  const tradeIdx = html.search(/Latest trades/i);
  const slice = tradeIdx >= 0 ? html.slice(tradeIdx) : html;
  const found: string[] = [];
  for (const m of slice.matchAll(MINT_RE)) {
    if (!found.includes(m[1])) found.push(m[1]);
  }
  return found.slice(0, 16);
}

export async function scrapeKol(slug: string): Promise<ReturnType<typeof parseKolHtml> & { html?: string } | null> {
  const page = await getText(`https://kolexplorer.com/kol/${slug}`, 7000);
  if (!page.ok || !page.data) return null;
  return { ...parseKolHtml(page.data), html: page.data };
}
