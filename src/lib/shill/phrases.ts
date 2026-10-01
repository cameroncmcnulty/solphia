export const PHRASE_WHO = [
  "this", "that", "the tape", "the chart", "the book", "the open", "the wick", "the range",
  "liquidity", "volume", "this print", "that dump", "the bid", "the ask", "this candle",
  "the reclaim", "the flush", "this setup", "that bounce", "the trend", "this scalp",
  "the higher low", "that fakeout", "the grind", "this tape", "momentum", "the float",
  "this name", "that chart", "the entry", "the exit", "flow", "the tape here",
  "this move", "that wick", "the reclaim", "price", "this level", "that zone",
];

export const PHRASE_VERB = [
  "looks", "is", "feels", "stays", "keeps", "prints", "holds", "fades", "rips", "chops",
  "cooks", "sits", "drifts", "snaps", "coils", "leaks", "grinds", "washes", "absorbs", "rejects",
];

export const PHRASE_ADJ = [
  "heavy", "clean", "thin", "cooked", "quiet", "loud", "late", "early", "tight", "wide",
  "disgusting", "perfect", "mid", "soft", "sticky", "fast", "slow", "gross", "crisp", "messy",
  "bullish", "heavy af", "so thin", "too clean", "so late", "so early", "dead", "alive",
  "a trap", "the one", "ngmi", "free", "paid", "nutted", "finished", "not done", "so obvious",
  "sleeping", "waking up", "on a leash", "offside", "in play", "out of gas", "loaded", "dry",
];

export const PHRASE_GREET = [
  "gm", "gn", "gm gm", "yo", "hey", "what's good", "we up", "we here", "back", "gm ser",
  "gn ser", "morning", "gm chat", "yo yo", "hey hey", "another day", "gm fr", "gn gn",
  "what's the tape", "we in", "still here", "gm everyone", "hey chat", "yo chat",
];

export const PHRASE_REACT = [
  "lmao", "lol", "true", "facts", "nah", "same", "cooked", "I'm out", "I'm in", "send it",
  "wait", "hold on", "not yet", "too early", "too late", "ngmi", "wagmi", "down bad",
  "up only", "paper", "that's crazy", "no shot", "I see it", "I don't", "fair", "mid",
  "clean", "gross", "what", "huh", "ok", "sure", "bet", "say less", "noted", "wild",
  "insane", "quiet", "loud in here", "chat is chat", "tape is tape", "size is size",
  "nfa", "imo", "fr", "ngl", "on god", "seriously", "again", "here we go", "classic",
  "we've seen this", "not this again", "ok ok", "alright", "hmm", "maybe", "doubt",
  "possible", "unlikely", "I'm watching", "still watching", "not fading", "not chasing",
];

export const PHRASE_ASK = [
  "anyone in this", "thoughts", "you seeing this", "wen", "you still in", "entry?",
  "we holding", "we fading", "what's the level", "volume real?", "this or nothing",
  "who got size", "you in", "still cooking?", "we back?", "that's the reclaim?",
  "you taking it", "hold or fold", "we adding", "anyone fading",
];

export const PHRASE_TAIL = ["", " nfa", " imo", " ser", " lmao", " fr", " tho", " ngl", " idk", " tbh"];

export const PHRASE_REPLY_A = [
  "true", "nah", "same", "facts", "I see it", "not me", "you're early", "you're late",
  "that's the one", "that's a trap", "ok", "lol ok", "fair", "maybe", "doubt it",
  "say more", "proof?", "I faded that", "I'm with it", "not fading", "wait for it",
  "too clean", "too obvious", "give it time", "already in", "already out", "watching",
  "chart agrees", "tape agrees", "volume doesn't", "liquidity says no", "bid is there",
  "ask is heavy", "that's cope", "that's real", "we see it", "chat sees it",
];

export const PHRASE_REPLY_B = [
  "", " tho", " fr", " ngl", " imo", " ser", " lmao", " nfa", " for real", " idk",
  " on this", " on the tape", " at this level", " if it holds", " if it breaks",
];

export type HouseChatCtx = {
  lastText?: string;
  lastId?: string;
  lastOwner?: string;
  lastHasToken?: boolean;
  lastSymbol?: string;
};

export function phraseCardinality(): number {
  return (
    PHRASE_WHO.length * PHRASE_VERB.length * PHRASE_ADJ.length * PHRASE_TAIL.length +
    PHRASE_GREET.length +
    PHRASE_REACT.length +
    PHRASE_ASK.length +
    PHRASE_REPLY_A.length * PHRASE_REPLY_B.length
  );
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function marketLine(rng: () => number): string {
  return `${pick(PHRASE_WHO, rng)} ${pick(PHRASE_VERB, rng)} ${pick(PHRASE_ADJ, rng)}${pick(PHRASE_TAIL, rng)}`.replace(/\s+/g, " ").trim();
}

function replyLine(rng: () => number, ctx: HouseChatCtx): string {
  if (ctx.lastHasToken && ctx.lastSymbol && rng() < 0.45) {
    const s = ctx.lastSymbol.replace(/^\$+/, "");
    const hits = [
      `that ${s} print`,
      `${s} stays`,
      `watching ${s}`,
      `${s} is the one`,
      `not fading ${s}`,
      `${s} looks heavy`,
      `still on ${s}`,
      `${s} chart`,
    ];
    return pick(hits, rng);
  }
  const last = (ctx.lastText || "").toLowerCase();
  if (/\b(gm|morning)\b/.test(last)) return pick(["gm", "gm gm", "gm ser", "morning", "gm chat"], rng);
  if (/\bgn\b/.test(last)) return pick(["gn", "gn gn", "gn ser", "later"], rng);
  if (/\?|anyone|thoughts|wen|you seeing/.test(last)) {
    return pick(["maybe", "watching", "not yet", "I see it", "possible", "doubt", "too early", "too late"], rng);
  }
  return `${pick(PHRASE_REPLY_A, rng)}${pick(PHRASE_REPLY_B, rng)}`.trim();
}

export function composeHouseChat(
  rng: () => number,
  ctx: HouseChatCtx = {},
  actorPk?: string,
): { text: string; replyTo?: string } {
  const canReply = Boolean(ctx.lastId && ctx.lastOwner && ctx.lastOwner !== actorPk);
  const last = (ctx.lastText || "").toLowerCase();
  let replyP = 0.2;
  if (canReply && ctx.lastHasToken) replyP = 0.38;
  if (canReply && /\?|anyone|thoughts|wen/.test(last)) replyP = 0.55;
  if (canReply && /^(gm|gn|yo|hey|morning)\b/.test(last.trim())) replyP = 0.42;
  if (canReply && rng() < replyP) {
    return { text: replyLine(rng, ctx), replyTo: ctx.lastId };
  }
  const roll = rng();
  if (roll < 0.14) return { text: pick(PHRASE_GREET, rng) };
  if (roll < 0.32) return { text: pick(PHRASE_REACT, rng) };
  if (roll < 0.42) return { text: pick(PHRASE_ASK, rng) };
  return { text: marketLine(rng) };
}
