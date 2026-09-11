import type { PaperFill, PairTape } from "../types";

/** Hard caps so trader shards and the activity feed do not grow without bound. */
export const BOOK_TAPE_MAX = 40;
export const BOOK_FILLS_MAX = 40;
export const BOOK_CURVE_MAX = 96;

/** Keep real clips. Drop stacked hold/skip rows — only the latest quiet status stays. */
export function compactTape(tape: PairTape[] | undefined): PairTape[] {
  const rows = Array.isArray(tape) ? tape : [];
  const kept: PairTape[] = [];
  let quiet: PairTape | null = null;
  for (const row of rows) {
    const q = row.action === "hold" || row.action === "skip";
    if (q) {
      quiet = row;
      continue;
    }
    kept.push(row);
  }
  if (quiet) kept.push(quiet);
  return kept.length > BOOK_TAPE_MAX ? kept.slice(-BOOK_TAPE_MAX) : kept;
}

export function pruneBookLogs<T extends { tape?: PairTape[]; fills?: PaperFill[]; curve?: { t: number; equity: number }[] }>(book: T): T {
  book.tape = compactTape(book.tape);
  if (Array.isArray(book.fills) && book.fills.length > BOOK_FILLS_MAX) book.fills = book.fills.slice(-BOOK_FILLS_MAX);
  if (Array.isArray(book.curve) && book.curve.length > BOOK_CURVE_MAX) book.curve = book.curve.slice(-BOOK_CURVE_MAX);
  return book;
}
