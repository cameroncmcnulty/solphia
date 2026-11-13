/** Names, tickers, socials, and themes for the Tools data launcher. */

export const DEFAULT_NARRATIVE = 100;
export const DEFAULT_RANDOM = 150;
export const DEFAULT_TOTAL = DEFAULT_NARRATIVE + DEFAULT_RANDOM;
export const DEFAULT_NARRATIVE_PCT = Math.round((DEFAULT_NARRATIVE / DEFAULT_TOTAL) * 100);
export const MAX_BATCH = 400;
export const DEFAULT_WINDOW_MINUTES = 180;
export const MIN_WINDOW_MINUTES = 1;
export const MAX_WINDOW_MINUTES = 1440;
export const DEFAULT_WINDOW_MS = DEFAULT_WINDOW_MINUTES * 60 * 1000;
export const MIN_GAP_MS = 8_000;

export function clampWindowMinutes(raw: number): number {
  const n = Math.floor(Number(raw) || 0);
  return Math.max(MIN_WINDOW_MINUTES, Math.min(MAX_WINDOW_MINUTES, n));
}

export function windowMsFromMinutes(minutes: number): number {
  return clampWindowMinutes(minutes) * 60_000;
}

/** Prefer minutes. Hours is a fallback for older clients. */
export function windowMsFromBody(opts: { windowMinutes?: number; windowHours?: number }): number {
  if (opts.windowMinutes != null && Number.isFinite(Number(opts.windowMinutes))) {
    return windowMsFromMinutes(Number(opts.windowMinutes));
  }
  if (opts.windowHours != null && Number.isFinite(Number(opts.windowHours))) {
    return windowMsFromMinutes(Math.round(Number(opts.windowHours) * 60));
  }
  return DEFAULT_WINDOW_MS;
}

export const TEAM_BPS_MIN = 300;
export const TEAM_BPS_MAX = 2000;
export const BATCH_SUPPLY = 200_000_000;
export const BATCH_DECIMALS = 6;
/** One seed from Treasury into the first launch wallet. Remainder relays to the next. */
export const BATCH_RELAY_LAMPORTS = 500_000_000;
export const BATCH_RELAY_SOL = BATCH_RELAY_LAMPORTS / 1_000_000_000;
export const BATCH_LAUNCH_FUND_LAMPORTS = BATCH_RELAY_LAMPORTS;
export const BATCH_LAUNCH_FUND_SOL = BATCH_RELAY_SOL;

export function isInsufficientFunds(err?: string | null): boolean {
  const m = (err || "").toLowerCase();
  return /insufficient|not enough sol|no enough sol|attempt to debit|custom program error: 0x1\b|0x1\b/.test(m);
}

/** narrativePct 100 = all narrative, 0 = all random words. */
export function splitMix(total: number, narrativePct: number): { narrative: number; random: number } {
  const n = Math.max(0, Math.min(MAX_BATCH, Math.floor(Number(total) || 0)));
  const pct = Math.max(0, Math.min(100, Number(narrativePct) || 0));
  const narrative = Math.min(n, Math.max(0, Math.round((n * pct) / 100)));
  return { narrative, random: n - narrative };
}

export type TokenKind = "narrative" | "random";

export type TokenIdentity = {
  id: string;
  kind: TokenKind;
  theme: string;
  name: string;
  symbol: string;
  blurb: string;
  website: string;
  x: string;
  telegram: string;
  teamBps: number;
};

export type NarrativeHit = {
  symbol: string;
  name: string;
  theme: string;
};

const THEMES = [
  "pepe",
  "frog",
  "cat",
  "dog",
  "ai",
  "robot",
  "space",
  "moon",
  "rocket",
  "king",
  "coin",
  "fire",
  "ice",
  "ocean",
  "food",
  "anime",
  "game",
  "skull",
  "alien",
  "wolf",
  "bull",
  "bear",
  "world",
  "gold",
  "neon",
  "meme",
  "bird",
  "fish",
  "dragon",
  "ape",
] as const;

export type ThemeId = (typeof THEMES)[number];

