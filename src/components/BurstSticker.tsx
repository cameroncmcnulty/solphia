"use client";

const MOVE: Record<string, string> = {
  "🚀": "tg-rocket",
  "🔥": "tg-fire",
  "💎": "tg-gem",
  "🐸": "tg-hop",
  "👑": "tg-crown",
  "🪩": "tg-disco",
  "🎉": "tg-party",
  "💸": "tg-cash",
  "🧠": "tg-brain",
  "🫡": "tg-salute",
  "👀": "tg-eyes",
  "❤️": "tg-heart",
  "😂": "tg-laugh",
  "👍": "tg-up",
};

function Bits({ n, cls }: { n: number; cls: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={cls} style={{ ["--i" as string]: String(i) }} />
      ))}
    </>
  );
}

export function BurstSticker({ emoji, size = 108 }: { emoji: string; size?: number }) {
  const kind = MOVE[emoji] || "tg-pop";
  return (
    <span className={`tg-stage ${kind}`} style={{ width: size, height: size, fontSize: size }} role="img" aria-label={emoji}>
      {kind === "tg-rocket" && <Bits n={6} cls="tg-bit tg-bit-flame" />}
      {kind === "tg-fire" && <Bits n={7} cls="tg-bit tg-bit-ember" />}
      {kind === "tg-gem" && <Bits n={8} cls="tg-bit tg-bit-spark" />}
      {kind === "tg-party" && <Bits n={10} cls="tg-bit tg-bit-confetti" />}
      {kind === "tg-cash" && <Bits n={6} cls="tg-bit tg-bit-bill" />}
      {kind === "tg-heart" && <Bits n={5} cls="tg-bit tg-bit-miniheart" />}
      {kind === "tg-disco" && <span className="tg-rays" />}
      {kind === "tg-crown" && <Bits n={6} cls="tg-bit tg-bit-gold" />}
      {kind === "tg-up" && <Bits n={6} cls="tg-bit tg-bit-burst" />}
      <span className="tg-face">{emoji}</span>
    </span>
  );
}
