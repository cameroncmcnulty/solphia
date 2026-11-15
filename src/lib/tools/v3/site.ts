import { createHash } from "node:crypto";
import { XAI_API_KEY, XAI_BASE, XAI_MODEL } from "../../config";
import type { V3Brand, V3Theme } from "./idea";

export const V3_LAYOUTS = ["cinema", "terminal", "studio", "neon", "glass", "brutal", "orbital", "pulse"] as const;
export type V3Layout = (typeof V3_LAYOUTS)[number];
export type V3Motion = "particles" | "grid" | "aurora" | "orbit" | "scan" | "wave";

export type V3Fonts = { display: string; body: string; mono: string; href: string };

export type V3SiteKit = {
  layout: V3Layout;
  motion: V3Motion;
  fonts: V3Fonts;
  colors: V3Theme;
  tagline: string;
  manifesto: string;
  lore: string;
  community: string;
  warning: string;
  features: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  buySteps: { n: string; title: string; body: string }[];
  stats: { k: string; v: string }[];
  artPrompt: string;
  heroPrompt: string;
};

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

function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length) % items.length]!;
}

const FONTS: Record<V3Layout, V3Fonts> = {
  cinema: {
    display: "Cinzel",
    body: "Outfit",
    mono: "IBM Plex Mono",
    href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=IBM+Plex+Mono:wght@400;600&family=Outfit:wght@300;400;600;800&display=swap",
  },
  terminal: {
    display: "Share Tech Mono",
    body: "IBM Plex Sans",
    mono: "Share Tech Mono",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600;700&family=Share+Tech+Mono&display=swap",
  },
  studio: {
    display: "Playfair Display",
    body: "Manrope",
    mono: "IBM Plex Mono",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Manrope:wght@300;400;600;800&family=Playfair+Display:wght@500;700;900&display=swap",
  },
  neon: {
    display: "Orbitron",
    body: "Exo 2",
    mono: "Orbitron",
    href: "https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;800&family=Orbitron:wght@500;700;900&display=swap",
  },
  glass: {
    display: "Syne",
    body: "DM Sans",
    mono: "IBM Plex Mono",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600;800&family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@500;700;800&display=swap",
  },
  brutal: {
    display: "Anton",
    body: "Space Grotesk",
    mono: "Space Grotesk",
    href: "https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@300;400;600;700&display=swap",
  },
  orbital: {
    display: "Audiowide",
    body: "Rajdhani",
    mono: "Rajdhani",
    href: "https://fonts.googleapis.com/css2?family=Audiowide&family=Rajdhani:wght@400;500;600;700&display=swap",
  },
  pulse: {
    display: "Bungee",
    body: "Barlow",
    mono: "Barlow Condensed",
    href: "https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;600;800&family=Barlow+Condensed:wght@500;700&family=Bungee&display=swap",
  },
};

const MOTION: Record<V3Layout, V3Motion> = {
  cinema: "aurora",
  terminal: "scan",
  studio: "particles",
  neon: "grid",
  glass: "aurora",
  brutal: "scan",
  orbital: "orbit",
  pulse: "wave",
};

type Palette = V3Theme;

