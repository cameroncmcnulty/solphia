/** Planned niche worlds for V3 sites. Understand the idea, invent a brand. Never echo the prompt. */

export type WorldId =
  | "vice"
  | "frog"
  | "dog"
  | "cat"
  | "ai"
  | "space"
  | "anime"
  | "gold"
  | "fire"
  | "ocean"
  | "skull"
  | "ape"
  | "generic";

export type WorldLayout = "cinema" | "terminal" | "studio" | "neon" | "glass" | "brutal" | "orbital" | "pulse";
export type WorldMotion = "particles" | "grid" | "aurora" | "orbit" | "scan" | "wave";

export type WorldTheme = {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  card: string;
  glow: string;
  line: string;
  glow2?: string;
};

export type WorldLabels = {
  story: string;
  split: string;
  buy: string;
  path: string;
  faq: string;
  lore: string;
  join: string;
  kicker: string;
};

export type World = {
  id: WorldId;
  brandName: string;
  tickers: string[];
  themeId: string;
  layout: WorldLayout;
  motion: WorldMotion;
  colors: WorldTheme;
  labels: WorldLabels;
  tagline: string;
  manifesto: string;
  lore: string;
  community: string;
  blurb: string;
  about: string;
  howToBuy: string;
  warning: string;
  roadmap: { title: string; body: string }[];
  features: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  buySteps: { n: string; title: string; body: string }[];
  artSubject: string;
  heroSubject: string;
};

const LAYOUTS: WorldLayout[] = ["cinema", "terminal", "studio", "neon", "glass", "brutal", "orbital", "pulse"];

function fill(s: string, name: string, symbol: string): string {
  const tick = symbol ? `$${symbol}` : name;
  return (s || "")
    .replace(/\$NAME/g, name)
    .replace(/\$TICK/g, tick)
    .replace(/\$SYM/g, symbol);
}

function fillAll<T>(value: T, name: string, symbol: string): T {
  if (typeof value === "string") return fill(value, name, symbol) as T;
  if (Array.isArray(value)) return value.map((v) => fillAll(v, name, symbol)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = fillAll(v, name, symbol);
    return out as T;
  }
  return value;
}

function hashPick<T>(seed: string, items: readonly T[]): T {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h ^= seed.charCodeAt(i), h = Math.imul(h, 16777619);
  return items[Math.abs(h) % items.length]!;
}

const VICE_COLORS: WorldTheme = {
  bg: "#070018",
  ink: "#f7f0ff",
  accent: "#ff2ea6",
  muted: "#b9a8d4",
  card: "#120824",
  glow: "#2ef5e0",
  line: "#3a1858",
  glow2: "#ff2ea6",
};

