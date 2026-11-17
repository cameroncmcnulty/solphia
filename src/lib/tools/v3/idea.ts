import { createHash } from "node:crypto";
import { tickerLooksReal, tickerOk, type ThemeId } from "../identities";
import { v3HandleOf, v3WebsiteOf } from "./host";
import { worldOf, type WorldLabels, type WorldTheme } from "./world";

export const V3_SUPPLIES = [100_000_000, 200_000_000, 420_000_000, 690_000_000, 1_000_000_000] as const;
export const V3_DECIMALS = 6;

export type V3SliceId = "project" | "dev" | "community" | "treasury" | "lp";

export type V3Slice = {
  id: V3SliceId;
  label: string;
  pct: string;
  bps: number;
  tokens: number;
  note: string;
};

export type V3Theme = WorldTheme;

export type V3Brand = {
  idea: string;
  name: string;
  symbol: string;
  handle: string;
  blurb: string;
  about: string;
  howToBuy: string;
  roadmap: { title: string; body: string }[];
  themeId: ThemeId;
  worldId: string;
  labels: WorldLabels;
  colors: V3Theme;
  website: string;
  supply: number;
  decimals: number;
  slices: V3Slice[];
  curveTokens: number;
  teamTokens: number;
};

function titleCase(word: string): string {
  const w = (word || "").toLowerCase();
  return w ? w[0]!.toUpperCase() + w.slice(1) : "";
}

function compactAlpha(raw: string): string {
  return (raw || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function hash(seed: string): Uint8Array {
  return createHash("sha256").update(seed).digest();
}

function rng(seed: string): () => number {
  const b = hash(seed);
  let i = 0;
  return () => {
    const n = b[i % b.length]!;
    i += 1;
    return n / 255;
  };
}

function pickTicker(idea: string, used: Set<string>): { symbol: string; name: string } {
  const dollar = idea.match(/\$([A-Za-z]{2,10})\b/);
  if (dollar) {
    const t = compactAlpha(dollar[1] || "").slice(0, 10);
    if (tickerLooksReal(t) && !used.has(t)) return { symbol: t, name: titleCase(t) };
  }
  const words = idea
    .replace(/[^a-zA-Z0-9$ ]/g, " ")
    .split(/\s+/)
    .map((w) => compactAlpha(w))
    .filter((w) => tickerLooksReal(w) && !used.has(w));
  if (words[0]) {
    const t = words[0].slice(0, 10);
    return { symbol: t, name: titleCase(t) };
  }
  const mash = compactAlpha(idea).replace(/[0-9]/g, "").slice(0, 10);
  if (tickerLooksReal(mash) && !used.has(mash)) return { symbol: mash, name: titleCase(mash) };
  const letters = compactAlpha(idea).replace(/[0-9]/g, "") || "MEME";
  let t = letters.slice(0, 6);
  if (!tickerOk(t) || used.has(t) || !tickerLooksReal(t)) {
    t = `M${letters.slice(0, 5)}`.slice(0, 10);
    if (!tickerLooksReal(t) || used.has(t)) t = "MEME";
  }
  return { symbol: t, name: titleCase(t) };
}

function pctLabel(bps: number): string {
  const n = bps / 100;
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}%`;
}

function tokensFor(bps: number, supply: number): number {
  return Math.floor((supply * bps) / 10_000);
}

/** One dashboard-controlled project bag at 8.00–11.00%. Rest on the curve. */
export function buildV3Tokenomics(seed: string): { supply: number; slices: V3Slice[]; curveTokens: number; teamTokens: number } {
  const r = rng(`omics:${seed}`);
  const supply = V3_SUPPLIES[Math.floor(r() * V3_SUPPLIES.length)]!;
  const project = 800 + Math.min(300, Math.floor(r() * 301));
  const curve = 10_000 - project;
  const slices: V3Slice[] = [
    {
      id: "project",
      label: "Project",
      bps: project,
      pct: pctLabel(project),
      tokens: tokensFor(project, supply),
      note: "Dashboard-controlled project wallet. Lands at T-30. STOP leaves this bag alone.",
    },
    {
      id: "lp",
      label: "Bonding curve",
      bps: curve,
      pct: pctLabel(curve),
      tokens: tokensFor(curve, supply),
      note: "Tradeable float on Meteora DBC from block one. Same 40→585 curve as $SPHA.",
    },
  ];
  const teamTokens = slices.filter((s) => s.id !== "lp").reduce((n, s) => n + s.tokens, 0);
  const curveTokens = slices.find((s) => s.id === "lp")!.tokens;
  return { supply, slices, curveTokens, teamTokens };
}

function pickWorldTicker(worldTickers: string[], used: Set<string>): string {
  for (const t of worldTickers) {
    const s = compactAlpha(t).slice(0, 10);
    if (tickerOk(s) && !used.has(s)) return s;
  }
  return "";
}

export function buildV3Brand(idea: string, used?: Iterable<string>): V3Brand {
  const raw = (idea || "").trim().slice(0, 280);
  const usedSet = new Set(
    [...(used || [])].map((s) => String(s || "").replace(/^\$/, "").trim().toUpperCase()).filter(Boolean),
  );
  const draftWorld = worldOf(raw);
  const dollar = raw.match(/\$([A-Za-z0-9]{2,10})\b/);
  const dollarTick = dollar ? compactAlpha(dollar[1] || "").slice(0, 10) : "";
  const worldTick = pickWorldTicker(draftWorld.tickers, usedSet);
  const picked = pickTicker(raw || "MEME", usedSet);
  const symbol =
    (dollarTick && tickerOk(dollarTick) && !usedSet.has(dollarTick) && dollarTick) ||
    worldTick ||
    picked.symbol;
  const handle = v3HandleOf(symbol);
  const tickName = draftWorld.brandName || picked.name || symbol;
  const displayName = (draftWorld.brandName || tickName).slice(0, 32);
  const world = worldOf(raw, displayName, symbol);
  const omics = buildV3Tokenomics(`${raw}:${symbol}`);
  const themeId = (world.themeId as ThemeId) || "neon";
  return {
    idea: raw,
    name: displayName,
    symbol,
    handle,
    blurb: world.blurb.slice(0, 220),
    about: world.about,
    howToBuy: world.howToBuy,
    roadmap: world.roadmap,
    themeId,
    worldId: world.id,
    labels: world.labels,
    colors: world.colors,
    website: v3WebsiteOf(symbol),
    supply: omics.supply,
    decimals: V3_DECIMALS,
    slices: omics.slices,
    curveTokens: omics.curveTokens,
    teamTokens: omics.teamTokens,
  };
}
