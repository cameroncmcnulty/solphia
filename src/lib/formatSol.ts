/** SOL display that never hides dust as "0". 1% of a few dollars is ~1e-4 SOL. */
export function formatSol(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x) || !(x > 0)) return "0";
  if (x >= 100) return x.toFixed(2);
  if (x >= 1) return trimZeros(x.toFixed(4));
  if (x >= 0.01) return trimZeros(x.toFixed(6));
  return trimZeros(x.toFixed(9));
}

export function formatSolUsd(sol: number, solUsd: number): string {
  if (!(solUsd > 0) || !(sol > 0)) return "";
  const usd = sol * solUsd;
  if (usd >= 0.01) return `$${usd.toFixed(2)}`;
  if (usd >= 0.0001) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(6)}`;
}

function trimZeros(s: string) {
  return s.replace(/0+$/, "").replace(/\.$/, "") || "0";
}
