import { XAI_API_KEY, XAI_BASE, XAI_MODEL } from "../config";
import {
  PAIRS,
  STEPS,
  fakeCandles,
  fakeCurve,
  fakeSleeves,
  mulberry,
  pick,
  type Candle,
  type CurveBar,
  type SleeveBar,
  type Step,
} from "./chart";

export type Aspect = "1:1" | "16:9" | "9:16";
export type Layout =
  | "face"
  | "desk"
  | "story"
  | "tape"
  | "split"
  | "sleeves"
  | "steps"
  | "quote"
  | "session"
  | "kill"
  | "pairs"
  | "curve";

export type Mood = "acid" | "violet" | "cyan" | "blood";
export type Compose = "bleed-bottom" | "bleed-side" | "bleed-top" | "type-hero" | "tape-sky" | "orbit" | "kill-wash";
export type Asset = "solphia-face.png" | "solphia-hero.png" | "solphia-head.png";

export type Fit = "cover" | "left" | "right";

export type Art = {
  compose: Compose;
  asset: Asset;
  fit: Fit;
  cropX: number;
  cropY: number;
  shiftX: number;
  shiftY: number;
  fade: "left" | "right" | "bottom" | "top" | "center";
  stars: number;
  tape: boolean;
  typeScale: number;
};

export type Shot = {
  aspect: Aspect;
  layout: Layout;
  headline: string;
  caption: string;
  pnlLabel: string;
  kicker: string;
  sub: string;
  mood: Mood;
  pair: string;
  session: string;
  candles: Candle[];
  sleeves: SleeveBar[];
  curve: CurveBar[];
  steps: Step[];
  chips: string[];
  art: Art;
};

const JOB =
  "She holds SOL, USDC, and official SPYx (S&P 500), QQQx (Nasdaq-100), and GLDx (gold). She trades whichever pair is stretched. Spot only. Keys stay in Phantom. No memecoins. No copy list. No sniper.";

const HEADLINES: Record<Layout, string[]> = {
  face: ["She watches the tape", "Your SOL. Her night shift.", "The face of the desk", "Calm. Then a clip."],
  desk: ["SOL vs S&P, Nasdaq, gold", "Five sleeves. One home.", "Official xStocks only", "The book is USDC."],
  story: ["Add SOL. She runs.", "Connect once. No popups.", "Paper first. Then live.", "She sits when nothing moved."],
  tape: ["When it stretches, she clips", "A quiet range. Then 1%.", "Mean revert. Not a knife.", "The short tape just spoke."],
  split: ["Watch the stretch", "SOL dumped. Gold held.", "She fades the gap", "Chart in one eye. Pair in the other."],
  sleeves: ["Split the bag. Wait.", "20% each. Fire the stretched one.", "USDC is home.", "Gold sleeve for bad days."],
  steps: ["Three steps. Then sleep.", "Connect. Add. She works.", "Phantom once. That’s it.", "No extra signatures."],
  quote: ["Keys never leave the phone.", "Not a fund. A bot on your device.", "xStocks stay spot. SOL 2×/3× is optional.", "She skips more than she trades."],
  session: ["Cash hours hit different", "After 4pm this is not New York", "Weekend gold still moves", "She knows the session."],
  kill: ["KILL flattens her.", "One switch. Back to dry powder.", "You stay in charge.", "Pause. Withdraw. Done."],
  pairs: ["Ten pairs. Nothing else.", "USDC / gold is a trade.", "Not a memecoin menu.", "Official rails only."],
  curve: ["Quiet compounding", "The line is the point", "Fees already in the mark", "Paper so the PnL isn’t a fairy tale."],
};

const SUBS = [
  "Illustrative mark — not a live book.",
  "xStocks stay spot. SOL 2×/3× optional.",
  "Official SPYx · QQQx · GLDx.",
  "Phantom holds the keys.",
  "2-minute wait. Then a clip.",
  "0.1 or 0.15 SOL / 30d · 0.1% a clip.",
  "Kill switch always on.",
  "PnL home is USDC.",
];

const KICKERS = [
  "SOL · SPYx · QQQx · GLDx · USDC",
  "solphia.io",
  "NON-CUSTODIAL",
  "PHANTOM ONLY",
  "PAPER FIRST",
  "SHE SITS WHEN IT’S NOISE",
];

