import { XAI_API_KEY, XAI_BASE, XAI_MODEL } from "../../config";
import type { V3Brand, V3Theme } from "./idea";
import { looksWarmBrown, worldOf, type WorldLabels } from "./world";

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
  labels: WorldLabels;
  worldId: string;
  artPrompt: string;
  heroPrompt: string;
};

export const V3_FONTS: Record<V3Layout, V3Fonts> = {
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

export function artPromptOf(brand: Pick<V3Brand, "idea" | "name" | "symbol">): string {
  const world = worldOf(brand.idea, brand.name, brand.symbol);
  return `${world.artSubject} fills a square close-up as a gallery mascot portrait. Ultra-detailed cinematic 3D, tactile materials, sharp rim light, shallow depth of field, museum lighting. Square 1:1 composition. No text, no letters, no watermark, no UI.`;
}

export function heroPromptOf(brand: Pick<V3Brand, "idea" | "name" | "symbol">): string {
  const world = worldOf(brand.idea, brand.name, brand.symbol);
  return `${world.heroSubject} stands inside a world built for this niche, wide IMAX still, volumetric atmosphere, anamorphic bokeh, dramatic key light. Premium motion-picture frame, 16:9. No text, no letters, no UI, no watermark.`;
}

function fmtSupply(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  return n.toLocaleString();
}

export function buildV3SiteKit(brand: V3Brand): V3SiteKit {
  const world = worldOf(brand.idea, brand.name, brand.symbol);
  const layout = (V3_LAYOUTS.includes(world.layout as V3Layout) ? world.layout : "neon") as V3Layout;
  const colors = world.colors;
  const supply = fmtSupply(brand.supply);
  const curvePct = `${Math.round((brand.curveTokens / Math.max(1, brand.supply)) * 100)}%`;
  const stats = [
    { k: "Supply", v: supply },
    { k: "Decimals", v: "6" },
    { k: "Curve", v: curvePct },
    { k: "Network", v: "Solana" },
    { k: "Venue", v: "Meteora DBC" },
    { k: "Opening", v: "0.05 SOL" },
  ];
  const features = world.features.map((f, i) =>
    i === 3 ? { ...f, body: `${curvePct} of supply sits on the curve for anyone with a Solana wallet.` } : f,
  );
  return {
    layout,
    motion: MOTION[layout],
    fonts: V3_FONTS[layout],
    colors,
    tagline: world.tagline,
    manifesto: world.manifesto,
    lore: world.lore,
    community: world.community,
    warning: world.warning,
    features,
    faq: world.faq,
    buySteps: world.buySteps,
    stats,
    labels: world.labels,
    worldId: world.id,
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
  colors?: Partial<V3Theme>;
  layout?: string;
  labels?: Partial<WorldLabels>;
};

function hexish(v: unknown): string {
  const s = String(v || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : "";
}

export async function enrichSiteKit(brand: V3Brand, kit: V3SiteKit): Promise<V3SiteKit> {
  if (!XAI_API_KEY) return kit;
  const world = worldOf(brand.idea, brand.name, brand.symbol);
  try {
    const res = await fetch(`${XAI_BASE}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${XAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0.85,
        messages: [
          {
            role: "system",
            content: `You are a senior brand studio planning a custom memecoin website. The user gave a one-line idea. Do NOT quote, restate, or paraphrase that idea. Understand the niche and invent original copy as if you spent a week on the brand.

If the idea is Grand Theft Auto, GTA, Vice City, or Leonida: the world is neon night Miami — hot magenta #ff2ea6 and aqua #2ef5e0 on near-black purple. NEVER brown, gold, or orange. Layout must be neon. Copy is street HUD, wanted stars, the city, the crew — original, not a game recap.

Never mention Solphia, Phantom, replica, template, or "raw idea". Return ONLY JSON with keys: tagline, manifesto, lore, community, features (array of {title,body} length 4), faq (array of {q,a} length 5), colors {bg,ink,accent,muted,card,glow,line,glow2} as hex, layout (cinema|terminal|studio|neon|glass|brutal|orbital|pulse), labels {story,split,buy,path,faq,lore,join,kicker}.`,
          },
          {
            role: "user",
            content: `Token ${brand.name} ($${brand.symbol}). Niche hint: ${brand.idea}. Planned world: ${world.id}. Supply ${brand.supply}.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return kit;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content || "";
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return kit;
    const parsed = JSON.parse(text.slice(start, end + 1)) as GrokSite;
    const parsedColors: V3Theme = {
      bg: hexish(parsed.colors?.bg) || kit.colors.bg,
      ink: hexish(parsed.colors?.ink) || kit.colors.ink,
      accent: hexish(parsed.colors?.accent) || kit.colors.accent,
      muted: hexish(parsed.colors?.muted) || kit.colors.muted,
      card: hexish(parsed.colors?.card) || kit.colors.card,
      glow: hexish(parsed.colors?.glow) || kit.colors.glow,
      line: hexish(parsed.colors?.line) || kit.colors.line,
      glow2: hexish(parsed.colors?.glow2) || kit.colors.glow2,
    };
    const forceVice = world.id === "vice";
    const colors = forceVice || looksWarmBrown(parsedColors) ? kit.colors : parsedColors;
    const layout = (forceVice ? "neon" : V3_LAYOUTS.includes(parsed.layout as V3Layout) ? (parsed.layout as V3Layout) : kit.layout) as V3Layout;
    const labels: WorldLabels = {
      story: String(parsed.labels?.story || kit.labels.story).slice(0, 28),
      split: String(parsed.labels?.split || kit.labels.split).slice(0, 28),
      buy: String(parsed.labels?.buy || kit.labels.buy).slice(0, 28),
      path: String(parsed.labels?.path || kit.labels.path).slice(0, 28),
      faq: String(parsed.labels?.faq || kit.labels.faq).slice(0, 28),
      lore: String(parsed.labels?.lore || kit.labels.lore).slice(0, 28),
      join: String(parsed.labels?.join || kit.labels.join).slice(0, 28),
      kicker: String(parsed.labels?.kicker || kit.labels.kicker).slice(0, 40),
    };
    return {
      ...kit,
      layout,
      motion: MOTION[layout],
      fonts: V3_FONTS[layout],
      colors,
      labels,
      worldId: world.id,
      tagline: String(parsed.tagline || kit.tagline).slice(0, 140),
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