function viceWorld(): World {
  return {
    id: "vice",
    brandName: "VICE",
    tickers: ["VICE", "LEONIDA", "NITES"],
    themeId: "neon",
    layout: "neon",
    motion: "grid",
    colors: VICE_COLORS,
    labels: {
      story: "The City",
      split: "The Take",
      buy: "Jack In",
      path: "Heist Map",
      faq: "Dispatch",
      lore: "Street File",
      join: "The Crew",
      kicker: "LEONIDA · NIGHT OPS",
    },
    tagline: "Night on the strip. The curve never sleeps.",
    manifesto:
      "$NAME is a Leonida-night memecoin: magenta over aqua, palms over wet asphalt, a public Solana curve instead of a loading screen. The city is the brand. The clock is the window. When T-0 hits, the contract address drops on this page and the streets open. No studio sequel. No borrowed map. A crew, a HUD, and a float that actually mints.",
    lore:
      "Every night city grows a rumor with a ticker. $TICK is that rumor with a treasury, a bonding curve, and a wanted-level clock. The art is neon on rain. The site is a street HUD. When the stars light, the CA is the only thing that matters.",
    community:
      "Load the page. Watch the clock. Be on the strip at T-0. The first people in the city are the city. $TICK does not need a speech. It needs a crew that shows up.",
    blurb: "Leonida after dark. A public Solana curve with a neon HUD.",
    about:
      "$NAME runs a public Solana bonding curve dressed as a night-city HUD. Magenta and aqua. Palms and wet chrome. The countdown on this site is the heist window. The contract address publishes here at T-0.",
    howToBuy:
      "Fund a Solana wallet with SOL. Stay on this page until T-0. The contract address publishes here. Paste it, swap SOL for $TICK on the bonding curve, keep a little extra for fees.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve config, crew slices, and metadata. The curve opens empty for snipers." },
      { title: "T-0 Drop", body: "The contract address publishes on this site. The strip opens. Community trading starts." },
      { title: "Afterglow", body: "Curve fees through graduate. Partner LP permanently locked. The city stays open." },
    ],
    features: [
      { title: "Street float", body: "Most of $TICK sits on a public Solana bonding curve. The supply on this page is the supply that mints." },
      { title: "Neon lock", body: "Curve fees stay on the pool. Partner LP locks on graduate. No silent mint switch after T-0." },
      { title: "Public drop", body: "The countdown on this HUD is the launch clock. The contract address publishes here at T-0." },
      { title: "Crew on-chain", body: "An isolated project wallet holds 8–11% at T-30. The rest sits on the curve. Percentages match this page." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Leonida-night memecoin on Solana. Neon HUD, public curve, published tokenomics, live countdown to the CA." },
      { q: "When does the CA go live?", a: "The contract address appears on this page at T-0. Until then the clock is the only public signal." },
      { q: "How do I buy?", a: "Fund a Solana wallet with SOL. At T-0 copy the CA from this site and swap on the bonding curve." },
      { q: "Who holds the crew slice?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve. The bars on this page are the mint." },
      { q: "Is liquidity locked?", a: "Unique curve config. Partner LP permanently locked at graduate. No opening buy — the curve is empty at T-30." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet from an exchange. Keep a little extra for fees." },
      { n: "02", title: "Hold the strip", body: "Stay on this page. The HUD clock is the launch clock." },
      { n: "03", title: "Swap at T-0", body: "The CA publishes here. Paste it, pay in SOL, receive $TICK." },
      { n: "04", title: "Ride", body: "Same curve through graduate. Track the pair on Dexscreener once it indexes." },
    ],
    artSubject:
      "close-up of a chrome sports car hood with magenta and aqua neon reflecting on wet midnight asphalt, palm-leaf bokeh, cinematic 3D, tactile metal, sharp rim light, no people, no logos, no letters, no UI, no watermark",
    heroSubject:
      "wide night boulevard in a fictional tropical city, magenta and cyan neon signs, palm silhouettes, wet streets, distant skyline, volumetric haze, anamorphic bokeh, IMAX still, no text, no logos, no trademarked characters, no UI, no watermark",
  };
}

function frogWorld(): World {
  return {
    id: "frog",
    brandName: "",
    tickers: [],
    themeId: "frog",
    layout: "brutal",
    motion: "particles",
    colors: { bg: "#06140a", ink: "#e8ffe8", accent: "#7CFF4D", muted: "#8fbf90", card: "#0c1c10", glow: "#7CFF4D", line: "#1e3a22" },
    labels: { story: "The Pond", split: "The Cut", buy: "Leap In", path: "Lily Pads", faq: "Croaks", lore: "Origin", join: "The Pond", kicker: "POND · PUBLIC FLOAT" },
    tagline: "A pond with a ticker and a public curve.",
    manifesto: "$NAME is the pond mascot with a treasury. Green on black. A Solana bonding curve instead of a punchline. $TICK mints in public, the clock is on this page, and the float is for anyone with a wallet.",
    lore: "Internet frogs outlive the forums they came from. $TICK puts that staying power on a curve you can trade.",
    community: "If you are early, you are the pond. Share the page. Be here at T-0.",
    blurb: "A public Solana frog with a live clock.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website. Trading opens." },
      { title: "Afterglow", body: "Fees through graduate. Partner LP locked." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate. No silent mint switch." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Community first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve. Bars on this page match the mint." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a legendary internet frog in sharp streetwear, wet green skin, cinematic 3D close-up, museum lighting, no text, no UI",
    heroSubject: "a frog mascot standing in a neon swamp city at night, volumetric fog, cinematic wide shot, no text, no UI",
  };
}

