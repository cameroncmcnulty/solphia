import { createHash } from "node:crypto";
import { tickerLooksReal, tickerOk, themeOf, type ThemeId } from "../identities";
import { v3HandleOf, v3WebsiteOf } from "./host";

export const V3_SUPPLIES = [100_000_000, 200_000_000, 420_000_000, 690_000_000, 1_000_000_000] as const;
export const V3_DECIMALS = 6;

export type V3SliceId = "dev" | "community" | "treasury" | "lp";

export type V3Slice = {
  id: V3SliceId;
  label: string;
  pct: string;
  bps: number;
  tokens: number;
  note: string;
};

export type V3Theme = {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  card: string;
  glow?: string;
  line?: string;
};

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

/** SPHA-shaped tokenomics (dev / community / treasury / curve) with randomized supply and slice sizes. */
export function buildV3Tokenomics(seed: string): { supply: number; slices: V3Slice[]; curveTokens: number; teamTokens: number } {
  const r = rng(`omics:${seed}`);
  const supply = V3_SUPPLIES[Math.floor(r() * V3_SUPPLIES.length)]!;
  const dev = 700 + Math.floor(r() * 251);
  const community = 800 + Math.floor(r() * 301);
  const treasury = 350 + Math.floor(r() * 201);
  const team = dev + community + treasury;
  const curve = 10_000 - team;
  const slices: V3Slice[] = [
    {
      id: "dev",
      label: "Dev team",
      bps: dev,
      pct: pctLabel(dev),
      tokens: tokensFor(dev, supply),
      note: "Team allocation. Minted into an isolated team wallet at T-30.",
    },
    {
      id: "community",
      label: "Community",
      bps: community,
      pct: pctLabel(community),
      tokens: tokensFor(community, supply),
      note: "Community, ecosystem, and rewards. Minted at T-30.",
    },
    {
      id: "treasury",
      label: "Treasury",
      bps: treasury,
      pct: pctLabel(treasury),
      tokens: tokensFor(treasury, supply),
      note: "Growth and marketing. Minted at T-30 into an isolated treasury wallet.",
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

function hueOf(theme: ThemeId, b: number): number {
  const map: Record<string, number> = {
    pepe: 120, frog: 130, cat: 28, dog: 32, ai: 195, robot: 210, space: 250,
    moon: 220, rocket: 12, king: 48, coin: 46, fire: 14, ice: 198, ocean: 205,
    food: 22, anime: 320, game: 280, skull: 0, alien: 110, wolf: 210, bull: 8,
    bear: 24, world: 160, gold: 44, neon: 300, meme: 95, bird: 200, fish: 188,
    dragon: 5, ape: 38,
  };
  return ((map[theme] ?? 280) + (b % 24) - 12 + 360) % 360;
}

function colorsOf(theme: ThemeId, seed: string): V3Theme {
  const h = hueOf(theme, hash(seed)[0]!);
  return {
    bg: `hsl(${h} 28% 6%)`,
    ink: `hsl(${h} 20% 96%)`,
    accent: `hsl(${(h + 18) % 360} 80% 58%)`,
    muted: `hsl(${h} 12% 64%)`,
    card: `hsl(${h} 22% 10%)`,
  };
}

export function buildV3Brand(idea: string, used?: Iterable<string>): V3Brand {
  const raw = (idea || "").trim().slice(0, 280);
  const usedSet = new Set(
    [...(used || [])].map((s) => String(s || "").replace(/^\$/, "").trim().toUpperCase()).filter(Boolean),
  );
  const { symbol, name: tickName } = pickTicker(raw || "MEME", usedSet);
  const handle = v3HandleOf(symbol);
  const themeId = themeOf(raw || symbol);
  const name = raw
    .replace(/\$[A-Za-z]{2,10}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24) || tickName;
  const displayName = name.length >= 2 ? name : tickName;
  const omics = buildV3Tokenomics(`${raw}:${symbol}`);
  const blurb = raw
    ? `${displayName} ($${symbol}) — ${raw.slice(0, 160)}`
    : `${displayName} is a community token on Solana.`;
  return {
    idea: raw,
    name: displayName.slice(0, 32),
    symbol,
    handle,
    blurb: blurb.slice(0, 220),
    about: raw
      ? `${displayName} started as a raw idea: ${raw} The community owns the float on a public Solana bonding curve. Team slices publish on-chain at launch and match this site.`
      : `${displayName} is a Solana memecoin with a live curve and public tokenomics.`,
    howToBuy: `At T-0 the contract address goes live on this site. Open a Solana wallet, fund it with SOL, and swap into $${symbol} on the bonding curve.`,
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve config, team slices, metadata, and a 0.05 SOL opening buy." },
      { title: "Public T-0", body: "The contract address publishes on this website and community trading opens." },
      { title: "Afterglow", body: "1% fee through graduate. Partner LP permanently locked." },
    ],
    themeId,
    colors: colorsOf(themeId, `${symbol}:${raw}`),
    website: v3WebsiteOf(symbol),
    supply: omics.supply,
    decimals: V3_DECIMALS,
    slices: omics.slices,
    curveTokens: omics.curveTokens,
    teamTokens: omics.teamTokens,
  };
}