function nichePalette(theme: string, r: () => number): Palette {
  const palettes: Record<string, Palette[]> = {
    dog: [
      { bg: "#0c0a08", ink: "#f6ead2", accent: "#e8b84a", muted: "#b7a078", card: "#18140f", glow: "#e8b84a", line: "#3a3020" },
      { bg: "#140e0a", ink: "#fff6e8", accent: "#ff7a18", muted: "#c9a88a", card: "#22180f", glow: "#ff7a18", line: "#4a3220" },
    ],
    cat: [
      { bg: "#120814", ink: "#fde8ff", accent: "#ff4d9a", muted: "#c9a0c0", card: "#1c101c", glow: "#ff4d9a", line: "#3a2438" },
      { bg: "#0b0b10", ink: "#f4f0ff", accent: "#c9a227", muted: "#b8b0c8", card: "#16141c", glow: "#c9a227", line: "#2e2a38" },
    ],
    frog: [
      { bg: "#06140a", ink: "#e8ffe8", accent: "#7CFF4D", muted: "#8fbf90", card: "#0c1c10", glow: "#7CFF4D", line: "#1e3a22" },
    ],
    pepe: [
      { bg: "#07140a", ink: "#e9ffd8", accent: "#9dff4a", muted: "#9cbf88", card: "#0e1c10", glow: "#9dff4a", line: "#24401c" },
    ],
    ai: [
      { bg: "#05070d", ink: "#e8f6ff", accent: "#3ce7ff", muted: "#7aa0b8", card: "#0b1220", glow: "#3ce7ff", line: "#1a2a40" },
      { bg: "#07060f", ink: "#f0e8ff", accent: "#b07cff", muted: "#9a90c0", card: "#120e1c", glow: "#b07cff", line: "#2a2040" },
    ],
    robot: [
      { bg: "#0a0c10", ink: "#e8eef6", accent: "#7aa4ff", muted: "#8a96aa", card: "#12161e", glow: "#7aa4ff", line: "#243044" },
    ],
    space: [
      { bg: "#05040c", ink: "#f0ecff", accent: "#8b6cff", muted: "#9a94c0", card: "#0e0c18", glow: "#8b6cff", line: "#262040" },
    ],
    moon: [
      { bg: "#07080e", ink: "#eef2ff", accent: "#cfd8ff", muted: "#9aa4c0", card: "#10141c", glow: "#9eb0ff", line: "#242a3c" },
    ],
    rocket: [
      { bg: "#100606", ink: "#ffe8e0", accent: "#ff4d2a", muted: "#c09080", card: "#1c0c0c", glow: "#ff4d2a", line: "#3a1814" },
    ],
    gold: [
      { bg: "#0c0a06", ink: "#fff4d2", accent: "#f0c14a", muted: "#c4b07a", card: "#16120a", glow: "#f0c14a", line: "#3a3018" },
    ],
    fire: [
      { bg: "#120604", ink: "#ffe8d8", accent: "#ff6a1a", muted: "#c89878", card: "#1c0c08", glow: "#ff6a1a", line: "#3a2014" },
    ],
    ice: [
      { bg: "#061018", ink: "#e8f8ff", accent: "#6ad4ff", muted: "#88b0c4", card: "#0a1820", glow: "#6ad4ff", line: "#1c3440" },
    ],
    ocean: [
      { bg: "#041018", ink: "#e4f6ff", accent: "#1ec8c8", muted: "#7aa8b8", card: "#0a1a22", glow: "#1ec8c8", line: "#1a3840" },
    ],
    anime: [
      { bg: "#120814", ink: "#ffe8f4", accent: "#ff5ad5", muted: "#c8a0b8", card: "#1c101c", glow: "#ff5ad5", line: "#3a2438" },
    ],
    dragon: [
      { bg: "#100606", ink: "#ffe8d8", accent: "#ff3b2a", muted: "#c09078", card: "#1a0c0a", glow: "#ff3b2a", line: "#3a1814" },
    ],
    ape: [
      { bg: "#120c08", ink: "#f6ead8", accent: "#e07a2a", muted: "#b89870", card: "#1c1410", glow: "#e07a2a", line: "#3a2a1c" },
    ],
    skull: [
      { bg: "#080808", ink: "#f2f2f0", accent: "#ff2a4a", muted: "#9a9a94", card: "#121212", glow: "#ff2a4a", line: "#2a2a2a" },
    ],
    neon: [
      { bg: "#06080e", ink: "#e8fff4", accent: "#39ff9a", muted: "#7ab8a0", card: "#0c1218", glow: "#39ff9a", line: "#1c3030" },
    ],
  };
  const list = palettes[theme] || palettes.neon!;
  return pick(r, list);
}