function dogWorld(): World {
  return {
    id: "dog",
    brandName: "",
    tickers: [],
    themeId: "dog",
    layout: "pulse",
    motion: "wave",
    colors: { bg: "#0b0a10", ink: "#f6ead2", accent: "#ffb020", muted: "#b7a078", card: "#16141c", glow: "#ffb020", line: "#3a3020", glow2: "#ffe08a" },
    labels: { story: "The Pack", split: "The Cut", buy: "Get In", path: "The Run", faq: "Bark", lore: "Origin", join: "The Pack", kicker: "PACK · PUBLIC CURVE" },
    tagline: "Street dog. Public curve. Show up.",
    manifesto: "$NAME is a pack mascot with a treasury and a Solana bonding curve. The hat is optional. The clock is not. $TICK mints in public and the CA drops on this page at T-0.",
    lore: "Dog coins live because people show up. $TICK is that showing-up, with published slices and a live countdown.",
    community: "Share the site. Load the clock. Be on the page at T-0.",
    blurb: "A pack coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website. Trading opens." },
      { title: "Afterglow", body: "Fees through graduate. Partner LP locked." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Pack first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a charismatic street dog in drip, cinematic 3D close-up portrait, rim light, no text, no UI",
    heroSubject: "a street-dog mascot on a night city corner, cinematic wide shot, no text, no UI",
  };
}

function catWorld(): World {
  return {
    id: "cat",
    brandName: "",
    tickers: [],
    themeId: "cat",
    layout: "studio",
    motion: "aurora",
    colors: { bg: "#120814", ink: "#fde8ff", accent: "#ff4d9a", muted: "#c9a0c0", card: "#1c101c", glow: "#ff4d9a", line: "#3a2438" },
    labels: { story: "Atelier", split: "The Ledger", buy: "Collect", path: "Nine Lives", faq: "Notes", lore: "Myth", join: "Salon", kicker: "NINE LIVES · PUBLIC MINT" },
    tagline: "Soft paws. Hard curve.",
    manifesto: "$NAME is a cat-cult memecoin with a public Solana curve. Pink light, quiet arrogance, published slices. $TICK drops its CA on this page at T-0.",
    lore: "Cats take the timeline. $TICK takes a bonding curve.",
    community: "If you are early, you already live here. Be on the page at T-0.",
    blurb: "A cat coin with a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website." },
      { title: "Afterglow", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Community first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a stylish cat with cosmic eyes, cinematic 3D close-up, velvet light, no text, no UI",
    heroSubject: "a cat mascot on a moonlit rooftop city, cinematic wide shot, no text, no UI",
  };
}