const THEME_WORDS: Record<ThemeId, string[]> = {
  pepe: ["PEPE", "FROG", "RARE", "FEELS"],
  frog: ["FROG", "TOAD", "RIBBIT", "POND"],
  cat: ["CAT", "KITTY", "MEOW", "PAWS"],
  dog: ["DOG", "WOOF", "PUP", "BONE"],
  ai: ["AI", "NEURAL", "BOT", "CHIP"],
  robot: ["BOT", "MECH", "GEAR", "WIRE"],
  space: ["MARS", "ORBIT", "STAR", "VOID"],
  moon: ["MOON", "LUNAR", "TIDE", "WAX"],
  rocket: ["ROCKET", "BLAST", "FUEL", "PAD"],
  king: ["KING", "CROWN", "ROYAL", "THRONE"],
  coin: ["COIN", "MINT", "CASH", "BAG"],
  fire: ["FIRE", "FLAME", "BURN", "HEAT"],
  ice: ["ICE", "FROST", "COLD", "SNOW"],
  ocean: ["OCEAN", "WAVE", "TIDE", "SALT"],
  food: ["PIZZA", "TACO", "BEAN", "BUN"],
  anime: ["ANIME", "SENPAI", "KAWAII", "WAIFU"],
  game: ["GAME", "BOSS", "LOOT", "XP"],
  skull: ["SKULL", "BONE", "GRAVE", "DUST"],
  alien: ["ALIEN", "UFO", "BEAM", "XENO"],
  wolf: ["WOLF", "HOWL", "PACK", "FANG"],
  bull: ["BULL", "HORN", "RUSH", "CHARGE"],
  bear: ["BEAR", "CLAW", "HONEY", "DEN"],
  world: ["WORLD", "EARTH", "GLOBE", "MAP"],
  gold: ["GOLD", "ORE", "VAULT", "RICH"],
  neon: ["NEON", "GLOW", "VIBE", "NITE"],
  meme: ["MEME", "LOL", "BASED", "DEGEN"],
  bird: ["BIRD", "WING", "NEST", "PECK"],
  fish: ["FISH", "FIN", "BAIT", "REEF"],
  dragon: ["DRAGON", "WYRM", "SCALE", "FIRE"],
  ape: ["APE", "BANANA", "JUNGLE", "DRUM"],
};

const SEED_NARRATIVES: NarrativeHit[] = [
  { symbol: "PEPE", name: "Pepe", theme: "pepe" },
  { symbol: "WOJAK", name: "Wojak", theme: "meme" },
  { symbol: "FARTCOIN", name: "Fartcoin", theme: "meme" },
  { symbol: "TRUMP", name: "Trump", theme: "king" },
  { symbol: "ELON", name: "Elon", theme: "rocket" },
  { symbol: "AI", name: "Agent", theme: "ai" },
  { symbol: "GOAT", name: "Goat", theme: "meme" },
  { symbol: "PNUT", name: "Peanut", theme: "ape" },
  { symbol: "MOODENG", name: "Moo Deng", theme: "meme" },
  { symbol: "CHILLGUY", name: "Chill Guy", theme: "meme" },
  { symbol: "GIGA", name: "Gigachad", theme: "bull" },
  { symbol: "RETARDIO", name: "Retardio", theme: "meme" },
  { symbol: "POPCAT", name: "Popcat", theme: "cat" },
  { symbol: "MEW", name: "Cat in a dogs world", theme: "cat" },
  { symbol: "WIF", name: "dogwifhat", theme: "dog" },
  { symbol: "BONK", name: "Bonk", theme: "dog" },
  { symbol: "MYRO", name: "Myro", theme: "dog" },
  { symbol: "PONKE", name: "Ponke", theme: "ape" },
  { symbol: "SLERF", name: "Slerf", theme: "ape" },
  { symbol: "BOME", name: "Book of Meme", theme: "meme" },
  { symbol: "MICHI", name: "Michi", theme: "cat" },
  { symbol: "GIGA", name: "Giga", theme: "bull" },
  { symbol: "MOON", name: "Moon", theme: "moon" },
  { symbol: "ROCKET", name: "Rocket", theme: "rocket" },
  { symbol: "FROG", name: "Frog", theme: "frog" },
  { symbol: "NEURAL", name: "Neural", theme: "ai" },
  { symbol: "BOT", name: "Bot", theme: "robot" },
  { symbol: "ALIEN", name: "Alien", theme: "alien" },
  { symbol: "DRAGON", name: "Dragon", theme: "dragon" },
  { symbol: "WOLF", name: "Wolf", theme: "wolf" },
];

