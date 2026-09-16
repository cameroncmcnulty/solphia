"use client";

const MOVE: Record<string, string> = {
  "🚀": "sticker-rocket",
  "🔥": "sticker-fire",
  "💎": "sticker-gem",
  "🐸": "sticker-hop",
  "👑": "sticker-crown",
  "🪩": "sticker-disco",
  "🎉": "sticker-party",
  "💸": "sticker-cash",
  "🧠": "sticker-brain",
  "🫡": "sticker-salute",
  "👀": "sticker-eyes",
  "❤️": "sticker-heart",
  "😂": "sticker-laugh",
  "👍": "sticker-up",
};

export function BurstSticker({ emoji, className = "" }: { emoji: string; className?: string }) {
  return (
    <span className={`inline-block origin-center ${MOVE[emoji] || "sticker-pop"} ${className}`} aria-hidden={false}>
      {emoji}
    </span>
  );
}