function aiWorld(): World {
  return {
    id: "ai",
    brandName: "",
    tickers: [],
    themeId: "ai",
    layout: "terminal",
    motion: "scan",
    colors: { bg: "#05070d", ink: "#e8f6ff", accent: "#3ce7ff", muted: "#7aa0b8", card: "#0b1220", glow: "#3ce7ff", line: "#1a2a40", glow2: "#b07cff" },
    labels: { story: "MANIFEST", split: "ALLOC", buy: "ACQUIRE", path: "TIMELINE", faq: "FAQ", lore: "LOG", join: "NET", kicker: "SYS · ONLINE" },
    tagline: "Inference with a ticker. Settlement on Solana.",
    manifesto: "$NAME is a machine-cult memecoin: glass, circuitry, a public bonding curve. $TICK does not ask for a whitepaper. It publishes a clock, a supply, and a CA at T-0.",
    lore: "Every model wants a mascot. $TICK is that mascot with a treasury and a curve.",
    community: "Stay on the terminal. The CA prints here at T-0.",
    blurb: "A machine coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Boot", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA prints on this terminal." },
      { title: "Runtime", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Open net", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a luminous AI entity of glass and circuitry, cinematic 3D close-up, cyan rim light, no text, no UI",
    heroSubject: "a glass AI idol in a dark server cathedral, volumetric light, cinematic wide shot, no text, no UI",
  };
}

function spaceWorld(): World {
  return {
    id: "space",
    brandName: "",
    tickers: [],
    themeId: "space",
    layout: "orbital",
    motion: "orbit",
    colors: { bg: "#05040c", ink: "#f0ecff", accent: "#8b6cff", muted: "#9a94c0", card: "#0e0c18", glow: "#8b6cff", line: "#262040" },
    labels: { story: "Core", split: "Mass", buy: "Dock", path: "Flight Plan", faq: "Briefing", lore: "Myth", join: "Crew", kicker: "ORBIT · PUBLIC BURN" },
    tagline: "A mascot in orbit. A curve on Solana.",
    manifesto: "$NAME is a space-cult memecoin. Violet void, a public bonding curve, a clock you can watch. $TICK publishes its CA on this page at T-0.",
    lore: "Every launch window needs a patch. $TICK is that patch with a treasury.",
    community: "Dock here at T-0. The CA is the only signal.",
    blurb: "An orbital coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website." },
      { title: "Afterglow", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Crew first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "an astronaut mascot above a neon planet, cinematic 3D close-up, no text, no UI",
    heroSubject: "an astronaut mascot floating over a violet planet, volumetric stars, cinematic wide shot, no text, no UI",
  };
}

function animeWorld(): World {
  return {
    id: "anime",
    brandName: "",
    tickers: [],
    themeId: "anime",
    layout: "cinema",
    motion: "aurora",
    colors: { bg: "#120814", ink: "#ffe8f4", accent: "#ff5ad5", muted: "#c8a0b8", card: "#1c101c", glow: "#ff5ad5", line: "#3a2438", glow2: "#7cf0ff" },
    labels: { story: "The Picture", split: "The Split", buy: "Get In", path: "The Reels", faq: "Notes", lore: "Origin Story", join: "The House", kicker: "EPISODE 01 · T-0" },
    tagline: "Opening credits. Public mint.",
    manifesto: "$NAME is an anime-world memecoin: electric hair, night city, a Solana bonding curve. $TICK treats T-0 like an episode drop. The CA publishes on this page.",
    lore: "Every series needs a sigil. $TICK is that sigil with a treasury.",
    community: "Be in the theater at T-0.",
    blurb: "An anime-world coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website." },
      { title: "Afterglow", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Community first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "an original anime hero mascot with electric hair, cinematic close-up, no text, no UI, not a copyrighted character",
    heroSubject: "an original anime hero on a neon night overpass, cinematic wide shot, no text, no UI, not a copyrighted character",
  };
}

function goldWorld(): World {
  return {
    id: "gold",
    brandName: "",
    tickers: [],
    themeId: "gold",
    layout: "studio",
    motion: "particles",
    colors: { bg: "#0c0a06", ink: "#fff4d2", accent: "#f0c14a", muted: "#c4b07a", card: "#16120a", glow: "#f0c14a", line: "#3a3018" },
    labels: { story: "Vault", split: "The Ledger", buy: "Acquire", path: "Issue Map", faq: "Notes", lore: "Backstory", join: "Salon", kicker: "VAULT · PUBLIC MINT" },
    tagline: "Molten metal. Public mint.",
    manifesto: "$NAME is a vault-cult memecoin. Gold light, a public Solana curve, published slices. $TICK drops the CA on this page at T-0.",
    lore: "Treasure stories need a coin. $TICK is that coin with a clock.",
    community: "Be at the vault door at T-0.",
    blurb: "A vault coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website." },
      { title: "Afterglow", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Community first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a golden idol dripping molten metal, cinematic 3D close-up, no text, no UI",
    heroSubject: "a golden idol in a dark vault of light, cinematic wide shot, no text, no UI",
  };
}

function fireWorld(): World {
  return {
    id: "fire",
    brandName: "",
    tickers: [],
    themeId: "fire",
    layout: "pulse",
    motion: "wave",
    colors: { bg: "#120604", ink: "#ffe8d8", accent: "#ff4d2a", muted: "#c89878", card: "#1c0c08", glow: "#ff6a1a", line: "#3a2014" },
    labels: { story: "The Drop", split: "The Cut", buy: "How to buy", path: "The Run", faq: "Wait what", lore: "Why it hits", join: "Squad", kicker: "HEAT · PUBLIC BURN" },
    tagline: "Heat on a public curve.",
    manifesto: "$NAME is a heat-cult memecoin. Ember light, a Solana bonding curve, a clock. $TICK publishes the CA on this page at T-0.",
    lore: "Fire coins last as long as the crowd. $TICK puts that crowd on-chain.",
    community: "Be here when it lights. T-0 is the spark.",
    blurb: "A heat coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website." },
      { title: "Afterglow", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Community first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a compact flame idol, cinematic 3D close-up, ember rim light, no text, no UI",
    heroSubject: "a flame idol over a dark city, cinematic wide shot, no text, no UI",
  };
}

function oceanWorld(): World {
  return {
    id: "ocean",
    brandName: "",
    tickers: [],
    themeId: "ocean",
    layout: "glass",
    motion: "wave",
    colors: { bg: "#041018", ink: "#e4f6ff", accent: "#1ec8c8", muted: "#7aa8b8", card: "#0a1a22", glow: "#1ec8c8", line: "#1a3840" },
    labels: { story: "Atelier", split: "Composition", buy: "Collect", path: "Sequence", faq: "Notes", lore: "Lore", join: "Circle", kicker: "TIDE · PUBLIC FLOAT" },
    tagline: "Deep water. Public float.",
    manifesto: "$NAME is a tide-cult memecoin. Glass green, a Solana bonding curve, a clock. $TICK publishes the CA on this page at T-0.",
    lore: "The ocean keeps secrets. $TICK publishes the supply instead.",
    community: "Be on the beach at T-0.",
    blurb: "A tide coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website." },
      { title: "Afterglow", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Community first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a tide idol of glass and sea-foam, cinematic 3D close-up, no text, no UI",
    heroSubject: "a glass tide idol over a night ocean, cinematic wide shot, no text, no UI",
  };
}

function skullWorld(): World {
  return {
    id: "skull",
    brandName: "",
    tickers: [],
    themeId: "skull",
    layout: "brutal",
    motion: "scan",
    colors: { bg: "#080808", ink: "#f2f2f0", accent: "#ff2a4a", muted: "#9a9a94", card: "#121212", glow: "#ff2a4a", line: "#2a2a2a" },
    labels: { story: "STATEMENT", split: "TOKENOMICS", buy: "HOW TO BUY", path: "ROADMAP", faq: "FAQ", lore: "LORE", join: "JOIN", kicker: "SIGNAL · PUBLIC MINT" },
    tagline: "Grin first. Mint second.",
    manifesto: "$NAME is a death-cult memecoin with a public Solana curve. Black, red, published slices. $TICK drops the CA on this page at T-0.",
    lore: "Skulls last. $TICK puts that on a clock.",
    community: "Show up at T-0. That is the whole speech.",
    blurb: "A skull coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website." },
      { title: "Afterglow", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Community first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a jeweled skull mascot with a grin, cinematic 3D close-up, no text, no UI",
    heroSubject: "a jeweled skull over a black stage, cinematic wide shot, no text, no UI",
  };
}

function apeWorld(): World {
  return {
    id: "ape",
    brandName: "",
    tickers: [],
    themeId: "ape",
    layout: "brutal",
    motion: "scan",
    colors: { bg: "#100c0a", ink: "#f6ead8", accent: "#e07a2a", muted: "#b89870", card: "#1c1410", glow: "#e07a2a", line: "#3a2a1c" },
    labels: { story: "STATEMENT", split: "TOKENOMICS", buy: "HOW TO BUY", path: "ROADMAP", faq: "FAQ", lore: "LORE", join: "JOIN", kicker: "TROOP · PUBLIC MINT" },
    tagline: "Troop first. Curve second.",
    manifesto: "$NAME is an ape-cult memecoin with a public Solana curve. Heavy chain, published slices, a clock. $TICK drops the CA on this page at T-0.",
    lore: "Ape coins are crowds with a face. $TICK is that face with a treasury.",
    community: "The troop is whoever is on this page at T-0.",
    blurb: "An ape coin on a public Solana curve.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "CA publishes on this website." },
      { title: "Afterglow", body: "Partner LP locked at graduate." },
    ],
    features: [
      { title: "On-chain float", body: "The supply on this page is the supply that mints." },
      { title: "Locked path", body: "Partner LP locks on graduate." },
      { title: "Public clock", body: "The countdown here is the launch clock." },
      { title: "Community first", body: "Most of $TICK sits on the curve." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with a public curve and a live countdown." },
      { q: "When does the CA go live?", a: "On this page at T-0." },
      { q: "How do I buy?", a: "Fund a Solana wallet. Copy the CA at T-0. Swap on the curve." },
      { q: "Who holds team tokens?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve." },
      { q: "Is liquidity locked?", a: "Partner LP permanently locked at graduate." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet. Keep extra for fees." },
      { n: "02", title: "Wait for T-0", body: "CA publishes on this page." },
      { n: "03", title: "Swap", body: "Paste the CA. Pay SOL. Receive $TICK." },
      { n: "04", title: "Hold or trade", body: "Same curve through graduate." },
    ],
    artSubject: "a fashion ape in a heavy gold chain, cinematic 3D close-up, no text, no UI",
    heroSubject: "a fashion ape on a brutalist night plaza, cinematic wide shot, no text, no UI",
  };
}

function genericWorld(seed: string): World {
  const layout = hashPick(seed, LAYOUTS);
  const motion: Record<WorldLayout, WorldMotion> = {
    cinema: "aurora",
    terminal: "scan",
    studio: "particles",
    neon: "grid",
    glass: "aurora",
    brutal: "scan",
    orbital: "orbit",
    pulse: "wave",
  };
  return {
    id: "generic",
    brandName: "",
    tickers: [],
    themeId: "neon",
    layout,
    motion: motion[layout],
    colors: { bg: "#07070c", ink: "#f4f4f8", accent: "#7c5cff", muted: "#9aa0b8", card: "#12121a", glow: "#5ce1ff", line: "#2a2a38", glow2: "#7c5cff" },
    labels: { story: "Manifest", split: "Allocation", buy: "Acquire", path: "Timeline", faq: "FAQ", lore: "Lore", join: "Crew", kicker: "PUBLIC MINT · T-0" },
    tagline: "A public Solana curve. A clock you can watch.",
    manifesto:
      "$NAME is a standalone Solana memecoin with a live countdown, published tokenomics, and a community float that actually mints. The site, the art, and the curve are built for this ticker. When the clock dies, the CA is the only thing that matters.",
    lore: "Every culture online eventually grows a mascot. $NAME is that mascot with a treasury, a curve, and a launch window you can watch.",
    community: "If you are here early, you are the culture. Share the site, load the clock, and be on the page at T-0.",
    blurb: "A public Solana memecoin with a live clock.",
    about: "$NAME is a Solana memecoin with published tokenomics and a public countdown to the CA.",
    howToBuy: "Fund a Solana wallet with SOL. This page publishes the CA at T-0. Swap SOL for $TICK on the bonding curve.",
    warning: "Memecoins can go to zero. This is not financial advice. You can lose the SOL you swap. Do your own research.",
    roadmap: [
      { title: "Ignition", body: "Mint, unique curve config, team slices, and metadata. No opening buy." },
      { title: "Public T-0", body: "The contract address publishes on this website and community trading opens." },
      { title: "Afterglow", body: "1% fee through graduate. Partner LP permanently locked." },
    ],
    features: [
      { title: "On-chain float", body: "$TICK launches on a public Solana bonding curve. The supply on this page is the supply that mints." },
      { title: "Locked liquidity path", body: "Curve fees stay on the pool. Partner LP locks on graduate. No silent mint switch after T-0." },
      { title: "Public clock", body: "The countdown on this site is the launch clock. The contract address publishes here at T-0." },
      { title: "Community first", body: "Most of the supply sits on the curve for anyone with a Solana wallet." },
    ],
    faq: [
      { q: "What is $TICK?", a: "$NAME is a Solana memecoin with published tokenomics and a live countdown to the public CA." },
      { q: "When does the CA go live?", a: "The contract address appears on this page at T-0. Until then the clock is the only public signal." },
      { q: "How do I buy?", a: "Fund a Solana wallet with SOL. At T-0 copy the CA from this site and swap on the bonding curve." },
      { q: "Who holds the team slice?", a: "One isolated project wallet holds 8–11% at T-30. The rest sits on the curve. Percentages on this page match the mint." },
      { q: "Is liquidity locked?", a: "The curve uses a unique config. Partner LP is permanently locked at graduate. No opening buy — the curve is empty at T-30." },
    ],
    buySteps: [
      { n: "01", title: "Get SOL", body: "Fund a Solana wallet from an exchange. Keep a little extra for fees." },
      { n: "02", title: "Wait for T-0", body: "This page publishes the contract address the second the public clock hits zero." },
      { n: "03", title: "Swap on the curve", body: "Paste the CA, pay in SOL, receive $TICK. Slippage is yours to set." },
      { n: "04", title: "Hold or trade", body: "The same curve stays live through graduate. Track it on Dexscreener once the pair indexes." },
    ],
    artSubject: "a unique original mascot idol, cinematic 3D close-up, tactile materials, museum lighting, no text, no UI, no watermark",
    heroSubject: "the mascot standing inside a custom night world, wide IMAX still, volumetric atmosphere, no text, no UI, no watermark",
  };
}

export function detectWorldId(idea: string): WorldId {
  const s = (idea || "").toLowerCase();
  if (/\b(gta\s*6|gta6|gta\s*vi|grand\s*theft|vice\s*city|leonida|vice\s*beach|miami\s*vice)\b/.test(s)) return "vice";
  if (/\b(pepe|frog|toad|ribbit)\b/.test(s)) return "frog";
  if (/\b(dog|wif|bonk|woof|pup|doge|shiba)\b/.test(s)) return "dog";
  if (/\b(cat|kitty|meow|kitten|popcat|michi)\b/.test(s)) return "cat";
  if (/\b(anime|senpai|kawaii|waifu|manga)\b/.test(s)) return "anime";
  if (/\b(ai|agent|gpt|neural|llm|robot|android|cyber)\b/.test(s)) return "ai";
  if (/\b(space|mars|orbit|astro|moon|lunar|rocket)\b/.test(s)) return "space";
  if (/\b(gold|vault|treasure|ore)\b/.test(s)) return "gold";
  if (/\b(fire|flame|burn|heat|ember)\b/.test(s)) return "fire";
  if (/\b(ocean|wave|tide|sea|salt)\b/.test(s)) return "ocean";
  if (/\b(skull|grave|bonez|skeleton)\b/.test(s)) return "skull";
  if (/\b(ape|monkey|chimp|gorilla|pnut|ponke)\b/.test(s)) return "ape";
  return "generic";
}

function rawWorld(idea: string): World {
  const id = detectWorldId(idea);
  if (id === "vice") return viceWorld();
  if (id === "frog") return frogWorld();
  if (id === "dog") return dogWorld();
  if (id === "cat") return catWorld();
  if (id === "ai") return aiWorld();
  if (id === "space") return spaceWorld();
  if (id === "anime") return animeWorld();
  if (id === "gold") return goldWorld();
  if (id === "fire") return fireWorld();
  if (id === "ocean") return oceanWorld();
  if (id === "skull") return skullWorld();
  if (id === "ape") return apeWorld();
  return genericWorld(idea || "meme");
}

export function worldOf(idea: string, name = "", symbol = ""): World {
  const base = rawWorld(idea);
  const n = name || base.brandName || "TOKEN";
  const t = (symbol || base.tickers[0] || "MEME").replace(/^\$/, "").toUpperCase();
  return fillAll(base, n, t);
}

export function echoesIdea(text: string, idea: string): boolean {
  const t = (text || "").toLowerCase();
  const raw = (idea || "").trim().toLowerCase();
  if (!t) return false;
  if (t.includes("started as a raw idea")) return true;
  if (t.includes("raw idea:")) return true;
  if (raw.length >= 10 && t.includes(raw)) return true;
  if (raw.length >= 12 && t.includes(raw.slice(0, 24))) return true;
  return false;
}

export function nameLooksLikePrompt(name: string, idea: string): boolean {
  const n = (name || "").trim().toLowerCase();
  const raw = (idea || "").trim().toLowerCase();
  if (!n || !raw) return false;
  if (n.length > 18) return true;
  if (raw.startsWith(n) && n.length >= 5) return true;
  const first = raw.split(/\s+/).find((w) => w.length >= 3) || "";
  if (first && n === first) return true;
  return false;
}

function hexHue(hex: string): number | null {
  const raw = (hex || "").trim();
  const hsl = raw.match(/hsl\(\s*(\d+)/i);
  if (hsl) return Number(hsl[1]);
  const h = raw.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const r = Number.parseInt(full.slice(0, 2), 16) / 255;
  const g = Number.parseInt(full.slice(2, 4), 16) / 255;
  const b = Number.parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;
  return hue * 360;
}

export function looksWarmBrown(colors: { accent?: string; glow?: string; bg?: string }): boolean {
  const hues = [hexHue(colors.accent || ""), hexHue(colors.glow || "")].filter((n): n is number => n != null);
  if (!hues.length) return false;
  return hues.some((h) => h >= 12 && h <= 55);
}

export type Dressable = {
  idea?: string;
  name: string;
  symbol: string;
  blurb: string;
  about: string;
  howToBuy: string;
  roadmap: { title: string; body: string }[];
  colors: WorldTheme;
  layout: string;
  motion: string;
  tagline?: string;
  manifesto?: string;
  lore?: string;
  community?: string;
  warning?: string;
  features?: { title: string; body: string }[];
  faq?: { q: string; a: string }[];
  buySteps?: { n: string; title: string; body: string }[];
  labels?: WorldLabels;
  worldId?: string;
  identityLocked?: boolean;
};

export function dressSitePack<T extends Dressable>(pack: T): T {
  const idea = pack.idea || pack.name || "";
  const seed = worldOf(idea);
  const locked = Boolean(pack.identityLocked);
  const badName = !locked && nameLooksLikePrompt(pack.name, idea);
  const displayName = locked
    ? pack.name || seed.brandName
    : seed.brandName && (badName || !pack.name)
      ? seed.brandName
      : pack.name || seed.brandName;
  const world = worldOf(idea, displayName, pack.symbol);
  const copy = [pack.manifesto, pack.about, pack.blurb, pack.tagline, pack.lore, JSON.stringify(pack.faq || [])].join("\n");
  const badCopy = echoesIdea(copy, idea);
  const known = world.id !== "generic";
  const badPalette = known && looksWarmBrown(pack.colors);
  const next: T = { ...pack };
  next.worldId = world.id;
  next.labels = world.labels;
  if (known || badPalette) {
    next.colors = { ...world.colors };
    next.layout = world.layout;
    next.motion = world.motion;
  }
  if (badName && world.brandName && !locked) next.name = world.brandName;
  if (badCopy) {
    next.tagline = world.tagline;
    next.manifesto = world.manifesto;
    next.lore = world.lore;
    next.community = world.community;
    next.blurb = world.blurb;
    next.about = world.about;
    next.howToBuy = world.howToBuy;
    next.warning = world.warning;
    next.roadmap = world.roadmap;
    next.features = world.features;
    next.faq = world.faq;
    next.buySteps = world.buySteps;
  }
  return next;
}