const WORDS = [
  "CAT", "DOG", "FOX", "OWL", "BAT", "RAT", "PIG", "COW", "BEE", "ANT",
  "SUN", "MOON", "STAR", "SKY", "WIND", "RAIN", "SNOW", "FIRE", "ICE", "WAVE",
  "KING", "QUEEN", "LORD", "DUKE", "BOSS", "CHIEF", "HERO", "NINJA", "MAGE", "ORC",
  "GOLD", "IRON", "RUBY", "JADE", "PEARL", "COIN", "BAG", "VAULT", "MINT", "CASH",
  "WORLD", "EARTH", "MARS", "MOON", "VOID", "CHAOS", "PEACE", "LOVE", "RAGE", "VIBE",
  "TACO", "PIZZA", "BEAN", "CORN", "MILK", "CAKE", "BUN", "SOUP", "RICE", "SALT",
  "LASER", "NEON", "GLOW", "DARK", "LIGHT", "BOLT", "STORM", "THUNDER", "FROST", "FLAME",
  "APE", "FROG", "WOLF", "BEAR", "BULL", "DUCK", "FISH", "CRAB", "SHARK", "WHALE",
  "BABY", "DADDY", "GIGA", "MEGA", "ULTRA", "SUPER", "HYPER", "MINI", "TINY", "HUGE",
  "BASED", "DEGEN", "CHAD", "NPC", "AURA", "RIZZ", "GRIND", "HUSTLE", "WEALTH", "RICH",
  "THE", "ONE", "TRUE", "REAL", "ONLY", "LAST", "FIRST", "NEXT", "NEW", "OLD",
];

const WORD_NAMES: Record<string, string> = {
  CAT: "Cat", DOG: "Dog", FOX: "Fox", OWL: "Owl", BAT: "Bat", RAT: "Rat",
  PIG: "Pig", COW: "Cow", BEE: "Bee", ANT: "Ant", SUN: "Sun", MOON: "Moon",
  STAR: "Star", SKY: "Sky", WIND: "Wind", RAIN: "Rain", SNOW: "Snow", FIRE: "Fire",
  ICE: "Ice", WAVE: "Wave", KING: "King", QUEEN: "Queen", LORD: "Lord", DUKE: "Duke",
  BOSS: "Boss", CHIEF: "Chief", HERO: "Hero", NINJA: "Ninja", MAGE: "Mage", ORC: "Orc",
  GOLD: "Gold", IRON: "Iron", RUBY: "Ruby", JADE: "Jade", PEARL: "Pearl", COIN: "Coin",
  BAG: "Bag", VAULT: "Vault", MINT: "Mint", CASH: "Cash", WORLD: "World", EARTH: "Earth",
  MARS: "Mars", VOID: "Void", CHAOS: "Chaos", PEACE: "Peace", LOVE: "Love", RAGE: "Rage",
  VIBE: "Vibe", TACO: "Taco", PIZZA: "Pizza", BEAN: "Bean", CORN: "Corn", MILK: "Milk",
  CAKE: "Cake", BUN: "Bun", SOUP: "Soup", RICE: "Rice", SALT: "Salt", LASER: "Laser",
  NEON: "Neon", GLOW: "Glow", DARK: "Dark", LIGHT: "Light", BOLT: "Bolt", STORM: "Storm",
  THUNDER: "Thunder", FROST: "Frost", FLAME: "Flame", APE: "Ape", FROG: "Frog", WOLF: "Wolf",
  BEAR: "Bear", BULL: "Bull", DUCK: "Duck", FISH: "Fish", CRAB: "Crab", SHARK: "Shark",
  WHALE: "Whale", BABY: "Baby", DADDY: "Daddy", GIGA: "Giga", MEGA: "Mega", ULTRA: "Ultra",
  SUPER: "Super", HYPER: "Hyper", MINI: "Mini", TINY: "Tiny", HUGE: "Huge", BASED: "Based",
  DEGEN: "Degen", CHAD: "Chad", NPC: "Npc", AURA: "Aura", RIZZ: "Rizz", GRIND: "Grind",
  HUSTLE: "Hustle", WEALTH: "Wealth", RICH: "Rich", THE: "The", ONE: "One", TRUE: "True",
  REAL: "Real", ONLY: "Only", LAST: "Last", FIRST: "First", NEXT: "Next", NEW: "New", OLD: "Old",
};

function randInt(max: number): number {
  return Math.floor(Math.random() * Math.max(1, max));
}

function pick<T>(xs: readonly T[]): T {
  return xs[randInt(xs.length)]!;
}