const BEATS = [
  "Connect Phantom once. Add SOL. She splits the bag across SOL, USDC, S&P 500, Nasdaq-100, and gold.",
  "When SOL looks expensive vs a market she sells SOL for that token. When it looks cheap she buys SOL back.",
  "She skips crash knives, weekend fake prints, and any clip fees would eat.",
  "PnL stays in USDC. Kill switch always on.",
  "Live is 0.1 SOL / 30 days. SOL 2×/3× is 0.15. Plus 0.1% a clip. Paper is free.",
  "These tokens are not the New York print after 16:00 ET. You can lose SOL.",
  "No memecoins, no copy list, no sniper. Ten pairs among five official sleeves.",
  "Connect and add SOL once. The trading wallet on your device signs. Phantom is not asked again until you withdraw.",
];

const SESSIONS = ["CASH SESSION", "AFTER HOURS", "WEEKEND TAPE"];
const MOODS: Mood[] = ["acid", "violet", "cyan"];
const ASSETS: Asset[] = ["solphia-face.png", "solphia-hero.png"];
const COMPOSES: Compose[] = ["bleed-bottom", "bleed-side", "bleed-top", "type-hero", "tape-sky", "orbit"];
const FADES: Art["fade"][] = ["left", "right", "bottom", "top", "center"];
const CHIPS = ["SPOT xSTOCKS", "OPT 2×/3×", "PHANTOM", "USDC PnL", "2m WAIT", "KILL ON", "xSTOCKS", "PAPER FIRST"];

const ALL_LAYOUTS: Layout[] = [
  "face",
  "desk",
  "story",
  "tape",
  "split",
  "sleeves",
  "steps",
  "quote",
  "session",
  "kill",
  "pairs",
  "curve",
];

function aspectFor(layout: Layout, rng: () => number): Aspect {
  if (layout === "desk" || layout === "session") return rng() > 0.35 ? "16:9" : "1:1";
  if (layout === "story" || layout === "kill" || layout === "quote" || layout === "steps") return rng() > 0.28 ? "9:16" : "1:1";
  if (layout === "tape" || layout === "curve") return rng() > 0.55 ? "1:1" : "9:16";
  return pick(rng, ["1:1", "9:16", "1:1", "16:9"] as Aspect[]);
}

function directArt(layout: Layout, aspect: Aspect, rng: () => number, used: Compose[]): Art {
  let fit: Fit = "cover";
  let compose: Compose;
  if (aspect === "16:9") {
    fit = rng() > 0.5 ? "left" : "right";
    compose = "bleed-side";
  } else if (layout === "kill") {
    compose = "kill-wash";
    fit = "cover";
  } else if (layout === "tape" || layout === "curve") {
    compose = "tape-sky";
    fit = "cover";
  } else {
    const pool = COMPOSES.filter((c) => c !== "bleed-side");
    compose = pick(rng, pool);
    if (used.includes(compose)) compose = pick(rng, pool, compose);
    fit = "cover";
  }
  return {
    compose,
    fit,
    asset: pick(rng, ASSETS),
    cropX: 42 + rng() * 16,
    cropY: aspect === "9:16" ? 0 : 6 + rng() * 12,
    shiftX: 0,
    shiftY: 0,
    fade: aspect === "16:9" ? (fit === "left" ? "right" : "left") : pick(rng, ["bottom", "bottom", "top", "center"] as Art["fade"][]),
    stars: 6 + Math.floor(rng() * 8),
    tape: compose === "tape-sky" || (aspect === "16:9" && rng() > 0.4) || rng() > 0.62,
    typeScale: 0.92 + rng() * 0.22,
  };
}

export function aestheticPnl(seed: number) {
  const rng = mulberry(seed);
  const pct = 0.4 + rng() * 3.2;
  const usd = 16 + rng() * 94;
  return `+${pct.toFixed(1)}% · +$${usd.toFixed(0)} USDC`;
}

function biasLayouts(hint: string): Layout[] {
  const h = hint.toLowerCase();
  if (h.includes("gold") || h.includes("gld")) return ["sleeves", "split", "tape", "quote", "face"];
  if (h.includes("how") || h.includes("step") || h.includes("start")) return ["steps", "story", "kill", "face"];
  if (h.includes("chart") || h.includes("pnl") || h.includes("candle") || h.includes("tape")) return ["tape", "curve", "split", "desk"];
  if (h.includes("weekend") || h.includes("session") || h.includes("after")) return ["session", "quote", "tape", "story"];
  if (h.includes("kill") || h.includes("stop")) return ["kill", "steps", "quote"];
  return ALL_LAYOUTS;
}