function subjectOf(idea: string, name: string, theme: string): string {
  const raw = (idea || name || "a memecoin mascot").trim();
  if (raw.length > 8) return raw.slice(0, 180);
  const map: Record<string, string> = {
    dog: "a charismatic street dog wearing drip",
    cat: "a stylish cat with cosmic eyes",
    frog: "a legendary internet frog in streetwear",
    pepe: "a legendary internet frog in streetwear",
    ai: "a luminous AI entity made of glass and circuitry",
    robot: "a chrome robot idol with a human smirk",
    space: "an astronaut mascot floating above a neon planet",
    moon: "a lunar mascot standing on a silver crater",
    rocket: "a retro rocket mascot blasting off",
    gold: "a golden idol dripping molten metal",
    dragon: "a compact dragon coiled around a coin",
    ape: "a fashion ape in a heavy gold chain",
    skull: "a jeweled skull mascot with a grin",
    anime: "an anime hero mascot with electric hair",
  };
  return map[theme] || `a unique mascot for ${name}`;
}

export function artPromptOf(brand: Pick<V3Brand, "idea" | "name" | "symbol" | "themeId">): string {
  const subject = subjectOf(brand.idea, brand.name, brand.themeId);
  return `${subject} fills a square close-up as a gallery mascot portrait. Ultra-detailed cinematic 3D, tactile materials, sharp rim light, shallow depth of field, museum lighting. Square 1:1 composition. No text, no letters, no watermark, no UI.`;
}

export function heroPromptOf(brand: Pick<V3Brand, "idea" | "name" | "symbol" | "themeId">): string {
  const subject = subjectOf(brand.idea, brand.name, brand.themeId);
  return `${subject} stands inside a world built for this niche, wide IMAX still, volumetric atmosphere, anamorphic bokeh, dramatic key light. Premium motion-picture frame, 16:9. No text, no letters, no UI, no watermark.`;
}

function fmtSupply(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  return n.toLocaleString();
}