function hex6(): string {
  return Math.random().toString(16).slice(2, 8).padEnd(6, "0").slice(0, 6);
}

export function tickerOk(raw: string): boolean {
  return /^[A-Z0-9]{2,10}$/.test((raw || "").trim().toUpperCase());
}

export function nameOk(raw: string): boolean {
  const t = (raw || "").trim();
  return t.length >= 2 && t.length <= 24;
}

export function themeOf(raw: string): ThemeId {
  const s = (raw || "").toLowerCase();
  for (const t of THEMES) {
    if (s.includes(t)) return t;
  }
  if (/pepe|wojak|meme|lol|based|degen|chad/.test(s)) return "meme";
  if (/cat|mew|kitten|popcat|michi/.test(s)) return "cat";
  if (/dog|wif|bonk|woof|pup/.test(s)) return "dog";
  if (/ai|agent|gpt|neural|llm/.test(s)) return "ai";
  if (/moon|lunar/.test(s)) return "moon";
  if (/rocket|elon|mars/.test(s)) return "rocket";
  if (/trump|king|royal/.test(s)) return "king";
  if (/ape|monkey|pnut|ponke/.test(s)) return "ape";
  if (/frog|toad/.test(s)) return "frog";
  return "neon";
}

export function teamBpsAt(n = Math.random()): number {
  const span = TEAM_BPS_MAX - TEAM_BPS_MIN;
  const t = Math.min(1, Math.max(0, n));
  return TEAM_BPS_MIN + Math.floor(t * span);
}

export function curveTokensFor(teamBps: number, supply = BATCH_SUPPLY): number {
  const bps = Math.min(TEAM_BPS_MAX, Math.max(TEAM_BPS_MIN, Math.floor(teamBps)));
  return Math.floor((supply * (10_000 - bps)) / 10_000);
}

export function teamTokensFor(teamBps: number, supply = BATCH_SUPPLY): number {
  return supply - curveTokensFor(teamBps, supply);
}

function handleOf(symbol: string): string {
  const h = symbol.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);
  return h.length >= 1 ? h : "solphia";
}

function socials(symbol: string): { website: string; x: string; telegram: string } {
  const h = handleOf(symbol);
  return {
    website: `https://solphia.io/c/${h}`,
    x: `https://x.com/${h}`,
    telegram: `https://t.me/${h}`,
  };
}

function blurbOf(name: string, kind: TokenKind, theme: string): string {
  if (kind === "narrative") return `${name} rides the ${theme} meta on Solphia.`;
  return `${name} on Solphia.`;
}

function makeId(kind: TokenKind, theme: string, symbol: string): string {
  const k = kind === "narrative" ? "n" : "r";
  const th = (theme || "neon").replace(/[^a-z0-9]/g, "").slice(0, 4) || "neon";
  const sym = symbol.replace(/[^A-Z0-9]/g, "").slice(0, 8) || "COIN";
  return `${k}${th}_${sym}_${hex6()}`;
}

function uniqueTicker(base: string, used: Set<string>): string {
  let t = base.replace(/[^A-Z0-9]/g, "").toUpperCase().slice(0, 10);
  if (t.length < 2) t = `X${t}X`.slice(0, 10);
  if (!used.has(t) && tickerOk(t)) return t;
  for (let i = 2; i <= 99; i++) {
    const cut = t.slice(0, Math.max(2, 10 - String(i).length));
    const next = `${cut}${i}`;
    if (!used.has(next) && tickerOk(next)) return next;
  }
  const fallback = `T${hex6().toUpperCase().slice(0, 8)}`;
  return used.has(fallback) ? `X${Date.now().toString(36).toUpperCase().slice(-8)}` : fallback;
}

function titleCase(word: string): string {
  const w = (word || "").trim();
  if (!w) return "Coin";
  return WORD_NAMES[w.toUpperCase()] || w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase();
}

export function randomIdentity(used: Set<string>): TokenIdentity {
  const one = Math.random() < 0.45;
  const a = pick(WORDS);
  const b = pick(WORDS.filter((w) => w !== a));
  const symbol = uniqueTicker(one ? a : `${a}${b}`.slice(0, 10), used);
  used.add(symbol);
  const name = one ? titleCase(a) : `${titleCase(a)} ${titleCase(b)}`.slice(0, 24);
  const theme = themeOf(`${a} ${b} ${name}`);
  const links = socials(symbol);
  return {
    id: makeId("random", theme, symbol),
    kind: "random",
    theme,
    name: nameOk(name) ? name : titleCase(symbol),
    symbol,
    blurb: blurbOf(name, "random", theme),
    ...links,
    teamBps: teamBpsAt(),
  };
}