function emptyVisual(rng: () => number) {
  return {
    candles: fakeCandles(rng),
    sleeves: fakeSleeves(rng),
    curve: fakeCurve(rng),
    steps: STEPS,
    chips: [pick(rng, CHIPS), pick(rng, CHIPS), pick(rng, CHIPS)].filter((v, i, a) => a.indexOf(v) === i),
  };
}

export function localPack(now = Date.now(), hint = ""): Shot[] {
  const rng0 = mulberry(now);
  const pool = biasLayouts(hint);
  const layouts: Layout[] = [];
  let guard = 0;
  while (layouts.length < 4 && guard++ < 48) {
    const next = pick(rng0, pool.length > layouts.length ? pool : ALL_LAYOUTS);
    if (!layouts.includes(next)) layouts.push(next);
  }
  let lastHead = "";
  const usedCompose: Compose[] = [];
  return layouts.slice(0, 4).map((layout, i) => {
    const rng = mulberry(now + (i + 1) * 7919);
    const aspect = aspectFor(layout, rng);
    const headline = pick(rng, HEADLINES[layout], lastHead);
    lastHead = headline;
    const pnlLabel = aestheticPnl(now + i * 13);
    const beatA = pick(rng, BEATS);
    const beatB = pick(rng, BEATS, beatA);
    const extra = hint.trim() ? `\n\n${hint.trim()}` : "";
    const pair = pick(rng, PAIRS);
    const vis = emptyVisual(rng);
    const caption = `${JOB}\n\n${beatA} ${beatB}\n\nIllustrative mark ${pnlLabel} — for the post, not a live book.${extra}\n\nsolphia.io`;
    const art = directArt(layout, aspect, rng, usedCompose);
    usedCompose.push(art.compose);
    return {
      aspect,
      layout,
      headline,
      caption,
      pnlLabel,
      kicker: pick(rng, KICKERS),
      sub: pick(rng, SUBS),
      mood: layout === "kill" ? "blood" : layout === "session" ? "cyan" : pick(rng, MOODS),
      pair,
      session: pick(rng, SESSIONS),
      art,
      ...vis,
    };
  });
}

function parseShots(raw: string, fallback: Shot[]): Shot[] | null {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const rows = JSON.parse(match[0]) as Partial<Shot>[];
    if (!Array.isArray(rows) || rows.length < 3) return null;
    return fallback.map((base, i) => {
      const row = rows[i] || {};
      return {
        ...base,
        headline: String(row.headline || base.headline).slice(0, 72),
        caption: String(row.caption || base.caption).slice(0, 900),
        pnlLabel: String(row.pnlLabel || base.pnlLabel).slice(0, 40),
        kicker: String(row.kicker || base.kicker).slice(0, 48),
        sub: String(row.sub || base.sub).slice(0, 80),
      };
    });
  } catch {
    return null;
  }
}

async function grokPack(hint: string, fallback: Shot[]): Promise<Shot[] | null> {
  if (!XAI_API_KEY) return null;
  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${XAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `You are Solphia's in-house content bot. You only write social posts for solphia.io.
She is a non-custodial Solana bot. She holds SOL, USDC, official SPYx, QQQx, and GLDx. xStocks stay spot. Optional SOL 2×/3× is Jupiter Perps-style with liquidation. Phantom only. No memecoins, copy, or sniper.
Return ONLY a JSON array of 4 objects with keys: headline, caption, pnlLabel, kicker, sub.
PnL is aesthetic (like +1.4% · +$42 USDC), labeled as not a live book.
Captions must include solphia.io and a one-line explanation of what she does.
Headlines under 8 words. No hashtag dump. No seed/keys. Make them feel like they belong on X, Instagram, and TikTok.`,
        },
        {
          role: "user",
          content: hint.trim()
            ? `Write 4 posts. Angle: ${hint.trim()}. Layouts: ${fallback.map((s) => s.layout).join(", ")}.`
            : `Write 4 posts for layouts: ${fallback.map((s) => s.layout).join(", ")}.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content || "";
  return parseShots(text, fallback);
}

export async function writePack(opts?: { hint?: string; now?: number }): Promise<Shot[]> {
  const now = opts?.now ?? Date.now();
  const hint = opts?.hint || "";
  const local = localPack(now, hint);
  try {
    const grok = await grokPack(hint, local);
    if (grok) return grok;
  } catch {
    /* local always works */
  }
  return local;
}

export function packNote(shots: Shot[]) {
  return `Wrote ${shots.length}: ${shots.map((s) => `${s.layout} “${s.headline}”`).join(" · ")}`;
}
