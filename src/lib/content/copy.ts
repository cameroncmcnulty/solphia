import { XAI_API_KEY, XAI_BASE, XAI_MODEL } from "../config";

export type Aspect = "1:1" | "16:9" | "9:16";

export type Shot = {
  aspect: Aspect;
  layout: "face" | "desk" | "story";
  headline: string;
  caption: string;
  pnlLabel: string;
  kicker: string;
};

const JOB =
  "She holds SOL, USDC, and official SPYx (S&P 500), QQQx (Nasdaq-100), and GLDx (gold). She trades whichever pair is stretched. Spot only. Keys stay in Phantom. No memecoins. No copy list. No sniper.";

const HEADLINES = [
  "She watches the tape",
  "Add SOL. She runs.",
  "SOL vs S&P, Nasdaq, gold",
  "When it stretches, she clips",
  "She sits when nothing moved",
  "Spot only. Keys with you.",
  "Official xStocks. Nothing else.",
  "Paper first. Kill switch on.",
  "Five sleeves. One home: USDC.",
  "Connect once. No extra popups.",
];

const KICKERS = [
  "SOL · SPYx · QQQx · GLDx · USDC",
  "solphia.io",
  "NON-CUSTODIAL · SPOT",
  "PHANTOM ONLY",
];

const BEATS = [
  "Connect Phantom once. Add SOL. She splits the bag across SOL, USDC, S&P 500, Nasdaq-100, and gold.",
  "When SOL looks expensive vs a market she sells SOL for that token. When it looks cheap she buys SOL back.",
  "She skips crash knives, weekend fake prints, and any clip fees would eat.",
  "PnL stays in USDC. Kill switch always on.",
  "Live is 0.2 SOL / 30 days plus 0.1% a clip. Paper is free.",
];

function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, xs: T[], avoid?: T): T {
  const pool = avoid ? xs.filter((x) => x !== avoid) : xs;
  return pool[Math.floor(rng() * pool.length)] || xs[0];
}

export function aestheticPnl(seed: number) {
  const rng = mulberry(seed);
  const pct = 0.4 + rng() * 3.2;
  const usd = 16 + rng() * 94;
  return `+${pct.toFixed(1)}% · +$${usd.toFixed(0)} USDC`;
}

function bias(hint: string) {
  const h = hint.toLowerCase();
  if (h.includes("gold") || h.includes("gld")) {
    return HEADLINES.filter((x) => /gold|sit|stretch|clip/i.test(x)).concat(["Gold when the rest panics"]);
  }
  if (h.includes("nasdaq") || h.includes("qqq")) {
    return HEADLINES.filter((x) => /nasdaq|tape|clip|spot/i.test(x)).concat(["Nasdaq sleeve, official QQQx"]);
  }
  if (h.includes("s&p") || h.includes("spy")) {
    return HEADLINES.filter((x) => /s&p|tape|official/i.test(x)).concat(["S&P 500 on Solana rails"]);
  }
  return HEADLINES;
}

export function localPack(now = Date.now(), hint = ""): Shot[] {
  const heads = bias(hint);
  const aspects: Aspect[] = ["1:1", "16:9", "9:16"];
  const layouts: Shot["layout"][] = ["face", "desk", "story"];
  let lastHead = "";
  return aspects.map((aspect, i) => {
    const rng = mulberry(now + (i + 1) * 7919);
    const headline = pick(rng, heads, lastHead);
    lastHead = headline;
    const pnlLabel = aestheticPnl(now + i * 13);
    const beatA = pick(rng, BEATS);
    const beatB = pick(rng, BEATS, beatA);
    const extra = hint.trim() ? `\n\n${hint.trim()}` : "";
    const caption = `${JOB}\n\n${beatA} ${beatB}\n\nIllustrative mark ${pnlLabel} — for the post, not a live book.${extra}\n\nsolphia.io`;
    return {
      aspect,
      layout: layouts[i],
      headline,
      caption,
      pnlLabel,
      kicker: pick(rng, KICKERS),
    };
  });
}

function parseShots(raw: string): Shot[] | null {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const rows = JSON.parse(match[0]) as Partial<Shot>[];
    if (!Array.isArray(rows) || rows.length < 3) return null;
    const aspects: Aspect[] = ["1:1", "16:9", "9:16"];
    const layouts: Shot["layout"][] = ["face", "desk", "story"];
    return aspects.map((aspect, i) => {
      const row = rows[i] || {};
      return {
        aspect,
        layout: layouts[i],
        headline: String(row.headline || HEADLINES[i]).slice(0, 72),
        caption: String(row.caption || localPack()[i].caption).slice(0, 900),
        pnlLabel: String(row.pnlLabel || aestheticPnl(Date.now() + i)).slice(0, 40),
        kicker: String(row.kicker || "solphia.io").slice(0, 48),
      };
    });
  } catch {
    return null;
  }
}

async function grokPack(hint: string): Promise<Shot[] | null> {
  if (!XAI_API_KEY) return null;
  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${XAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are Solphia's in-house content bot. You only write social posts for solphia.io.
She is a non-custodial Solana bot. She holds SOL, USDC, official SPYx, QQQx, and GLDx. Spot only. Phantom only. No memecoins, copy, sniper, or leverage.
Return ONLY a JSON array of 3 objects with keys: headline, caption, pnlLabel, kicker.
PnL is aesthetic (like +1.4% · +$42 USDC), labeled as not a live book.
Captions must include solphia.io and a one-line explanation of what she does.
Keep headlines under 8 words. No hashtags dump. No seed/keys.`,
        },
        {
          role: "user",
          content: hint.trim() ? `Write today's 3 posts. Angle: ${hint.trim()}` : "Write today's 3 posts: square, widescreen, story.",
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content || "";
  return parseShots(text);
}

export async function writePack(opts?: { hint?: string; now?: number }): Promise<Shot[]> {
  const now = opts?.now ?? Date.now();
  const hint = opts?.hint || "";
  try {
    const grok = await grokPack(hint);
    if (grok) return grok;
  } catch {
    /* local always works */
  }
  return localPack(now, hint);
}

export function packNote(shots: Shot[]) {
  return `Wrote ${shots.length}: ${shots.map((s) => `${s.aspect} “${s.headline}”`).join(" · ")}`;
}