export function narrativeIdentity(hit: NarrativeHit, used: Set<string>): TokenIdentity {
  const base = (hit.symbol || "MEME").replace(/[^A-Z0-9]/g, "").toUpperCase().slice(0, 10);
  const twist = pick(THEME_WORDS[themeOf(hit.theme || hit.symbol)] || THEME_WORDS.meme);
  const mashed = uniqueTicker(base.length <= 6 ? `${base}${twist[0] || "X"}` : base, used);
  used.add(mashed);
  const rawName = (hit.name || titleCase(base)).trim().slice(0, 24);
  const name = nameOk(rawName) ? rawName : titleCase(mashed);
  const theme = themeOf(hit.theme || hit.name || mashed);
  const links = socials(mashed);
  return {
    id: makeId("narrative", theme, mashed),
    kind: "narrative",
    theme,
    name,
    symbol: mashed,
    blurb: blurbOf(name, "narrative", theme),
    ...links,
    teamBps: teamBpsAt(),
  };
}

export function scheduleTimes(count: number, windowMs: number, now = Date.now(), minGap = MIN_GAP_MS): number[] {
  const n = Math.max(0, Math.floor(count));
  const window = Math.max(minGap, Math.floor(windowMs));
  if (!n) return [];
  const times = [now];
  for (let i = 1; i < n; i++) times.push(now + 1 + Math.floor(Math.random() * Math.max(1, window - 1)));
  times.sort((a, b) => a - b);
  for (let i = 1; i < times.length; i++) {
    if (times[i]! < times[i - 1]! + minGap) times[i] = times[i - 1]! + minGap;
  }
  const last = times[times.length - 1]!;
  const cap = now + window;
  if (last <= cap) return times;
  const span = last - now;
  return times.map((t, i) => (i === 0 ? now : now + Math.floor(((t - now) * window) / span)));
}

function parseDexRow(row: unknown): NarrativeHit | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const token = (o.token || o.baseToken || o) as Record<string, unknown>;
  const symbol = String(token.symbol || o.symbol || "").replace(/^\$/, "").trim().toUpperCase();
  const name = String(token.name || o.name || symbol).trim();
  if (!tickerOk(symbol.slice(0, 10))) return null;
  return { symbol: symbol.slice(0, 10), name: name.slice(0, 24) || symbol, theme: themeOf(`${symbol} ${name}`) };
}

export async function fetchNarratives(limit = 120): Promise<NarrativeHit[]> {
  const out: NarrativeHit[] = [];
  const seen = new Set<string>();
  const push = (hit: NarrativeHit | null) => {
    if (!hit || seen.has(hit.symbol)) return;
    seen.add(hit.symbol);
    out.push(hit);
  };
  const urls = [
    "https://api.dexscreener.com/token-boosts/top/v1",
    "https://api.dexscreener.com/token-profiles/latest/v1",
    "https://api.dexscreener.com/latest/dex/search?q=solana",
  ];
  await Promise.all(
    urls.map(async (url) => {
      try {
        const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" } });
        if (!r.ok) return;
        const j = (await r.json()) as unknown;
        const rows = Array.isArray(j) ? j : Array.isArray((j as { pairs?: unknown[] }).pairs) ? (j as { pairs: unknown[] }).pairs : [];
        for (const row of rows.slice(0, 80)) push(parseDexRow(row));
      } catch {
        /* seed list still covers the run */
      }
    }),
  );
  for (const seed of SEED_NARRATIVES) push(seed);
  return out.slice(0, Math.max(limit, 40));
}

export function buildIdentities(opts: {
  narrative: number;
  random: number;
  hits?: NarrativeHit[];
}): TokenIdentity[] {
  const used = new Set<string>();
  const hits = opts.hits?.length ? opts.hits : SEED_NARRATIVES;
  const out: TokenIdentity[] = [];
  const nNeed = Math.max(0, Math.floor(opts.narrative));
  const rNeed = Math.max(0, Math.floor(opts.random));
  for (let i = 0; i < nNeed; i++) {
    const hit = hits[i % hits.length]!;
    out.push(narrativeIdentity(hit, used));
  }
  for (let i = 0; i < rNeed; i++) out.push(randomIdentity(used));
  return out;
}
