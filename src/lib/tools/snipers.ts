import type { LaunchFill } from "../launch/engine";

export type SniperStats = {
  buys: number;
  sells: number;
  volumeSol: number;
  snipers: number;
  curveSol: number;
};

export function emptySnipers(): SniperStats {
  return { buys: 0, sells: 0, volumeSol: 0, snipers: 0, curveSol: 0 };
}

export function sniperStats(
  coin: { creator?: string; fills?: LaunchFill[] } | null | undefined,
  curveSol = 0,
): SniperStats {
  const creator = (coin?.creator || "").trim();
  const fills = Array.isArray(coin?.fills) ? coin!.fills! : [];
  const snipes = fills.filter((f) => f.owner && f.owner !== creator);
  const wallets = new Set(snipes.map((f) => f.owner));
  return {
    buys: snipes.filter((f) => f.side === "buy").length,
    sells: snipes.filter((f) => f.side === "sell").length,
    volumeSol: Math.round(snipes.reduce((s, f) => s + (Number(f.sol) || 0), 0) * 1e9) / 1e9,
    snipers: wallets.size,
    curveSol: Number(curveSol) || 0,
  };
}
