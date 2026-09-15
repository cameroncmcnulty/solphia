export const PUZZLE_W = 520;
export const PUZZLE_H = 280;
export const PIECE = 72;
export const KNOB = 11;
export const PIECE_BOX = PIECE + KNOB;
export const PUZZLE_TOL = 20;
export const HUMAN_KEY = "solphia_human";

export type PuzzleChallenge = {
  seed: string;
  targetX: number;
  targetY: number;
};

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function makePuzzle(seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`): PuzzleChallenge {
  const n = rng(seed);
  const pad = 24;
  const targetX = Math.round(pad + n() * (PUZZLE_W - PIECE_BOX - pad * 2));
  const targetY = Math.round(36 + n() * (PUZZLE_H - PIECE - 56));
  return { seed, targetX, targetY };
}

export function puzzleHit(x: number, targetX: number, tol = PUZZLE_TOL): boolean {
  return Math.abs(x - targetX) <= tol;
}

export function clampSlide(x: number): number {
  return Math.max(0, Math.min(PUZZLE_W - PIECE_BOX, x));
}

export function humanVerified(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(HUMAN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHuman(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HUMAN_KEY, "1");
  } catch {
    /* private mode */
  }
}