export function buildV3SiteKit(brand: V3Brand): V3SiteKit {
  const r = rng(`site:${brand.symbol}:${brand.idea}`);
  const layout = pick(r, V3_LAYOUTS);
  const colors = nichePalette(brand.themeId, r);
  const tick = `$${brand.symbol}`;
  const name = brand.name;
  const idea = brand.idea || name;
  const supply = fmtSupply(brand.supply);
  const features = [
    { title: "On-chain float", body: `${tick} launches on a public Solana bonding curve. The supply on this page is the supply that mints.` },
    { title: "Locked liquidity path", body: "Curve fees stay on the pool. Partner LP locks on graduate. No silent mint switch after T-0." },
    { title: "Public clock", body: "The countdown on this site is the launch clock. The contract address publishes here at T-0." },
    { title: "Community first", body: `${Math.round((brand.curveTokens / Math.max(1, brand.supply)) * 100)}% of supply sits on the curve for anyone with a Solana wallet.` },
  ];
  const faq = [
    { q: `What is ${tick}?`, a: `${name} is ${idea}. It is a Solana memecoin with published tokenomics and a live countdown to the public CA.` },
    { q: "When does the CA go live?", a: "The contract address appears on this page at T-0. Until then the clock is the only public signal." },
    { q: "How do I buy?", a: "Fund a Solana wallet with SOL. At T-0 copy the CA from this site and swap on the bonding curve." },
    { q: "Who holds the team slice?", a: "Team, community, and treasury slices mint into isolated wallets at T-30. Percentages on this page match the mint." },
    { q: "Is liquidity locked?", a: "The curve uses a unique config. Partner LP is permanently locked at graduate. Opening buy is 0.05 SOL after pool metadata." },
  ];
  const buySteps = [
    { n: "01", title: "Get SOL", body: "Fund a Solana wallet from an exchange. Keep a little extra for fees." },
    { n: "02", title: "Wait for T-0", body: "This page publishes the contract address the second the public clock hits zero." },
    { n: "03", title: "Swap on the curve", body: `Paste the CA, pay in SOL, receive ${tick}. Slippage is yours to set.` },
    { n: "04", title: "Hold or trade", body: "The same curve stays live through graduate. Track it on Dexscreener once the pair indexes." },
  ];
  const stats = [
    { k: "Supply", v: supply },
    { k: "Decimals", v: "6" },
    { k: "Curve", v: `${Math.round((brand.curveTokens / Math.max(1, brand.supply)) * 100)}%` },
    { k: "Network", v: "Solana" },
    { k: "Venue", v: "Meteora DBC" },
    { k: "Opening", v: "0.05 SOL" },
  ];
  return {
    layout,
    motion: MOTION[layout],
    fonts: FONTS[layout],
    colors,
    tagline: pick(r, [
      `${name} does not ask permission.`,
      `A ${brand.themeId} myth, minted in public.`,
      `${tick} is the story. The chain is the proof.`,
      `Built for the timeline. Settled on Solana.`,
    ]),
    manifesto: `${name} started as a raw idea: ${idea}. The site, the art, the supply, and the curve all come from that one line. No borrowed brand. No recycled template pretending to be a protocol. ${tick} is a standalone memecoin with a public clock, published tokenomics, and a community float that actually mints.`,
    lore: `Every culture online eventually grows a mascot. ${name} is that mascot with a treasury, a curve, and a launch window you can watch. The art is generated for this niche. The pages, type, and motion are unique to ${tick}. When the clock dies, the CA is the only thing that matters.`,
    community: `If you are here early, you are the culture. Share the site, load the clock, and be on the page at T-0. ${tick} does not need a speech. It needs people who show up.`,
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    features,
    faq,
    buySteps,
    stats,
    artPrompt: artPromptOf(brand),
    heroPrompt: heroPromptOf(brand),
  };
}

type GrokSite = {
  tagline?: string;
  manifesto?: string;
  lore?: string;
  community?: string;
  features?: { title: string; body: string }[];
  faq?: { q: string; a: string }[];
};

export async function enrichSiteKit(brand: V3Brand, kit: V3SiteKit): Promise<V3SiteKit> {
  if (!XAI_API_KEY) return kit;
  try {
    const res = await fetch(`${XAI_BASE}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${XAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: `You write original memecoin website copy for a standalone token. Never mention Solphia, Phantom, or any other product. Never say replica or template. Sound like a high-end studio that built a custom brand site. Return ONLY JSON with keys: tagline, manifesto, lore, community, features (array of {title,body} length 4), faq (array of {q,a} length 5).`,
          },
          {
            role: "user",
            content: `Token ${brand.name} ($${brand.symbol}). Idea: ${brand.idea}. Theme: ${brand.themeId}. Supply ${brand.supply}. Layout ${kit.layout}.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return kit;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return kit;
    const parsed = JSON.parse(text.slice(start, end + 1)) as GrokSite;
    return {
      ...kit,
      tagline: String(parsed.tagline || kit.tagline).slice(0, 120),
      manifesto: String(parsed.manifesto || kit.manifesto).slice(0, 900),
      lore: String(parsed.lore || kit.lore).slice(0, 900),
      community: String(parsed.community || kit.community).slice(0, 500),
      features: Array.isArray(parsed.features) && parsed.features.length >= 3 ? parsed.features.slice(0, 6).map((f) => ({ title: String(f.title).slice(0, 40), body: String(f.body).slice(0, 220) })) : kit.features,
      faq: Array.isArray(parsed.faq) && parsed.faq.length >= 3 ? parsed.faq.slice(0, 8).map((f) => ({ q: String(f.q).slice(0, 80), a: String(f.a).slice(0, 320) })) : kit.faq,
    };
  } catch {
    return kit;
  }
}
